"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalAnalysisWorkflowResultContract.js
//
// AgriNexus GIS
//
// Phase 5.1.6.2
// Temporal Analysis Workflow Result Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the structural result returned by the temporal
// analysis workflow.
//
// Scientific result semantics remain outside this workflow
// envelope and will be defined by later analysis-specific
// contracts/services.
//
// This contract does NOT:
//   - calculate trends
//   - detect change
//   - perform seasonal analysis
//   - calculate temporal statistics
//   - modify temporal compositions
//   - reorder observations
//   - read or write raster files
//   - perform scientific interpretation
// ============================================================

const {
    validateTemporalComposition
} = require("./temporalCompositionContract");

const TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION =
    "1.0";

const REQUIRED_RESULT_FIELDS = [
    "contractVersion",
    "analysisId",
    "analysisType",
    "composition",
    "result"
];

const OPTIONAL_RESULT_FIELDS = [
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

function validateTemporalAnalysisWorkflowResult(
    result
) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: [
                "result must be a plain object."
            ]
        };
    }

    for (const field of REQUIRED_RESULT_FIELDS) {
        if (
            !Object.prototype.hasOwnProperty.call(
                result,
                field
            )
        ) {
            errors.push(
                `Missing required field: ${field}.`
            );
        }
    }

    if (
        result.contractVersion !==
        TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be '${TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION}'.`
        );
    }

    if (!isNonEmptyString(result.analysisId)) {
        errors.push(
            "analysisId must be a non-empty string."
        );
    }

    const normalizedAnalysisType =
        normalizeAnalysisType(
            result.analysisType
        );

    if (!normalizedAnalysisType) {
        errors.push(
            "analysisType must be a non-empty string."
        );
    }

    if (!isPlainObject(result.composition)) {
        errors.push(
            "composition must be a plain object."
        );
    } else {
        const compositionValidation =
            validateTemporalComposition(
                result.composition
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

    if (!isPlainObject(result.result)) {
        errors.push(
            "result must be a plain object."
        );
    }

    if (
        result.metadata !== undefined &&
        !isPlainObject(result.metadata)
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

function createTemporalAnalysisWorkflowResultContract({
    contractVersion =
        TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION,
    analysisId,
    analysisType,
    composition,
    result,
    metadata
}) {
    const workflowResult = {
        contractVersion,

        analysisId,

        analysisType:
            normalizeAnalysisType(
                analysisType
            ),

        composition,

        result
    };

    if (metadata !== undefined) {
        workflowResult.metadata = metadata;
    }

    const validation =
        validateTemporalAnalysisWorkflowResult(
            workflowResult
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal analysis workflow result: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_RESULT";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return workflowResult;
}

module.exports = {
    TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION,
    REQUIRED_RESULT_FIELDS,
    OPTIONAL_RESULT_FIELDS,
    validateTemporalAnalysisWorkflowResult,
    createTemporalAnalysisWorkflowResultContract
};
