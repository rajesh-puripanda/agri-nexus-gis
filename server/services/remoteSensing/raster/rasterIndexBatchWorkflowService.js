"use strict";

// ============================================================
// server/services/remoteSensing/raster/rasterIndexBatchWorkflowService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.2
// Batch Raster Workflow Service
//
// Orchestration only.
//
// Coordinates multiple calls to the existing frozen
// single-index raster workflow service.
//
// This service does NOT:
//   - calculate remote-sensing indices
//   - classify raster values
//   - read GeoTIFF files directly
//   - write GeoTIFF files directly
//   - modify scientific definitions or thresholds
//   - perform reprojection/resampling/interpolation
//
// Each requested index is delegated to:
//   processRasterIndexWorkflow()
// ============================================================

const {
    validateRasterIndexBatchWorkflowRequest
} = require(
    "../../../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowRequestContract"
);

const {
    processRasterIndexWorkflow
} = require("./rasterIndexWorkflowService");

const {
    createRasterIndexBatchWorkflowResultContract
} = require(
    "../../../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowResultContract"
);

const BATCH_WORKFLOW_VERSION = "1.0";

function assertValidBatchRequest(request) {
    const validation =
        validateRasterIndexBatchWorkflowRequest(
            request
        );

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid raster index batch workflow request: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_RASTER_INDEX_BATCH_WORKFLOW_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return validation;
}

async function processRasterIndexBatchWorkflow(request) {
    const validation =
        assertValidBatchRequest(request);

    const indexCodes =
        validation.indexCodes;

    const results = [];

    for (
        let batchIndex = 0;
        batchIndex < indexCodes.length;
        batchIndex++
    ) {
        const indexCode =
            indexCodes[batchIndex];

        try {
            const workflowResult =
                await processRasterIndexWorkflow({
                    inputPath:
                        request.inputPath,

                    indexCode,

                    bandMapping:
                        request.bandMapping,

                    noData:
                        request.noData,

                    parameters:
                        request.parameters,

                    processingContext:
                        request.processingContext,

                    spatialContext:
                        request.spatialContext,

                    outputDirectory:
                        request.outputDirectory
                });

            results.push(
                workflowResult
            );
        } catch (error) {
            error.indexCode =
                indexCode;

            error.batchIndex =
                batchIndex;

            throw error;
        }
    }

    return createRasterIndexBatchWorkflowResultContract({
        batchVersion:
            BATCH_WORKFLOW_VERSION,

        input: {
            filePath:
                request.inputPath,

            indexCodes
        },

        results
    });
}

module.exports = {
    BATCH_WORKFLOW_VERSION,
    processRasterIndexBatchWorkflow
};
