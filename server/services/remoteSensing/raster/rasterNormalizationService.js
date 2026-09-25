"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterNormalizationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.2.2  Raster Normalization Service
//
// Responsibility:
//   Convert reader-level raster band arrays into the canonical
//   Normalized Raster Contract.
//
// Input:
//   GeoTIFF-reader raster representation:
//
//   {
//       width,
//       height,
//       samplesPerPixel,
//       data: [band1, band2, ...],
//       noData,
//       origin,
//       resolution,
//       boundingBox,
//       geoKeys,
//       metadata
//   }
//
// Explicit band mapping:
//
//   {
//       Blue: 1,
//       Green: 2,
//       Red: 3,
//       NIR: 4,
//       SWIR: 5
//   }
//
// Scientific values are copied without scaling, clamping,
// classification, or transformation.
//
// This service does NOT:
//   - calculate remote-sensing indices
//   - classify pixels
//   - calculate statistics
//   - infer sensor-specific band mappings
//   - modify pixel values
//
// ============================================================

const {
    CANONICAL_BAND_NAMES,
    createNormalizedRasterContract
} = require("../../../scientific/remoteSensing/raster/normalizedRasterContract");

function assertRasterObject(raster) {
    if (
        raster === null ||
        typeof raster !== "object" ||
        Array.isArray(raster)
    ) {
        throw new TypeError(
            "Raster object is required."
        );
    }
}

function assertPositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(
            `${fieldName} must be a positive integer.`
        );
    }
}

function assertRasterDimensions(raster) {
    assertPositiveInteger(
        raster.width,
        "Raster width"
    );

    assertPositiveInteger(
        raster.height,
        "Raster height"
    );

    const pixelCount =
        raster.width * raster.height;

    if (
        !Number.isSafeInteger(pixelCount) ||
        pixelCount <= 0
    ) {
        throw new Error(
            "Raster dimensions produce an invalid pixel count."
        );
    }

    return pixelCount;
}

function assertRasterData(raster) {
    if (!Array.isArray(raster.data)) {
        throw new TypeError(
            "Raster data must be an array of source bands."
        );
    }

    if (raster.data.length === 0) {
        throw new Error(
            "Raster data must contain at least one source band."
        );
    }
}

function assertBandMapping(bandMapping) {
    if (
        bandMapping === null ||
        typeof bandMapping !== "object" ||
        Array.isArray(bandMapping)
    ) {
        throw new TypeError(
            "Band mapping is required."
        );
    }

    const entries =
        Object.entries(bandMapping);

    if (entries.length === 0) {
        throw new Error(
            "Band mapping must contain at least one band."
        );
    }

    for (const [bandName, sourceBand] of entries) {
        if (
            !CANONICAL_BAND_NAMES.includes(
                bandName
            )
        ) {
            throw new Error(
                `Unsupported normalized raster band "${bandName}".`
            );
        }

        assertPositiveInteger(
            sourceBand,
            `Band mapping for "${bandName}"`
        );
    }
}

function getSourceBandData(
    raster,
    bandName,
    sourceBand,
    pixelCount
) {
    const sourceIndex =
        sourceBand - 1;

    if (
        sourceIndex < 0 ||
        sourceIndex >= raster.data.length
    ) {
        throw new Error(
            `Source band ${sourceBand} for "${bandName}" is outside the raster band range.`
        );
    }

    const data =
        raster.data[sourceIndex];

    if (
        !data ||
        typeof data.length !== "number"
    ) {
        throw new Error(
            `Source band ${sourceBand} for "${bandName}" does not contain pixel data.`
        );
    }

    if (data.length !== pixelCount) {
        throw new Error(
            `Source band ${sourceBand} for "${bandName}" contains ${data.length} pixels; expected ${pixelCount}.`
        );
    }

    return data;
}

function normalizeSpatialReference(raster) {
    return {
        origin: raster.origin,
        resolution: raster.resolution,
        boundingBox: raster.boundingBox,
        geoKeys:
            raster.geoKeys &&
            typeof raster.geoKeys === "object"
                ? { ...raster.geoKeys }
                : {}
    };
}

function normalizeMetadata(raster) {
    const readerMetadata =
        raster.metadata &&
        typeof raster.metadata === "object"
            ? { ...raster.metadata }
            : {};

    return {
        ...readerMetadata,
        sourceType: "GeoTIFF"
    };
}

function normalizeRaster({
    raster,
    bandMapping,
    noData
}) {
    assertRasterObject(raster);

    const pixelCount =
        assertRasterDimensions(
            raster
        );

    assertRasterData(raster);
    assertBandMapping(
        bandMapping
    );

    const normalizedBands = {};

    for (
        const [
            bandName,
            sourceBand
        ] of Object.entries(bandMapping)
    ) {
        const data =
            getSourceBandData(
                raster,
                bandName,
                sourceBand,
                pixelCount
            );

        normalizedBands[bandName] = {
            data,
            sourceBand
        };
    }

    const normalizedNoData =
        noData !== undefined
            ? noData
            : raster.noData;

    return createNormalizedRasterContract({
        width: raster.width,
        height: raster.height,
        bands: normalizedBands,
        noData: normalizedNoData,
        spatialReference:
            normalizeSpatialReference(
                raster
            ),
        metadata:
            normalizeMetadata(
                raster
            )
    });
}

module.exports = {
    normalizeRaster
};
