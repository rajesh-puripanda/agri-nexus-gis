"use strict";

// ============================================================
// Temporal Composition Workflow Result Contract
// Phase 5.1.5.5
// ============================================================

const {
    TEMPORAL_COMPOSITION_CONTRACT_VERSION,
    validateTemporalComposition
} = require("./temporalCompositionContract");

const TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION = "1.0";

const REQUIRED_RESULT_FIELDS = [
    "contractVersion",
    "composition"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateTemporalCompositionWorkflowResult(result) {
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
            result[field] === undefined ||
            result[field] === null
        ) {
            errors.push(`Missing required field: ${field}.`);
        }
    }

    if (
        result.contractVersion !==
        TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION}".`
        );
    }

    if (!isPlainObject(result.composition)) {
        errors.push("composition must be a plain object.");
    } else {
        const validation =
            validateTemporalComposition(result.composition);

        if (!validation.valid) {
            validation.errors.forEach(error => {
                errors.push(`composition: ${error}`);
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createTemporalCompositionWorkflowResultContract({
    contractVersion =
        TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
    composition
}) {
    const result = {
        contractVersion,
        composition
    };

    const validation =
        validateTemporalCompositionWorkflowResult(result);

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid temporal composition workflow result: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_RESULT";

        error.validationErrors = validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_COMPOSITION_WORKFLOW_RESULT_CONTRACT_VERSION,
    TEMPORAL_COMPOSITION_CONTRACT_VERSION,
    REQUIRED_RESULT_FIELDS,
    validateTemporalCompositionWorkflowResult,
    createTemporalCompositionWorkflowResultContract
};
