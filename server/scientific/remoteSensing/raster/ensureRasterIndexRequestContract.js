"use strict";

// ============================================================
// AgriNexus GIS
//
// Ensure Raster Index Request Contract
//
// Version: 1.0
//
// Application boundary:
//   POST /api/remote-sensing/raster/ensure-index
// ============================================================

const ENSURE_RASTER_INDEX_REQUEST_CONTRACT_VERSION =
    "1.0";

function validateEnsureRasterIndexRequest(
    request
) {
    const errors = [];

    if (
        !request ||
        typeof request !== "object" ||
        Array.isArray(request)
    ) {
        errors.push(
            "Request must be an object."
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        typeof request.indexCode !== "string" ||
        request.indexCode.trim().length === 0
    ) {
        errors.push(
            "indexCode must be a non-empty string."
        );
    }

    return {
        valid:
            errors.length === 0,
        errors
    };
}

module.exports = {
    ENSURE_RASTER_INDEX_REQUEST_CONTRACT_VERSION,
    validateEnsureRasterIndexRequest
};
