"use strict";

// ============================================================
// AgriNexus GIS
//
// Ensure Raster Index REST API Controller
//
// HTTP orchestration only.
// ============================================================

const {
    validateEnsureRasterIndexRequest
} = require(
    "../scientific/remoteSensing/raster/" +
    "ensureRasterIndexRequestContract"
);

const {
    createEnsureRasterIndexResult,
    validateEnsureRasterIndexResult
} = require(
    "../scientific/remoteSensing/raster/" +
    "ensureRasterIndexResultContract"
);

const {
    ensureRasterIndex
} = require(
    "../services/remoteSensing/raster/" +
    "ensureRasterIndexService"
);

async function ensureRasterIndexRequest(
    req,
    res
) {
    try {
        const requestData =
            req.body &&
            typeof req.body === "object" &&
            !Array.isArray(req.body)
                ? req.body
                : {};

        const validation =
            validateEnsureRasterIndexRequest(
                requestData
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_ENSURE_RASTER_INDEX_REQUEST",
                message:
                    "Invalid ensure raster index request.",
                errors:
                    validation.errors
            });
        }

        const serviceResult =
            await ensureRasterIndex(
                requestData
            );

        const result =
            createEnsureRasterIndexResult(
                serviceResult
            );

        const resultValidation =
            validateEnsureRasterIndexResult(
                result
            );

        if (!resultValidation.valid) {
            const error = new Error(
                "Ensure raster index returned an invalid result: " +
                resultValidation.errors.join("; ")
            );

            error.statusCode = 500;

            throw error;
        }

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error(
            "Ensure raster index error:",
            error
        );

        const statusCode =
            Number.isInteger(error.statusCode)
                ? error.statusCode
                : error.code ===
                    "PREPARED_SENTINEL2_INPUT_NOT_FOUND"
                    ? 404
                    : 500;

        return res
            .status(statusCode)
            .json({
                success: false,
                code:
                    error.code ||
                    "ENSURE_RASTER_INDEX_ERROR",
                message:
                    error.message ||
                    "Failed to ensure raster index."
            });
    }
}

module.exports = {
    ensureRasterIndexRequest
};
