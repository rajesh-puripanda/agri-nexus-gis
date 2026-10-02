"use strict";

// ============================================================
// AgriNexus GIS
//
// Raster Alignment Contract
//
// Responsibility:
//   Define the structural contract for an explicitly aligned
//   raster grid consumed by downstream raster processing.
//
// This contract does NOT:
//   - read raster files
//   - resample pixels
//   - reproject coordinates
//   - calculate indices
//   - classify pixels
//   - modify scientific values
// ============================================================

const RASTER_ALIGNMENT_CONTRACT_VERSION = "1.0";

const SUPPORTED_RESAMPLING_METHODS = Object.freeze([
    "nearest_neighbor"
]);

const SUPPORTED_ALIGNMENT_MODES = Object.freeze([
    "target_resolution"
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

function assertFiniteNumber(value, fieldName) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new TypeError(
            `${fieldName} must be a finite number.`
        );
    }
}

function validateRasterGrid(grid) {
    if (!isObject(grid)) {
        throw new TypeError(
            "Raster alignment grid must be an object."
        );
    }

    if (!isPositiveInteger(grid.width)) {
        throw new Error(
            "Raster alignment grid width must be a positive integer."
        );
    }

    if (!isPositiveInteger(grid.height)) {
        throw new Error(
            "Raster alignment grid height must be a positive integer."
        );
    }

    if (
        !Array.isArray(grid.origin) ||
        grid.origin.length < 2
    ) {
        throw new Error(
            "Raster alignment grid origin must contain at least x and y."
        );
    }

    if (
        !Array.isArray(grid.resolution) ||
        grid.resolution.length < 2
    ) {
        throw new Error(
            "Raster alignment grid resolution must contain at least x and y."
        );
    }

    assertFiniteNumber(
        grid.origin[0],
        "Raster alignment grid origin x"
    );

    assertFiniteNumber(
        grid.origin[1],
        "Raster alignment grid origin y"
    );

    assertFiniteNumber(
        grid.resolution[0],
        "Raster alignment grid resolution x"
    );

    assertFiniteNumber(
        grid.resolution[1],
        "Raster alignment grid resolution y"
    );

    if (
        grid.resolution[0] === 0 ||
        grid.resolution[1] === 0
    ) {
        throw new Error(
            "Raster alignment grid resolution cannot be zero."
        );
    }

    if (
        !Array.isArray(grid.boundingBox) ||
        grid.boundingBox.length < 4
    ) {
        throw new Error(
            "Raster alignment grid boundingBox must contain four coordinates."
        );
    }

    for (
        const value of grid.boundingBox
    ) {
        assertFiniteNumber(
            value,
            "Raster alignment grid boundingBox value"
        );
    }
}

function validateRasterAlignmentRequest(request) {
    const errors = [];

    if (!isObject(request)) {
        return {
            valid: false,
            errors: [
                "Raster alignment request must be an object."
            ]
        };
    }

    if (
        typeof request.alignmentMode !== "string" ||
        !SUPPORTED_ALIGNMENT_MODES.includes(
            request.alignmentMode
        )
    ) {
        errors.push(
            `alignmentMode must be one of: ${SUPPORTED_ALIGNMENT_MODES.join(", ")}.`
        );
    }

    if (
        typeof request.resamplingMethod !== "string" ||
        !SUPPORTED_RESAMPLING_METHODS.includes(
            request.resamplingMethod
        )
    ) {
        errors.push(
            `resamplingMethod must be one of: ${SUPPORTED_RESAMPLING_METHODS.join(", ")}.`
        );
    }

    if (
        request.targetResolution === undefined ||
        request.targetResolution === null
    ) {
        errors.push(
            "targetResolution is required."
        );
    } else if (
        !Number.isFinite(
            request.targetResolution
        ) ||
        request.targetResolution <= 0
    ) {
        errors.push(
            "targetResolution must be a positive finite number."
        );
    }

    try {
        validateRasterGrid(
            request.targetGrid
        );
    } catch (error) {
        errors.push(
            error.message
        );
    }

    if (
        typeof request.noData !== "number" ||
        !Number.isFinite(request.noData)
    ) {
        errors.push(
            "noData must be a finite number."
        );
    }

    return {
        valid: errors.length === 0,
        contractVersion:
            RASTER_ALIGNMENT_CONTRACT_VERSION,
        errors
    };
}

function createRasterAlignmentContract(
    input
) {
    const validation =
        validateRasterAlignmentRequest(
            input
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid raster alignment contract: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_RASTER_ALIGNMENT_CONTRACT";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return {
        contractVersion:
            RASTER_ALIGNMENT_CONTRACT_VERSION,

        alignmentMode:
            input.alignmentMode,

        resamplingMethod:
            input.resamplingMethod,

        targetResolution:
            input.targetResolution,

        targetGrid: {
            width:
                input.targetGrid.width,

            height:
                input.targetGrid.height,

            origin: [
                ...input.targetGrid.origin
            ],

            resolution: [
                ...input.targetGrid.resolution
            ],

            boundingBox: [
                ...input.targetGrid.boundingBox
            ]
        },

        noData:
            input.noData
    };
}

module.exports = {
    RASTER_ALIGNMENT_CONTRACT_VERSION,
    SUPPORTED_RESAMPLING_METHODS,
    SUPPORTED_ALIGNMENT_MODES,
    validateRasterAlignmentRequest,
    createRasterAlignmentContract
};
