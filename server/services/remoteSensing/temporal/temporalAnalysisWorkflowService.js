"use strict";

// ============================================================
// server/services/remoteSensing/temporal/
// temporalAnalysisWorkflowService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.17
// Temporal Analysis Workflow Service
//
// Orchestration only.
//
// Currently supports:
//   - CHANGE
//
// Future analysis types such as TREND, STATISTICS and SEASONAL
// must be added explicitly in their respective phases.
//
// This service does NOT:
//   - perform scientific calculations itself
//   - modify TemporalComposition
//   - reorder observations
//   - read or write GeoTIFF files
//   - access databases
//   - perform HTTP/API work
//
// Pipeline:
//
//   Temporal Analysis Workflow Request
//              
//              
//   validateTemporalAnalysisWorkflowRequest()
//              
//              
//   analysisType dispatch
//              
//               CHANGE
//                    
//                    
//             calculateTemporalChange()
//                    
//                    
//   Temporal Analysis Workflow Result
//
// ============================================================

const {
    validateTemporalAnalysisWorkflowRequest
} = require(
    "../../../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowRequestContract"
);

const {
    calculateTemporalChange
} = require("../temporalChangeCalculationService");

const {
    createTemporalAnalysisWorkflowResultContract
} = require(
    "../../../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowResultContract"
);

const TEMPORAL_ANALYSIS_WORKFLOW_SERVICE_VERSION =
    "1.0";

function assertValidWorkflowRequest(request) {
    const validation =
        validateTemporalAnalysisWorkflowRequest(
            request
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal analysis workflow request: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return validation;
}

function assertSupportedAnalysisType(analysisType) {
    if (analysisType === "CHANGE") {
        return;
    }

    const error =
        new Error(
            `Unsupported temporal analysis type: ${analysisType}`
        );

    error.code =
        "UNSUPPORTED_TEMPORAL_ANALYSIS_TYPE";

    error.analysisType =
        analysisType;

    throw error;
}

async function processTemporalAnalysisWorkflow(
    request
) {
    assertValidWorkflowRequest(request);

    const analysisType =
        request.analysisType
            .trim()
            .toUpperCase();

    assertSupportedAnalysisType(
        analysisType
    );

    let result;

    switch (analysisType) {
        case "CHANGE":
            result =
                calculateTemporalChange(
                    request.composition
                );
            break;

        default:
            throw new Error(
                `Unsupported temporal analysis type: ${analysisType}`
            );
    }

    return createTemporalAnalysisWorkflowResultContract({
        contractVersion: "1.0",

        analysisId:
            request.analysisId,

        analysisType,

        composition:
            request.composition,

        result
    });
}

module.exports = {
    TEMPORAL_ANALYSIS_WORKFLOW_SERVICE_VERSION,
    processTemporalAnalysisWorkflow
};

