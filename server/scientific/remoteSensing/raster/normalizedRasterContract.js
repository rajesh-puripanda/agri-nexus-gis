"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/normalizedRasterContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.2.1  Normalized Raster Contract
//
// Responsibility:
//   Define and validate the canonical raster representation
//   consumed by downstream remote-sensing processing.
//
// This contract does NOT:
//   - read GeoTIFF files
//   - map sensor-specific bands
//   - calculate remote-sensing indices
//   - classify pixels
//   - calculate statistics
//   - modify pixel values
//
// Canonical spectral roles:
//   Blue, Green, Red, NIR, SWIR
//
// ============================================================

const NORMALIZED_RASTER_CONTRACT_VERSION = "1.0";

const CANONICAL_BAND_NAMES = Object.freeze([
    "Blue",
    "Green",
    "Red",
    "NIR",
    "SWIR"
]);

function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isPositiveInteger(value) {
    return (
        Number.isInteger(value) &&
        value > 0
    );
}

function assertRasterObject(raster) {
    if (!isObject(raster)) {
        throw new TypeError(
            "Normalized raster object is required."
        );
    }
}

function assertDimensions(raster) {
    if (!isPositiveInteger(raster.width)) {
        throw new Error(
            "Normalized raster width must be a positive integer."
        );
    }

    if (!isPositiveInteger(raster.height)) {
        throw new Error(
            "Normalized raster height must be a positive integer."
        );
    }

    const expectedPixelCount =
        raster.width * raster.height;

    if (
        !Number.isSafeInteger(expectedPixelCount) ||
        expectedPixelCount <= 0
    ) {
        throw new Error(
            "Normalized raster dimensions produce an invalid pixel count."
        );
    }

    if (raster.pixelCount !== expectedPixelCount) {
        throw new Error(
            `Normalized raster pixelCount must equal width  height (${expectedPixelCount}).`
        );
    }
}

function assertBandData(bandName, band, pixelCount) {
    if (!isObject(band)) {
        throw new TypeError(
            `Normalized raster band "${bandName}" must be an object.`
        );
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            band,
            "data"
        )
    ) {
        throw new Error(
            `Normalized raster band "${bandName}" must contain data.`
        );
    }

    if (
        !band.data ||
        typeof band.data.length !== "number"
    ) {
        throw new TypeError(
            `Normalized raster band "${bandName}" data must be array-like.`
        );
    }

    if (band.data.length !== pixelCount) {
        throw new Error(
            `Normalized raster band "${bandName}" contains ${band.data.length} pixels; expected ${pixelCount}.`
        );
    }

    if (
        band.sourceBand !== undefined &&
        !isPositiveInteger(band.sourceBand)
    ) {
        throw new Error(
            `Normalized raster band "${bandName}" sourceBand must be a positive integer when provided.`
        );
    }
}

function assertBands(raster) {
    if (!isObject(raster.bands)) {
        throw new TypeError(
            "Normalized raster bands object is required."
        );
    }

    const bandNames = Object.keys(raster.bands);

    if (bandNames.length === 0) {
        throw new Error(
            "Normalized raster must contain at least one band."
        );
    }

    for (const bandName of bandNames) {
        if (
            !CANONICAL_BAND_NAMES.includes(
                bandName
            )
        ) {
            throw new Error(
                `Unsupported normalized raster band "${bandName}".`
            );
        }

        assertBandData(
            bandName,
            raster.bands[bandName],
            raster.pixelCount
        );
    }
}

function assertNoData(raster) {
    if (
        raster.noData !== undefined &&
        raster.noData !== null &&
        !Number.isFinite(raster.noData)
    ) {
        throw new TypeError(
            "Normalized raster NoData value must be finite when provided."
        );
    }
}

function assertSpatialReference(raster) {
    if (
        raster.spatialReference !== undefined &&
        !isObject(raster.spatialReference)
    ) {
        throw new TypeError(
            "Normalized raster spatialReference must be an object when provided."
        );
    }
}

function assertMetadata(raster) {
    if (
        raster.metadata !== undefined &&
        !isObject(raster.metadata)
    ) {
        throw new TypeError(
            "Normalized raster metadata must be an object when provided."
        );
    }
}

function validateNormalizedRaster(raster) {
    assertRasterObject(raster);

    assertDimensions(raster);
    assertBands(raster);
    assertNoData(raster);
    assertSpatialReference(raster);
    assertMetadata(raster);

    return {
        valid: true,
        contractVersion:
            NORMALIZED_RASTER_CONTRACT_VERSION,
        width: raster.width,
        height: raster.height,
        pixelCount: raster.pixelCount,
        bandNames: Object.keys(raster.bands),
        noData: raster.noData
    };
}

function createNormalizedRasterContract({
    width,
    height,
    bands,
    noData,
    spatialReference,
    metadata
}) {
    if (!isPositiveInteger(width)) {
        throw new Error(
            "Normalized raster width must be a positive integer."
        );
    }

    if (!isPositiveInteger(height)) {
        throw new Error(
            "Normalized raster height must be a positive integer."
        );
    }

    const pixelCount = width * height;

    const raster = {
        contractVersion:
            NORMALIZED_RASTER_CONTRACT_VERSION,

        width,
        height,
        pixelCount,

        bands: bands || {},

        noData,

        spatialReference:
            spatialReference || {},

        metadata:
            metadata || {}
    };

    validateNormalizedRaster(raster);

    return raster;
}

module.exports = {
    NORMALIZED_RASTER_CONTRACT_VERSION,
    CANONICAL_BAND_NAMES,
    validateNormalizedRaster,
    createNormalizedRasterContract
};
