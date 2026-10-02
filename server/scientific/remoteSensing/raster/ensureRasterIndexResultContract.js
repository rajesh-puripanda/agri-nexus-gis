"use strict";

// ============================================================
// AgriNexus GIS
//
// Ensure Raster Index Result Contract
//
// Version: 1.0
//
// Application boundary:
//   POST /api/remote-sensing/raster/ensure-index
// ============================================================

const ENSURE_RASTER_INDEX_RESULT_CONTRACT_VERSION =
    "1.0";

function createEnsureRasterIndexResult(
    result
) {
    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        throw new TypeError(
            "Ensure raster index result must be an object."
        );
    }

    return {
        contractVersion:
            ENSURE_RASTER_INDEX_RESULT_CONTRACT_VERSION,

        serviceVersion:
            result.serviceVersion,

        status:
            result.status,

        built:
            result.built,

        indexCode:
            result.indexCode,

        outputPath:
            result.outputPath,

        ...(result.classificationOutputPath
            ? {
                classificationOutputPath:
                    result.classificationOutputPath
            }
            : {})
    };
}

function validateEnsureRasterIndexResult(
    result
) {
    const errors = [];

    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        errors.push(
            "Result must be an object."
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        typeof result.serviceVersion !== "string" ||
        result.serviceVersion.trim().length === 0
    ) {
        errors.push(
            "serviceVersion must be a non-empty string."
        );
    }

    if (
        result.status !== "ready"
    ) {
        errors.push(
            "status must be 'ready'."
        );
    }

    if (
        typeof result.built !== "boolean"
    ) {
        errors.push(
            "built must be a boolean."
        );
    }

    if (
        typeof result.indexCode !== "string" ||
        result.indexCode.trim().length === 0
    ) {
        errors.push(
            "indexCode must be a non-empty string."
        );
    }

    if (
        typeof result.outputPath !== "string" ||
        result.outputPath.trim().length === 0
    ) {
        errors.push(
            "outputPath must be a non-empty string."
        );
    }

    return {
        valid:
            errors.length === 0,
        errors
    };
}

module.exports = {
    ENSURE_RASTER_INDEX_RESULT_CONTRACT_VERSION,
    createEnsureRasterIndexResult,
    validateEnsureRasterIndexResult
};
