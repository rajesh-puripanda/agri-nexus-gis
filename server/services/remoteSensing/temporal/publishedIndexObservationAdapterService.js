
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

async function createPublishedIndexObservation({
    sceneDirectory,
    indexCode,
    chunkRows = DEFAULT_CHUNK_ROWS
}) {
    sceneDirectory = requireString(sceneDirectory, "sceneDirectory");
    indexCode = requireString(indexCode, "indexCode").toUpperCase();

    if (!Number.isInteger(chunkRows) || chunkRows < 1) {
        throw new TypeError("chunkRows must be a positive integer.");
    }

    const definition = getIndexDefinition(indexCode);
    if (!definition) {
        throw new Error(`Unregistered index: ${indexCode}`);
    }

    const manifest = await readProductionMetadata(sceneDirectory);
    if (!manifest) {
        throw new Error(`Missing ${METADATA_FILE_NAME} in ${sceneDirectory}`);
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
        throw new Error(`Published continuous raster is unavailable for ${indexCode}.`);
    }

    if (
        product.sceneId !== manifest.observation?.sceneId ||
        !product.acquisitionDate ||
        !manifest.observation?.acquisitionDate
    ) {
        throw new Error("Production manifest observation identity is inconsistent.");
    }

    const rasterPath = path.join(sceneDirectory, rasterName);
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
        const noData = noDataRaw == null ? undefined : Number(noDataRaw);

        if (
            !Number.isSafeInteger(pixelCount) ||
            width < 1 ||
            height < 1 ||
            (noData !== undefined && !Number.isFinite(noData))
        ) {
            throw new Error("Published raster metadata is invalid.");
        }

        let validPixelCount = 0;
        let noDataPixelCount = 0;
        let minimum = Infinity;
        let maximum = -Infinity;
        let sum = 0;
        let outOfRangePixelCount = 0;

        for (let startRow = 0; startRow < height; startRow += chunkRows) {
            const endRow = Math.min(startRow + chunkRows, height);
            const data = await image.readRasters({
                window: [0, startRow, width, endRow],
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
                if (value < minimum) minimum = value;
                if (value > maximum) maximum = value;
                sum += value;

                if (
                    value < definition.validRange.min ||
                    value > definition.validRange.max
                ) {
                    outOfRangePixelCount++;
                }
            }
        }

        if (validPixelCount + noDataPixelCount !== pixelCount) {
            throw new Error("Raster pixel accounting did not reconcile.");
        }

        if (validPixelCount === 0) {
            throw new Error("Published raster contains no valid pixels.");
        }

        const acquisitionDate = String(
            product.acquisitionDate || manifest.observation.acquisitionDate
        ).slice(0, 10);

        const sceneId = manifest.observation.sceneId;

        return createTemporalIndexObservation({
            contractVersion: "1.0",
            observation: {
                observationDate: acquisitionDate,
                acquisitionDate,
                sensor: "Sentinel-2",
                sceneId,
                indexCode
            },
            raster: {
                rasterId: `${sceneId}_${indexCode}`,
                width,
                height,
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
                origin,
                resolution,
                boundingBox,
                projectedCrsCode: geoKeys.ProjectedCSTypeGeoKey ?? null,
                rasterType: geoKeys.GTRasterTypeGeoKey ?? null
            },
            processingContext: {
                adapter: "publishedIndexObservationAdapterService",
                adapterVersion: SERVICE_VERSION,
                workflowVersion: product.workflowVersion,
                source: "published_continuous_index_raster",
                rasterFile: rasterName,
                productionManifest: METADATA_FILE_NAME,
                outOfRangePixelCount
            }
        });
    } finally {
        await tiff.close();
    }
}

module.exports = {
    PUBLISHED_INDEX_OBSERVATION_ADAPTER_SERVICE_VERSION: SERVICE_VERSION,
    createPublishedIndexObservation
};
