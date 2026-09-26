"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/
// rasterIndexBatchWorkflowResultContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.3
// Batch Raster Workflow Result Contract
//
// Contract version: 1.0
//
// This contract defines the structural result returned by the
// batch raster workflow.
//
// Individual single-index workflow results are validated by
// the existing frozen raster workflow result contract.
//
// This contract does NOT:
//   - calculate indices
//   - classify raster values
//   - validate GeoTIFF contents directly
//   - modify scientific definitions
//   - perform spatial processing
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const {
    RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
    validateRasterIndexWorkflowResult
} = require(
    "./rasterIndexWorkflowContract"
);

const RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION =
    "1.0";

const REQUIRED_BATCH_RESULT_FIELDS = [
    "batchVersion",
    "input",
    "results"
];

const REQUIRED_INPUT_FIELDS = [
    "filePath",
    "indexCodes"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateNonEmptyString(value, fieldName) {
    const errors = [];

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        errors.push(
            `${fieldName} must be a non-empty string.`
        );
    }

    return errors;
}

function normalizeIndexCodes(indexCodes) {
    if (!Array.isArray(indexCodes)) {
        return [];
    }

    return indexCodes.map(
        code =>
            typeof code === "string"
                ? code.trim().toUpperCase()
                : code
    );
}

function validateBatchIndexCodes(
    indexCodes,
    errors
) {
    if (!Array.isArray(indexCodes)) {
        errors.push(
            "input.indexCodes must be an array."
        );
        return [];
    }

    if (indexCodes.length === 0) {
        errors.push(
            "input.indexCodes must contain at least one index."
        );
        return [];
    }

    const normalizedCodes =
        normalizeIndexCodes(indexCodes);

    const seen = new Set();

    normalizedCodes.forEach(
        (indexCode, index) => {
            if (
                typeof indexCode !== "string" ||
                indexCode.length === 0
            ) {
                errors.push(
                    `input.indexCodes[${index}] must be a non-empty string.`
                );
                return;
            }

            if (seen.has(indexCode)) {
                errors.push(
                    `input.indexCodes contains duplicate index '${indexCode}'.`
                );
                return;
            }

            seen.add(indexCode);

            if (!getIndexDefinition(indexCode)) {
                errors.push(
                    `input.indexCodes[${index}] contains unknown index '${indexCode}'.`
                );
            }
        }
    );

    return normalizedCodes;
}

function validateRasterIndexBatchWorkflowResult(
    result
) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: [
                "Batch workflow result must be a plain object."
            ]
        };
    }

    REQUIRED_BATCH_RESULT_FIELDS.forEach(
        field => {
            if (
                !Object.prototype.hasOwnProperty.call(
                    result,
                    field
                )
            ) {
                errors.push(
                    `Missing required batch result field: ${field}.`
                );
            }
        }
    );

    if (
        typeof result.batchVersion !== "string" ||
        result.batchVersion !==
            RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION
    ) {
        errors.push(
            `batchVersion must be '${RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION}'.`
        );
    }

    if (!isPlainObject(result.input)) {
        errors.push(
            "input must be a plain object."
        );
    } else {
        REQUIRED_INPUT_FIELDS.forEach(
            field => {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        result.input,
                        field
                    )
                ) {
                    errors.push(
                        `Missing required input field: ${field}.`
                    );
                }
            }
        );

        errors.push(
            ...validateNonEmptyString(
                result.input.filePath,
                "input.filePath"
            )
        );

        const normalizedCodes =
            validateBatchIndexCodes(
                result.input.indexCodes,
                errors
            );

        if (
            Array.isArray(result.input.indexCodes)
        ) {
            result.input.indexCodes =
                normalizedCodes;
        }
    }

    if (!Array.isArray(result.results)) {
        errors.push(
            "results must be an array."
        );
    } else if (result.results.length === 0) {
        errors.push(
            "results must contain at least one workflow result."
        );
    } else {
        result.results.forEach(
            (workflowResult, index) => {
                const validation =
                    validateRasterIndexWorkflowResult(
                        workflowResult
                    );

                if (!validation.valid) {
                    validation.errors.forEach(
                        error => {
                            errors.push(
                                `results[${index}]: ${error}`
                            );
                        }
                    );
                }
            }
        );

        if (
            isPlainObject(result.input) &&
            Array.isArray(result.input.indexCodes) &&
            result.input.indexCodes.length ===
                result.results.length
        ) {
            result.results.forEach(
                (workflowResult, index) => {
                    if (
                        workflowResult.indexCode !==
                        result.input.indexCodes[index]
                    ) {
                        errors.push(
                            `results[${index}].indexCode must match input.indexCodes[${index}].`
                        );
                    }
                }
            );
        } else if (
            isPlainObject(result.input) &&
            Array.isArray(result.input.indexCodes)
        ) {
            errors.push(
                "input.indexCodes length must match results length."
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createRasterIndexBatchWorkflowResultContract({
    batchVersion =
        RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION,
    input,
    results
}) {
    const result = {
        batchVersion,
        input,
        results
    };

    const validation =
        validateRasterIndexBatchWorkflowResult(
            result
        );

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid raster index batch workflow result: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_RASTER_INDEX_BATCH_WORKFLOW_RESULT";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION,
    RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
    REQUIRED_BATCH_RESULT_FIELDS,
    REQUIRED_INPUT_FIELDS,
    validateRasterIndexBatchWorkflowResult,
    createRasterIndexBatchWorkflowResultContract
};

