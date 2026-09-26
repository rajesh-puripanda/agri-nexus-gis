"use strict";

// ============================================================
// server/controllers/rasterIndexWorkflowController.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.6.3
// Raster Index Workflow REST API Controller
//
// HTTP orchestration only.
//
// Responsibilities:
//   1. Receive raster workflow requests.
//   2. Validate the API request contract.
//   3. Delegate execution to rasterIndexWorkflowService.
//   4. Return standardized HTTP responses.
//   5. Handle unexpected workflow errors.
//
// Scientific raster processing remains in:
//   rasterIndexWorkflowService.js
//
// ============================================================

const {
    validateRasterIndexWorkflowRequest
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexWorkflowRequestContract"
);

const rasterIndexWorkflowService =
    require(
        "../services/remoteSensing/raster/" +
        "rasterIndexWorkflowService"
    );

// ============================================================
// POST RASTER INDEX WORKFLOW
// ============================================================
//
// POST /api/remote-sensing/raster/index-workflow
//
// ============================================================

async function processRasterIndexWorkflowRequest(
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
            validateRasterIndexWorkflowRequest(
                requestData
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_RASTER_INDEX_WORKFLOW_REQUEST",
                message:
                    "Invalid raster index workflow request.",
                errors:
                    validation.errors
            });
        }

        const result =
            await rasterIndexWorkflowService
                .processRasterIndexWorkflow(
                    requestData
                );

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Raster index workflow error:",
            error
        );

        const statusCode =
            Number.isInteger(error.statusCode)
                ? error.statusCode
                : 500;

        return res.status(statusCode).json({
            success: false,
            code:
                "RASTER_INDEX_WORKFLOW_ERROR",
            message:
                error.message ||
                "Failed to process raster index workflow."
        });
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    processRasterIndexWorkflowRequest
};
