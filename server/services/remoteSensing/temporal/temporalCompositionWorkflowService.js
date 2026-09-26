"use strict";

// ============================================================
// server/services/remoteSensing/temporal/
// temporalCompositionWorkflowService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.6
// Temporal Composition Workflow Service
//
// Orchestration only.
//
// Coordinates the frozen temporal composition contracts.
//
// This service does NOT:
//   - calculate remote-sensing indices
//   - modify raster values
//   - read or write GeoTIFF files
//   - calculate trends
//   - detect change
//   - perform seasonal analysis
//   - interpolate
//   - reproject or resample
//
// Pipeline:
//
//   Workflow Request Contract
//          
//   Temporal Composition Contract
//          
//   Workflow Result Contract
// ============================================================

const {
    validateTemporalCompositionWorkflowRequest
} = require(
    "../../../scientific/remoteSensing/temporal/" +
    "temporalCompositionWorkflowRequestContract"
);

const {
    createTemporalComposition
} = require(
    "../../../scientific/remoteSensing/temporal/" +
    "temporalCompositionContract"
);

const {
    createTemporalCompositionWorkflowResultContract
} = require(
    "../../../scientific/remoteSensing/temporal/" +
    "temporalCompositionWorkflowResultContract"
);

const TEMPORAL_COMPOSITION_WORKFLOW_SERVICE_VERSION =
    "1.0";

function assertValidWorkflowRequest(request) {
    const validation =
        validateTemporalCompositionWorkflowRequest(
            request
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal composition workflow request: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return validation;
}

async function processTemporalCompositionWorkflow(
    request
) {
    assertValidWorkflowRequest(request);

    const composition =
        createTemporalComposition({
            compositionId:
                request.compositionId,

            indexCode:
                request.indexCode,

            observations:
                request.observations,

            temporalContext:
                request.temporalContext,

            spatialContext:
                request.spatialContext,

            processingContext:
                request.processingContext,

            metadata:
                request.metadata
        });

    return createTemporalCompositionWorkflowResultContract({
        composition
    });
}

module.exports = {
    TEMPORAL_COMPOSITION_WORKFLOW_SERVICE_VERSION,
    processTemporalCompositionWorkflow
};
