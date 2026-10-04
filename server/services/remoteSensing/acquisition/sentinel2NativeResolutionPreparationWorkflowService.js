"use strict";

// ============================================================
// AgriNexus GIS
//
// Sentinel-2 Native-Resolution Preparation Workflow
//
// Responsibility:
//   Acquire requested Sentinel-2 L2A bands, calculate a spatial
//   pixel window from the requested WGS84 bbox, decode only that
//   window from each JP2 asset, apply per-band radiometric
//   preparation, group bands by their authoritative native
//   resolution, validate each native grid, and write one
//   prepared Float32 GeoTIFF per native resolution.
//
// This service does NOT:
//   - calculate spectral indices
//   - classify pixels
//   - reproject
//   - resample
//   - align different native resolutions
//
// Spatial processing boundary:
//
//   WGS84 request bbox
//          |
//          v
//   acquired projected CRS
//          |
//          v
//   projected intersection with asset bounds
//          |
//          v
//   pixel window
//          |
//          v
//   windowed JP2 decode
//          |
//          v
//   radiometric preparation
//          |
//          v
//   native-resolution prepared GeoTIFF
// ============================================================

const path = require("node:path");

const {
    acquireSentinel2Bands: defaultAcquireSentinel2Bands
} = require("./sentinel2AcquisitionService");

const {
    decodeSentinel2Jp2Window:
        defaultDecodeSentinel2Jp2Window
} = require("./sentinel2Jp2WindowDecoderService");

const {
    prepareSentinel2Bands: defaultPrepareSentinel2Bands
} = require("./sentinel2RadiometricPreparationService");

const {
    createSentinel2PreparedRaster
} = require(
    "../../../scientific/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterContract"
);

const {
    writeSentinel2PreparedRaster:
        defaultWriteSentinel2PreparedRaster
} = require("./sentinel2PreparedRasterWriterService");

const {
    getSentinel2BandDefinition
} = require(
    "../../../scientific/remoteSensing/bands/" +
    "sentinel2BandCatalog"
);

const {
    transformWgs84BboxToProjected,
    projectedBboxToPixelWindow
} = require(
    "../../../scientific/remoteSensing/spatial/" +
    "sentinel2SpatialWindow"
);

const SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION =
    "1.1";

const OUTPUT_NODATA = -9999;

function assertPositiveInteger(
    value,
    fieldName
) {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        throw new TypeError(
            `${fieldName} must be a positive integer.`
        );
    }
}

function assertNonEmptyString(
    value,
    fieldName
) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${fieldName} must be a non-empty string.`
        );
    }
}

function spatialReferencesMatch(
    first,
    current
) {
    return (
        JSON.stringify(first) ===
        JSON.stringify(current)
    );
}

function radiometryMatches(
    first,
    current
) {
    return (
        first.scale === current.scale &&
        first.offset === current.offset &&
        first.noData === current.noData &&
        first.sourceDataType ===
            current.sourceDataType
    );
}

function groupBandsByNativeResolution(
    bands
) {
    const groups = {};

    for (const bandName of Object.keys(bands)) {
        const definition =
            getSentinel2BandDefinition(
                bandName
            );

        const resolution =
            definition.nativeResolution;

        if (!groups[resolution]) {
            groups[resolution] = [];
        }

        groups[resolution].push(
            bandName
        );
    }

    return Object.fromEntries(
        Object.entries(groups)
            .sort(
                ([a], [b]) =>
                    Number(a) - Number(b)
            )
    );
}

function validateNativeResolutionGroup(
    bandNames,
    acquiredBands,
    decodedBands
) {
    if (bandNames.length === 0) {
        throw new Error(
            "Native-resolution band group cannot be empty."
        );
    }

    const firstBand =
        bandNames[0];

    const firstAcquired =
        acquiredBands[firstBand];

    const firstDecoded =
        decodedBands[firstBand];

    if (!firstAcquired) {
        throw new Error(
            `Acquired Sentinel-2 band is missing: ${firstBand}`
        );
    }

    if (!firstDecoded) {
        throw new Error(
            `Decoded Sentinel-2 band is missing: ${firstBand}`
        );
    }

    const expectedPixelCount =
        firstDecoded.width *
        firstDecoded.height;

    for (const bandName of bandNames) {
        const acquired =
            acquiredBands[bandName];

        const decoded =
            decodedBands[bandName];

        if (!acquired) {
            throw new Error(
                `Acquired Sentinel-2 band is missing: ${bandName}`
            );
        }

        if (!decoded) {
            throw new Error(
                `Decoded Sentinel-2 band is missing: ${bandName}`
            );
        }

        if (
            decoded.width !==
            firstDecoded.width ||
            decoded.height !==
            firstDecoded.height ||
            decoded.pixelCount !==
            expectedPixelCount
        ) {
            throw new Error(
                `Sentinel-2 ${bandName} does not match the ` +
                `native-resolution dimensions of ${firstBand}.`
            );
        }

        if (
            !spatialReferencesMatch(
                firstAcquired.spatialReference,
                acquired.spatialReference
            )
        ) {
            throw new Error(
                `Sentinel-2 ${bandName} does not match the ` +
                `native-resolution spatial grid of ${firstBand}.`
            );
        }

        if (
            !radiometryMatches(
                firstAcquired.radiometry,
                acquired.radiometry
            )
        ) {
            throw new Error(
                `Sentinel-2 ${bandName} does not match the ` +
                `native-resolution radiometric contract of ${firstBand}.`
            );
        }
    }

    return {
        width:
            firstDecoded.width,

        height:
            firstDecoded.height,

        pixelCount:
            expectedPixelCount,

        spatialReference:
            firstAcquired.spatialReference,

        radiometry:
            firstAcquired.radiometry
    };
}

function normalizeRequestBbox(
    request
) {
    const bbox =
        request
            ?.spatialContext
            ?.bbox;

    if (
        !bbox ||
        typeof bbox !== "object" ||
        Array.isArray(bbox)
    ) {
        throw new TypeError(
            "request.spatialContext.bbox must be an object."
        );
    }

    const {
        west,
        south,
        east,
        north
    } = bbox;

    if (
        !Number.isFinite(west) ||
        !Number.isFinite(south) ||
        !Number.isFinite(east) ||
        !Number.isFinite(north)
    ) {
        throw new TypeError(
            "request.spatialContext.bbox coordinates must be finite numbers."
        );
    }

    if (west >= east) {
        throw new RangeError(
            "request.spatialContext.bbox west must be less than east."
        );
    }

    if (south >= north) {
        throw new RangeError(
            "request.spatialContext.bbox south must be less than north."
        );
    }

    return [
        west,
        south,
        east,
        north
    ];
}

function normalizeProjectedBoundingBox(
    boundingBox
) {
    if (
        !Array.isArray(boundingBox) ||
        boundingBox.length !== 4
    ) {
        throw new Error(
            "Sentinel-2 asset projected bounding box is required."
        );
    }

    const [
        minX,
        minY,
        maxX,
        maxY
    ] = boundingBox;

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
    ) {
        throw new Error(
            "Sentinel-2 asset projected bounding box must contain finite numbers."
        );
    }

    if (
        minX >= maxX ||
        minY >= maxY
    ) {
        throw new Error(
            "Sentinel-2 asset projected bounding box must have positive dimensions."
        );
    }

    return [
        minX,
        minY,
        maxX,
        maxY
    ];
}

function intersectProjectedBboxes(
    requested,
    available
) {
    const [
        requestedMinX,
        requestedMinY,
        requestedMaxX,
        requestedMaxY
    ] = requested;

    const [
        availableMinX,
        availableMinY,
        availableMaxX,
        availableMaxY
    ] = available;

    const minX =
        Math.max(
            requestedMinX,
            availableMinX
        );

    const minY =
        Math.max(
            requestedMinY,
            availableMinY
        );

    const maxX =
        Math.min(
            requestedMaxX,
            availableMaxX
        );

    const maxY =
        Math.min(
            requestedMaxY,
            availableMaxY
        );

    if (
        minX >= maxX ||
        minY >= maxY
    ) {
        throw new RangeError(
            "Requested Sentinel-2 spatial bbox does not intersect the acquired raster."
        );
    }

    return [
        minX,
        minY,
        maxX,
        maxY
    ];
}

function buildWindowSpatialReference(
    spatialReference,
    window
) {
    const origin =
        spatialReference.origin;

    const resolution =
        spatialReference.resolution;

    const windowOriginX =
        origin[0] +
        window.x0 *
        resolution[0];

    const windowOriginY =
        origin[1] +
        window.y0 *
        resolution[1];

    const windowMaxX =
        windowOriginX +
        window.width *
        resolution[0];

    const windowMaxY =
        windowOriginY +
        window.height *
        resolution[1];

    return {
        origin: [
            windowOriginX,
            windowOriginY,
            0
        ],

        resolution: [
            resolution[0],
            resolution[1],
            0
        ],

        boundingBox: [
            Math.min(
                windowOriginX,
                windowMaxX
            ),

            Math.min(
                windowOriginY,
                windowMaxY
            ),

            Math.max(
                windowOriginX,
                windowMaxX
            ),

            Math.max(
                windowOriginY,
                windowMaxY
            )
        ],

        geoKeys: {
            ...spatialReference.geoKeys
        }
    };
}

function buildBandDecodeWindow({
    requestBbox,
    spatialReference
}) {
    if (
        !spatialReference ||
        typeof spatialReference !== "object"
    ) {
        throw new Error(
            "Sentinel-2 band spatial reference is required."
        );
    }

    const epsg =
        spatialReference
            ?.geoKeys
            ?.ProjectedCSTypeGeoKey;

    if (
        !Number.isInteger(epsg) ||
        epsg <= 0
    ) {
        throw new Error(
            "Sentinel-2 band projected EPSG code is required."
        );
    }

    const requestedProjectedBbox =
        transformWgs84BboxToProjected(
            requestBbox,
            epsg
        );

    const assetProjectedBbox =
        normalizeProjectedBoundingBox(
            spatialReference.boundingBox
        );

    const intersectedProjectedBbox =
        intersectProjectedBboxes(
            requestedProjectedBbox,
            assetProjectedBbox
        );

    const window =
        projectedBboxToPixelWindow(
            intersectedProjectedBbox,
            spatialReference
        );

    return {
        version: "1.0",

        sourceCrs:
            "EPSG:4326",

        targetCrs:
            `EPSG:${epsg}`,

        geographicBbox:
            requestBbox.slice(),

        requestedProjectedBbox,

        assetProjectedBbox,

        intersectedProjectedBbox,

        window
    };
}

async function prepareSentinel2NativeResolutionRasters({
    request,
    outputDirectory,
    bandNames,
    outputNoData = OUTPUT_NODATA,

    acquisitionImpl =
        defaultAcquireSentinel2Bands,

    decodeImpl =
        defaultDecodeSentinel2Jp2Window,

    prepareImpl =
        defaultPrepareSentinel2Bands,

    writeImpl =
        defaultWriteSentinel2PreparedRaster
} = {}) {
    if (
        !request ||
        typeof request !== "object"
    ) {
        throw new TypeError(
            "Sentinel-2 acquisition request must be an object."
        );
    }

    assertNonEmptyString(
        outputDirectory,
        "outputDirectory"
    );

    if (
        !Array.isArray(bandNames) ||
        bandNames.length === 0
    ) {
        throw new TypeError(
            "bandNames must be a non-empty array."
        );
    }

    const requestBbox =
        normalizeRequestBbox(
            request
        );

    const acquisition =
        await acquisitionImpl({
            request,
            outputDirectory,
            bandNames
        });

    if (
        !acquisition ||
        !acquisition.bands ||
        typeof acquisition.bands !== "object"
    ) {
        throw new Error(
            "Sentinel-2 acquisition did not return band assets."
        );
    }

    const groups =
        groupBandsByNativeResolution(
            acquisition.bands
        );

    const outputs = {};

    for (
        const [
            resolution,
            groupBandNames
        ] of Object.entries(groups)
    ) {
        const decodedBands = {};
        const decodeWindows = {};

        for (
            const bandName of groupBandNames
        ) {
            const band =
                acquisition.bands[bandName];

            if (!band) {
                throw new Error(
                    `Sentinel-2 acquisition result is missing band: ${bandName}`
                );
            }

            const decodeWindow =
                buildBandDecodeWindow({
                    requestBbox,
                    spatialReference:
                        band.spatialReference
                });

            decodeWindows[bandName] =
                decodeWindow;

            const decoded =
                await decodeImpl({
                    inputPath:
                        band.path,

                    x0:
                        decodeWindow.window.x0,

                    y0:
                        decodeWindow.window.y0,

                    x1:
                        decodeWindow.window.x1,

                    y1:
                        decodeWindow.window.y1
                });

                        if (
                !decoded ||
                !decoded.window ||
                !Number.isInteger(
                    decoded.window.width
                ) ||
                !Number.isInteger(
                    decoded.window.height
                ) ||
                !decoded.samples
            ) {
                throw new Error(
                    `Sentinel-2 ${bandName} window decoder returned an invalid result.`
                );
            }

            decoded.width =
                decoded.window.width;

            decoded.height =
                decoded.window.height;

            decoded.pixelCount =
                decoded.width *
                decoded.height;

            decodedBands[bandName] =
                decoded;
        }

        const group =
            validateNativeResolutionGroup(
                groupBandNames,
                acquisition.bands,
                decodedBands
            );

        const windowSpatialReference =
            buildWindowSpatialReference(
                group.spatialReference,
                decodeWindows[
                    groupBandNames[0]
                ].window
            );

        const preparationInput = {};

        for (
            const bandName of groupBandNames
        ) {
            const acquired =
                acquisition.bands[bandName];

            preparationInput[bandName] = {
                samples:
                    decodedBands[bandName].samples,

                scale:
                    acquired.radiometry.scale,

                offset:
                    acquired.radiometry.offset,

                noData:
                    acquired.radiometry.noData
            };
        }

        const preparedBands =
            prepareImpl({
                bands:
                    preparationInput,

                outputNoData
            });

        const preparedRaster =
            createSentinel2PreparedRaster({
                contractVersion: "1.0",

                source: {
                    id: "sentinel2",

                    provider:
                        acquisition.sourceProvider ||
                        "copernicus-data-space"
                },

                sceneId:
                    acquisition.sceneId,

                acquisitionDate:
                    acquisition.acquisitionDate,

                raster: {
                    width:
                        group.width,

                    height:
                        group.height,

                    pixelCount:
                        group.pixelCount,

                    bands:
                        preparedBands,

                    spatialReference:
                        windowSpatialReference,

                    noData:
                        outputNoData,

                    metadata: {
                        sourceType:
                            "Sentinel-2 L2A",

                        preparation:
                            "radiometric",

                        nativeResolution:
                            Number(resolution),

                        bandOrder:
                            groupBandNames,

                        sourceAssets:
                            Object.fromEntries(
                                groupBandNames.map(
                                    (bandName) => [
                                        bandName,
                                        acquisition
                                            .bands[
                                                bandName
                                            ]
                                            .assetKey
                                    ]
                                )
                            ),

                        decoderDataTypes:
                            Object.fromEntries(
                                groupBandNames.map(
                                    (bandName) => [
                                        bandName,
                                        decodedBands[
                                            bandName
                                        ].dataType
                                    ]
                                )
                            ),

                        decodeWindows,

                        requestedSpatialBbox:
                            requestBbox,

                        radiometryByBand:
                            Object.fromEntries(
                                groupBandNames.map(
                                    (bandName) => [
                                        bandName,
                                        acquisition
                                            .bands[
                                                bandName
                                            ]
                                            .radiometry
                                    ]
                                )
                            ),

                        workflow:
                            SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION
                    }
                },

                radiometry: {
                    sourceDataType:
                        group.radiometry
                            .sourceDataType,

                    scale:
                        group.radiometry.scale,

                    offset:
                        group.radiometry.offset,

                    noData:
                        group.radiometry.noData,

                    formula:
                        "physicalValue = DN * scale + offset"
                }
            });

        const outputFileName =
            `${acquisition.sceneId}` +
            `_${resolution}m_prepared.tif`;

        const outputPath =
            path.join(
                outputDirectory,
                outputFileName
            );

        console.log(
            "=== PREPARED RASTER SPATIAL REFERENCE ==="
        );

        console.log(
            JSON.stringify(
                preparedRaster
                    .raster
                    .spatialReference,
                null,
                2
            )
        );

        console.log(
            "=== SENTINEL-2 WINDOW ==="
        );

        console.log(
            JSON.stringify(
                decodeWindows[
                    groupBandNames[0]
                ],
                null,
                2
            )
        );

        const written =
            await writeImpl({
                preparedRaster,
                outputPath
            });

        outputs[resolution] = {
            resolution:
                Number(resolution),

            bands:
                groupBandNames,

            outputPath:
                written.outputPath,

            width:
                group.width,

            height:
                group.height
        };
    }

    return {
        workflowVersion:
            SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION,

        sceneId:
            acquisition.sceneId,

        acquisitionDate:
            acquisition.acquisitionDate,

        outputDirectory,

        outputs
    };
}

module.exports = {
    SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION,
    groupBandsByNativeResolution,
    validateNativeResolutionGroup,
    prepareSentinel2NativeResolutionRasters,
    normalizeRequestBbox,
    buildBandDecodeWindow,
    buildWindowSpatialReference
};
