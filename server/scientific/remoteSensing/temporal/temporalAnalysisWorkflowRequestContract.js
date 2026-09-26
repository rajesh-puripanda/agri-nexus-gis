"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalAnalysisWorkflowRequestContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.6.1
// Temporal Analysis Workflow Request Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the structural request supplied to the temporal
// analysis workflow.
//
// The request contains one authoritative TemporalComposition
// together with the identity and type of the requested
// temporal analysis.
//
// Scientific composition rules remain authoritative in:
//   temporalCompositionContract.js
//
// This contract does NOT:
//   - calculate remote-sensing indices
//   - calculate trends
//   - detect change
//   - perform seasonal analysis
//   - perform temporal statistics
//   - modify raster values
//   - read or write GeoTIFF files
//   - reorder observations
//   - reconstruct temporal context
//   - modify the supplied composition
// ============================================================

const {
    validateTemporalComposition
} = require("./temporalCompositionContract");

const TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "analysisId",
    "analysisType",
    "composition"
];

const OPTIONAL_FIELDS = [
    "parameters",
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function normalizeAnalysisType(analysisType) {
    return isNonEmptyString(analysisType)
        ? analysisType.trim().toUpperCase()
        : "";
}

function validateTemporalAnalysisWorkflowRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Temporal analysis workflow request must be a plain object."
            ]
        };
    }

    REQUIRED_FIELDS.forEach(
        field => {
            if (
                !Object.prototype.hasOwnProperty.call(
                    request,
                    field
                )
            ) {
                errors.push(
                    `Missing required field: ${field}.`
                );
            }
        }
    );

    if (
        request.contractVersion !==
        TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be '${TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION}'.`
        );
    }

    if (!isNonEmptyString(request.analysisId)) {
        errors.push(
            "analysisId must be a non-empty string."
        );
    }

    const normalizedAnalysisType =
        normalizeAnalysisType(
            request.analysisType
        );

    if (!normalizedAnalysisType) {
        errors.push(
            "analysisType must be a non-empty string."
        );
    }

    if (!isPlainObject(request.composition)) {
        errors.push(
            "composition must be a plain object."
        );
    } else {
        const compositionValidation =
            validateTemporalComposition(
                request.composition
            );

        if (!compositionValidation.valid) {
            compositionValidation.errors.forEach(
                error => {
                    errors.push(
                        `composition: ${error}`
                    );
                }
            );
        }
    }

    if (
        request.parameters !== undefined &&
        !isPlainObject(request.parameters)
    ) {
        errors.push(
            "parameters must be a plain object when provided."
        );
    }

    if (
        request.metadata !== undefined &&
        !isPlainObject(request.metadata)
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        analysisType: normalizedAnalysisType
    };
}

function createTemporalAnalysisWorkflowRequest({
    contractVersion =
        TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION,
    analysisId,
    analysisType,
    composition,
    parameters,
    metadata
}) {
    const result = {
        contractVersion,

        analysisId,

        analysisType:
            normalizeAnalysisType(
                analysisType
            ),

        composition
    };

    if (parameters !== undefined) {
        result.parameters = parameters;
    }

    if (metadata !== undefined) {
        result.metadata = metadata;
    }

    const validation =
        validateTemporalAnalysisWorkflowRequest(
            result
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

    return result;
}

module.exports = {
    TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalAnalysisWorkflowRequest,
    createTemporalAnalysisWorkflowRequest
};

