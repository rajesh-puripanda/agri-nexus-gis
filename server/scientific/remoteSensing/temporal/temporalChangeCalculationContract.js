"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/temporalChangeCalculationContract.js
// ============================================================
//
// Phase 5.1.7.13  Temporal Change Calculation Contract
//
// Defines the structural contract for a scientific CHANGE result.
// Scientific calculation logic belongs to the calculation service,
// not this contract.
//

const CONTRACT_VERSION = "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "analysisType",
    "compositionId",
    "indexCode",
    "comparison",
    "absoluteChange",
    "percentageChange",
    "percentageChangeStatus",
    "direction"
];

const VALID_PERCENTAGE_STATUSES = [
    "normal",
    "undefined_zero_baseline"
];

const VALID_DIRECTIONS = [
    "increase",
    "decrease",
    "no_change"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

function validateDate(value) {
    return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    );
}

function validateTemporalChangeCalculationResult(result) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: ["Result must be a plain object."]
        };
    }

    for (const field of REQUIRED_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(result, field)) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    if (result.contractVersion !== CONTRACT_VERSION) {
        errors.push(
            `contractVersion must be ${CONTRACT_VERSION}.`
        );
    }

    if (
        typeof result.analysisType !== "string" ||
        result.analysisType.trim() === ""
    ) {
        errors.push("analysisType must be a non-empty string.");
    } else if (result.analysisType.toUpperCase() !== "CHANGE") {
        errors.push("analysisType must be CHANGE.");
    }

    if (
        typeof result.compositionId !== "string" ||
        result.compositionId.trim() === ""
    ) {
        errors.push("compositionId must be a non-empty string.");
    }

    if (
        typeof result.indexCode !== "string" ||
        result.indexCode.trim() === ""
    ) {
        errors.push("indexCode must be a non-empty string.");
    }

    if (!isPlainObject(result.comparison)) {
        errors.push("comparison must be a plain object.");
    } else {
        if (!validateDate(result.comparison.startDate)) {
            errors.push("comparison.startDate must be YYYY-MM-DD.");
        }

        if (!validateDate(result.comparison.endDate)) {
            errors.push("comparison.endDate must be YYYY-MM-DD.");
        }

        if (isFiniteNumber(result.comparison.startMean) === false) {
            errors.push("comparison.startMean must be a finite number.");
        }

        if (isFiniteNumber(result.comparison.endMean) === false) {
            errors.push("comparison.endMean must be a finite number.");
        }

        if (
            validateDate(result.comparison.startDate) &&
            validateDate(result.comparison.endDate) &&
            result.comparison.startDate >= result.comparison.endDate
        ) {
            errors.push(
                "comparison.startDate must precede comparison.endDate."
            );
        }
    }

    if (!isFiniteNumber(result.absoluteChange)) {
        errors.push("absoluteChange must be a finite number.");
    }

    if (
        result.percentageChange !== null &&
        !isFiniteNumber(result.percentageChange)
    ) {
        errors.push(
            "percentageChange must be a finite number or null."
        );
    }

    if (
        typeof result.percentageChangeStatus !== "string" ||
        !VALID_PERCENTAGE_STATUSES.includes(
            result.percentageChangeStatus
        )
    ) {
        errors.push(
            "percentageChangeStatus must be normal or undefined_zero_baseline."
        );
    }

    if (
        typeof result.direction !== "string" ||
        !VALID_DIRECTIONS.includes(result.direction)
    ) {
        errors.push(
            "direction must be increase, decrease, or no_change."
        );
    }

    if (
        result.percentageChangeStatus === "undefined_zero_baseline" &&
        result.percentageChange !== null
    ) {
        errors.push(
            "percentageChange must be null for undefined_zero_baseline."
        );
    }

    if (
        result.percentageChangeStatus === "normal" &&
        result.percentageChange === null
    ) {
        errors.push(
            "percentageChange cannot be null for normal status."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createTemporalChangeCalculationResult(input) {
    const result = {
        ...input,
        contractVersion: CONTRACT_VERSION,
        analysisType: "CHANGE"
    };

    const validation = validateTemporalChangeCalculationResult(result);

    if (!validation.valid) {
        const error = new Error(
            "Invalid temporal change calculation result."
        );
        error.code = "INVALID_TEMPORAL_CHANGE_CALCULATION_RESULT";
        error.errors = validation.errors;
        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_CHANGE_CALCULATION_CONTRACT_VERSION: CONTRACT_VERSION,
    REQUIRED_FIELDS,
    VALID_PERCENTAGE_STATUSES,
    VALID_DIRECTIONS,
    validateTemporalChangeCalculationResult,
    createTemporalChangeCalculationResult
};
