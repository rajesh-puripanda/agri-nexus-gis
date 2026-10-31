
"use strict";

const path = require("node:path");
const geotiff = require("geotiff");

const {
    getIndexDefinition
} = require("../../../scientific/remoteSensing/indices/indexRegistry");

const {
    createTemporalIndexObservation
} = require("../../../scientific/remoteSensing/temporal/temporalIndexObservationContract");

const {
    METADATA_FILE_NAME,
    readProductionMetadata
} = require("../catalog/sentinel2IndexProductionMetadataService");

const SERVICE_VERSION = "1.0";
const DEFAULT_CHUNK_ROWS = 32;

function requireString(value, name) {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`${name} must be a non-empty string.`);
    }

    return value.trim();
}

async function resolvePublishedIndexProduct(sceneDirectory, indexCode) {
    sceneDirectory = requireString(sceneDirectory, "sceneDirectory");
    indexCode = requireString(indexCode, "indexCode").toUpperCase();

    const definition = getIndexDefinition(indexCode);

    if (!definition) {
        throw new Error(`Unregistered index: ${indexCode}`);
    }

    const manifest = await readProductionMetadata(sceneDirectory);

    if (!manifest) {
        throw new Error(
            `Missing ${METADATA_FILE_NAME} in ${sceneDirectory}`
        );
    }

    const products = (manifest.products || []).filter(product =>
        String(product.indexCode || "").toUpperCase() === indexCode
    );

    if (products.length !== 1) {
        throw new Error(
            `Expected one ${indexCode} product in production metadata; found ${products.length}.`
        );
    }

    const product = products[0];
    const rasterName = product.outputs?.continuous;

    if (
        !product.availability?.continuous ||
        typeof rasterName !== "string" ||
        !rasterName.trim() ||
        path.basename(rasterName) !== rasterName
    ) {
        throw new Error(
            `Published continuous raster is unavailable for ${indexCode}.`
        );
    }

    if (
        product.sceneId !== manifest.observation?.sceneId ||
        !product.acquisitionDate ||
        !manifest.observation?.acquisitionDate
    ) {
        throw new Error(
            "Production manifest observation identity is inconsistent."
        );
    }

    return {
        sceneDirectory,
        indexCode,
        definition,
        manifest,
        product,
        rasterName,
        rasterPath: path.join(sceneDirectory, rasterName)
    };
}

async function inspectPublishedIndexRaster({
    sceneDirectory,
    indexCode
}) {
    const resolved = await resolvePublishedIndexProduct(
        sceneDirectory,
        indexCode
    );

    const {
        indexCode: normalizedIndexCode,
        manifest,
        product,
        rasterName,
        rasterPath
    } = resolved;

    const tiff = await geotiff.fromFile(rasterPath);

    try {
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();
        const pixelCount = width * height;

        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const boundingBox = image.getBoundingBox();

        const geoKeys = image.getGeoKeys() || {};

        const noDataRaw = image.getGDALNoData();
        const noData = noDataRaw == null
            ? undefined
            : Number(noDataRaw);

        if (
            !Number.isSafeInteger(pixelCount) ||
            width < 1 ||
            height < 1 ||
            (noData !== undefined && !Number.isFinite(noData))
        ) {
            throw new Error("Published raster metadata is invalid.");
        }

        return {
            observation: {
                acquisitionDate: String(
                    product.acquisitionDate
                ).slice(0, 10),
                sceneId: manifest.observation.sceneId,
                indexCode: normalizedIndexCode
            },

            raster: {
                fileName: rasterName,
                width,
                height,
                pixelCount,
                noData
            },

            spatialContext: {
                origin,
                resolution,
                boundingBox,
                projectedCrsCode:
                    geoKeys.ProjectedCSTypeGeoKey ?? null,
                rasterType:
                    geoKeys.GTRasterTypeGeoKey ?? null
            }
        };
    } finally {
        await tiff.close();
    }
}

async function createPublishedIndexObservation({
    sceneDirectory,
    indexCode,
    chunkRows = DEFAULT_CHUNK_ROWS,
    window
}) {
    if (!Number.isInteger(chunkRows) || chunkRows < 1) {
        throw new TypeError(
            "chunkRows must be a positive integer."
        );
    }

    const resolved = await resolvePublishedIndexProduct(
        sceneDirectory,
        indexCode
    );

    const {
        indexCode: normalizedIndexCode,
        definition,
        manifest,
        product,
        rasterName,
        rasterPath
    } = resolved;

    const tiff = await geotiff.fromFile(rasterPath);

    try {
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();
        const fullPixelCount = width * height;

        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const geoKeys = image.getGeoKeys() || {};

        const noDataRaw = image.getGDALNoData();
        const noData = noDataRaw == null
            ? undefined
            : Number(noDataRaw);

        if (
            !Number.isSafeInteger(fullPixelCount) ||
            width < 1 ||
            height < 1 ||
            (noData !== undefined && !Number.isFinite(noData))
        ) {
            throw new Error("Published raster metadata is invalid.");
        }

        // Default to the complete raster when no window is supplied.
        const pixelWindow = window ?? [
            0,
            0,
            width,
            height
        ];

        if (
            !Array.isArray(pixelWindow) ||
            pixelWindow.length !== 4 ||
            !pixelWindow.every(Number.isInteger)
        ) {
            throw new TypeError(
                "window must contain four integer pixel coordinates."
            );
        }

        const [left, top, right, bottom] = pixelWindow;

        if (
            left < 0 ||
            top < 0 ||
            right > width ||
            bottom > height ||
            right <= left ||
            bottom <= top
        ) {
            throw new RangeError(
                "window must be a non-empty window within raster bounds."
            );
        }

        const analysisWidth = right - left;
        const analysisHeight = bottom - top;
        const pixelCount = analysisWidth * analysisHeight;

        // Calculate the geospatial metadata of the selected window.
        const analysisOrigin = [
            origin[0] + left * resolution[0],
            origin[1] + top * resolution[1],
            origin[2] ?? 0
        ];

        const oppositeX =
            analysisOrigin[0] +
            analysisWidth * resolution[0];

        const oppositeY =
            analysisOrigin[1] +
            analysisHeight * resolution[1];

        const analysisBoundingBox = [
            Math.min(analysisOrigin[0], oppositeX),
            Math.min(analysisOrigin[1], oppositeY),
            Math.max(analysisOrigin[0], oppositeX),
            Math.max(analysisOrigin[1], oppositeY)
        ];

        let validPixelCount = 0;
        let noDataPixelCount = 0;
        let minimum = Infinity;
        let maximum = -Infinity;
        let sum = 0;
        let outOfRangePixelCount = 0;

        // Read only the selected pixel window in row chunks.
        for (
            let startRow = top;
            startRow < bottom;
            startRow += chunkRows
        ) {
            const endRow = Math.min(
                startRow + chunkRows,
                bottom
            );

            const data = await image.readRasters({
                window: [
                    left,
                    startRow,
                    right,
                    endRow
                ],
                interleave: true
            });

            for (let i = 0; i < data.length; i++) {
                const value = data[i];

                if (
                    !Number.isFinite(value) ||
                    (noData !== undefined && value === noData)
                ) {
                    noDataPixelCount++;
                    continue;
                }

                validPixelCount++;

                if (value < minimum) {
                    minimum = value;
                }

                if (value > maximum) {
                    maximum = value;
                }

                sum += value;

                if (
                    value < definition.validRange.min ||
                    value > definition.validRange.max
                ) {
                    outOfRangePixelCount++;
                }
            }
        }

        if (
            validPixelCount + noDataPixelCount !== pixelCount
        ) {
            throw new Error(
                "Raster pixel accounting did not reconcile."
            );
        }

        if (validPixelCount === 0) {
            throw new Error(
                "Published raster contains no valid pixels."
            );
        }

        const acquisitionDate = String(
            product.acquisitionDate ||
            manifest.observation.acquisitionDate
        ).slice(0, 10);

        const sceneId = manifest.observation.sceneId;

        return createTemporalIndexObservation({
            contractVersion: "1.0",

            observation: {
                observationDate: acquisitionDate,
                acquisitionDate,
                sensor: "Sentinel-2",
                sceneId,
                indexCode: normalizedIndexCode
            },

            raster: {
                rasterId: `${sceneId}_${normalizedIndexCode}`,
                width: analysisWidth,
                height: analysisHeight,
                pixelCount,
                noData
            },

            index: {
                code: definition.code,
                name: definition.name,
                validRange: definition.validRange
            },

            statistics: {
                validPixelCount,
                noDataPixelCount,
                minimum,
                maximum,
                mean: sum / validPixelCount
            },

            spatialContext: {
                origin: analysisOrigin,
                resolution,
                boundingBox: analysisBoundingBox,
                projectedCrsCode:
                    geoKeys.ProjectedCSTypeGeoKey ?? null,
                rasterType:
                    geoKeys.GTRasterTypeGeoKey ?? null
            },

            processingContext: {
                adapter: "publishedIndexObservationAdapterService",
                adapterVersion: SERVICE_VERSION,
                workflowVersion: product.workflowVersion,
                source: "published_continuous_index_raster",
                rasterFile: rasterName,
                productionManifest: METADATA_FILE_NAME,
                outOfRangePixelCount,
                pixelWindow: [...pixelWindow],
                fullRasterDimensions: {
                    width,
                    height
                }
            }
        });
    } finally {
        await tiff.close();
    }
}

module.exports = {
    PUBLISHED_INDEX_OBSERVATION_ADAPTER_SERVICE_VERSION: SERVICE_VERSION,
    createPublishedIndexObservation,
    inspectPublishedIndexRaster
};
