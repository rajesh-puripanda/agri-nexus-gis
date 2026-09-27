"use strict";

// ============================================================
// server/scientific/cropIntelligence/
// cropConditionInterpretationContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 6.4.2
// Crop Condition Interpretation Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the authoritative structural contract for interpreting
// validated remote-sensing evidence for Crop Intelligence.
//
// Scientific evidence remains authoritative in the existing:
//   - Temporal Index Observation Contract
//   - Raster Index Classification Contract
//   - Temporal CHANGE Contract
//
// This contract does NOT:
//   - calculate spectral indices
//   - classify raster pixels
//   - calculate temporal change
//   - define crop-specific thresholds
//   - determine yield
//   - determine irrigation requirements
//   - calculate crop suitability
//   - claim crop health without sufficient scientific context
// ============================================================

const CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION = "1.0";

const INTERPRETATION_TYPE =
    "CROP_CONDITION_INTERPRETATION";

const REQUIRED_FIELDS = [
    "contractVersion",
    "interpretationType",
    "evidence",
    "indexInterpretations",
    "temporalInterpretations",
    "overallInterpretation",
    "spatialContext",
    "processingContext"
];

const OPTIONAL_FIELDS = [
    "metadata"
];

const VALID_INTERPRETATION_STATUSES = [
    "evidence_only",
    "context_dependent",
    "calibration_required"
];

const VALID_TEMPORAL_DIRECTIONS = [
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

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isFiniteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function validateInterpretationStatus(
    status,
    fieldName
) {
    if (
        !isNonEmptyString(status) ||
        !VALID_INTERPRETATION_STATUSES.includes(status)
    ) {
        return [
            `${fieldName} must be one of: ${VALID_INTERPRETATION_STATUSES.join(", ")}.`
        ];
    }

    return [];
}

function validateIndexInterpretation(
    interpretation,
    index
) {
    const errors = [];

    const prefix =
        `indexInterpretations[${index}]`;

    if (!isPlainObject(interpretation)) {
        return [
            `${prefix} must be a plain object.`
        ];
    }

    if (!isNonEmptyString(interpretation.indexCode)) {
        errors.push(
            `${prefix}.indexCode must be a non-empty string.`
        );
    }

    if (!isNonEmptyString(interpretation.observationDate)) {
        errors.push(
            `${prefix}.observationDate must be a non-empty string.`
        );
    }

    if (!isNonEmptyString(interpretation.evidenceClass)) {
        errors.push(
            `${prefix}.evidenceClass must be a non-empty string.`
        );
    }

    if (!isNonEmptyString(interpretation.evidenceSummary)) {
        errors.push(
            `${prefix}.evidenceSummary must be a non-empty string.`
        );
    }

    errors.push(
        ...validateInterpretationStatus(
            interpretation.interpretationStatus,
            `${prefix}.interpretationStatus`
        )
    );

    return errors;
}

function validateTemporalInterpretation(
    interpretation,
    index
) {
    const errors = [];

    const prefix =
        `temporalInterpretations[${index}]`;

    if (!isPlainObject(interpretation)) {
        return [
            `${prefix} must be a plain object.`
        ];
    }

    if (!isNonEmptyString(interpretation.indexCode)) {
        errors.push(
            `${prefix}.indexCode must be a non-empty string.`
        );
    }

    if (!isNonEmptyString(interpretation.startDate)) {
        errors.push(
            `${prefix}.startDate must be a non-empty string.`
        );
    }

    if (!isNonEmptyString(interpretation.endDate)) {
        errors.push(
            `${prefix}.endDate must be a non-empty string.`
        );
    }

    if (
        !isNonEmptyString(
            interpretation.direction
        ) ||
        !VALID_TEMPORAL_DIRECTIONS.includes(
            interpretation.direction
        )
    ) {
        errors.push(
            `${prefix}.direction must be increase, decrease, or no_change.`
        );
    }

    if (
        interpretation.changeMagnitude !== undefined &&
        !isFiniteNumber(
            interpretation.changeMagnitude
        )
    ) {
        errors.push(
            `${prefix}.changeMagnitude must be a finite number when provided.`
        );
    }

    errors.push(
        ...validateInterpretationStatus(
            interpretation.interpretationStatus,
            `${prefix}.interpretationStatus`
        )
    );

    return errors;
}

function validateCropConditionInterpretation(
    interpretation
) {
    const errors = [];

    if (!isPlainObject(interpretation)) {
        return {
            valid: false,
            errors: [
                "Crop condition interpretation must be a plain object."
            ]
        };
    }

    if (
        interpretation.contractVersion !==
        CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION}".`
        );
    }

    if (
        interpretation.interpretationType !==
        INTERPRETATION_TYPE
    ) {
        errors.push(
            `interpretationType must be "${INTERPRETATION_TYPE}".`
        );
    }

    if (!isPlainObject(interpretation.evidence)) {
        errors.push(
            "evidence must be a plain object."
        );
    }

    if (!Array.isArray(interpretation.indexInterpretations)) {
        errors.push(
            "indexInterpretations must be an array."
        );
    } else {
        interpretation.indexInterpretations.forEach(
            (item, index) => {
                errors.push(
                    ...validateIndexInterpretation(
                        item,
                        index
                    )
                );
            }
        );
    }

    if (!Array.isArray(interpretation.temporalInterpretations)) {
        errors.push(
            "temporalInterpretations must be an array."
        );
    } else {
        interpretation.temporalInterpretations.forEach(
            (item, index) => {
                errors.push(
                    ...validateTemporalInterpretation(
                        item,
                        index
                    )
                );
            }
        );
    }

    if (
        !isPlainObject(
            interpretation.overallInterpretation
        )
    ) {
        errors.push(
            "overallInterpretation must be a plain object."
        );
    } else {
        const overall =
            interpretation.overallInterpretation;

        errors.push(
            ...validateInterpretationStatus(
                overall.interpretationStatus,
                "overallInterpretation.interpretationStatus"
            )
        );

        if (!isNonEmptyString(overall.summary)) {
            errors.push(
                "overallInterpretation.summary must be a non-empty string."
            );
        }

        if (
            overall.confidence !== undefined &&
            (
                !isFiniteNumber(overall.confidence) ||
                overall.confidence < 0 ||
                overall.confidence > 1
            )
        ) {
            errors.push(
                "overallInterpretation.confidence must be a number between 0 and 1 when provided."
            );
        }
    }

    if (
        !isPlainObject(
            interpretation.spatialContext
        )
    ) {
        errors.push(
            "spatialContext must be a plain object."
        );
    }

    if (
        !isPlainObject(
            interpretation.processingContext
        )
    ) {
        errors.push(
            "processingContext must be a plain object."
        );
    }

    if (
        interpretation.metadata !== undefined &&
        !isPlainObject(interpretation.metadata)
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createCropConditionInterpretation(
    interpretation
) {
    const result = {
        ...interpretation,
        contractVersion:
            CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION,
        interpretationType:
            INTERPRETATION_TYPE
    };

    const validation =
        validateCropConditionInterpretation(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid crop condition interpretation: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_CROP_CONDITION_INTERPRETATION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION,
    INTERPRETATION_TYPE,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    VALID_INTERPRETATION_STATUSES,
    VALID_TEMPORAL_DIRECTIONS,
    validateCropConditionInterpretation,
    createCropConditionInterpretation
};
