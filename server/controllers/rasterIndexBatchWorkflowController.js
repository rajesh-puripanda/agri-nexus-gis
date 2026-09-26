"use strict";

// ============================================================
// server/controllers/rasterIndexBatchWorkflowController.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.4
// Batch Raster Workflow REST API Controller
//
// HTTP orchestration only.
//
// Responsibilities:
//   1. Receive batch raster workflow requests.
//   2. Validate the batch API request contract.
//   3. Delegate execution to rasterIndexBatchWorkflowService.
//   4. Validate the returned batch result contract.
//   5. Return standardized HTTP responses.
//
// Scientific raster processing remains in the underlying
// single-index raster workflow service.
//
// ============================================================

const {
    validateRasterIndexBatchWorkflowRequest
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowRequestContract"
);

const {
    validateRasterIndexBatchWorkflowResult
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowResultContract"
);

const rasterIndexBatchWorkflowService =
    require(
        "../services/remoteSensing/raster/" +
        "rasterIndexBatchWorkflowService"
    );

// ============================================================
// POST BATCH RASTER INDEX WORKFLOW
// ============================================================
//
// POST /api/remote-sensing/raster/index-batch-workflow
//
// ============================================================

async function processRasterIndexBatchWorkflowRequest(
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
            validateRasterIndexBatchWorkflowRequest(
                requestData
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_RASTER_INDEX_BATCH_WORKFLOW_REQUEST",
                message:
                    "Invalid raster index batch workflow request.",
                errors:
                    validation.errors
            });
        }

        const result =
            await rasterIndexBatchWorkflowService
                .processRasterIndexBatchWorkflow(
                    requestData
                );

        const resultValidation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        if (!resultValidation.valid) {
            const error = new Error(
                "Raster index batch workflow returned an invalid result: " +
                resultValidation.errors.join("; ")
            );

            error.statusCode = 500;

            throw error;
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Raster index batch workflow error:",
            error
        );

        const statusCode =
            Number.isInteger(error.statusCode)
                ? error.statusCode
                : 500;

        return res.status(statusCode).json({
            success: false,
            code:
                "RASTER_INDEX_BATCH_WORKFLOW_ERROR",
            message:
                error.message ||
                "Failed to process raster index batch workflow."
        });
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    processRasterIndexBatchWorkflowRequest
};
