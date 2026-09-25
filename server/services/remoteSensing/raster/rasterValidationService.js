"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterValidationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.1  Raster Validation Service
//
// Responsibility:
//   Validate raster structure before scientific processing.
//
// This service does NOT:
//   - calculate remote-sensing indices
//   - classify pixels
//   - calculate statistics
//   - assume a particular satellite sensor
//   - write GeoTIFF output
//
// NoData is treated as a distinct raster value and is never
// silently converted to zero.
//
// ============================================================

function assertRasterObject(raster) {
    if (!raster || typeof raster !== "object") {
        throw new TypeError("Raster object is required.");
    }
}

function assertPositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(
            `${fieldName} must be a positive integer.`
        );
    }
}

function getPixelCount(width, height) {
    const pixelCount = width * height;

    if (!Number.isSafeInteger(pixelCount) || pixelCount <= 0) {
        throw new Error(
            "Raster dimensions produce an invalid pixel count."
        );
    }

    return pixelCount;
}

function assertBandMapping(bandMapping) {
    if (!bandMapping || typeof bandMapping !== "object") {
        throw new TypeError("Band mapping is required.");
    }

    for (const [bandName, sourceBand] of Object.entries(bandMapping)) {
        if (!bandName || bandName.trim() === "") {
            throw new Error("Band mapping contains an empty band name.");
        }

        assertPositiveInteger(
            sourceBand,
            `Band mapping for "${bandName}"`
        );
    }
}

function assertBandData(raster, bandName, pixelCount) {
    if (!raster.bands || typeof raster.bands !== "object") {
        throw new TypeError("Raster bands are required.");
    }

    const band = raster.bands[bandName];

    if (band === undefined || band === null) {
        throw new Error(
            `Required raster band "${bandName}" is missing.`
        );
    }

    const data =
        band &&
        typeof band === "object" &&
        Object.prototype.hasOwnProperty.call(band, "data")
            ? band.data
            : band;

    if (
        !data ||
        typeof data.length !== "number"
    ) {
        throw new Error(
            `Raster band "${bandName}" must contain pixel data.`
        );
    }

    if (data.length !== pixelCount) {
        throw new Error(
            `Raster band "${bandName}" contains ${data.length} pixels; expected ${pixelCount}.`
        );
    }

    return data;
}

function validatePixelValues(data, bandName, noData) {
    for (let index = 0; index < data.length; index += 1) {
        const value = data[index];

        if (value === noData) {
            continue;
        }

        if (!Number.isFinite(value)) {
            throw new Error(
                `Raster band "${bandName}" contains a non-finite pixel value at index ${index}.`
            );
        }
    }
}

function validateRaster({
    raster,
    bandMapping,
    noData
}) {
    assertRasterObject(raster);

    assertPositiveInteger(raster.width, "Raster width");
    assertPositiveInteger(raster.height, "Raster height");

    const pixelCount = getPixelCount(
        raster.width,
        raster.height
    );

    assertBandMapping(bandMapping);

    if (
        noData !== undefined &&
        noData !== null &&
        !Number.isFinite(noData)
    ) {
        throw new TypeError(
            "Raster NoData value must be finite when provided."
        );
    }

    const validatedBands = {};

    for (const [bandName, sourceBand] of Object.entries(bandMapping)) {
        const data = assertBandData(
            raster,
            bandName,
            pixelCount
        );

        validatePixelValues(
            data,
            bandName,
            noData
        );

        validatedBands[bandName] = {
            sourceBand,
            data
        };
    }

    return {
        valid: true,
        width: raster.width,
        height: raster.height,
        pixelCount,
        bands: validatedBands,
        noData:
            noData !== undefined
                ? noData
                : raster.noData
    };
}

module.exports = {
    validateRaster
};
