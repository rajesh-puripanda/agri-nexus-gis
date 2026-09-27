"use strict";

// ============================================================
// server/scientific/cropIntelligence/
// cropConditionEvidenceContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 6.4.1  Crop Condition Evidence Contract
//
// Contract version: 1.0
//
// Defines the evidence envelope consumed by Crop Intelligence.
//
// This contract does NOT:
//   - calculate spectral indices
//   - classify raster pixels
//   - calculate temporal change
//   - define crop-specific thresholds
//   - determine crop health
//   - determine moisture stress
//   - calculate crop suitability
//   - predict yield
//   - recommend irrigation
//
// Existing remote-sensing and temporal contracts remain
// authoritative for their respective scientific outputs.
// ============================================================

const CROP_CONDITION_EVIDENCE_CONTRACT_VERSION = "1.0";

const ASSESSMENT_TYPE =
    "CROP_CONDITION_EVIDENCE";

const REQUIRED_FIELDS = [
    "contractVersion",
    "assessmentType",
    "indexObservations",
    "classifications",
    "temporalChanges",
    "spatialContext",
    "processingContext"
];

const OPTIONAL_FIELDS = [
    "metadata"
];

const VALID_TEMPORAL_CHANGE_TYPES = [
    "CHANGE"
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

function validateEvidenceArray(
    value,
    fieldName
) {
    const errors = [];

    if (!Array.isArray(value)) {
        errors.push(
            `${fieldName} must be an array.`
        );

        return errors;
    }

    value.forEach((item, index) => {
        if (!isPlainObject(item)) {
            errors.push(
                `${fieldName}[${index}] must be a plain object.`
            );
        }
    });

    return errors;
}

function validateTemporalChangeEvidence(
    change,
    index
) {
    const errors = [];

    if (!isPlainObject(change)) {
        return [
            `temporalChanges[${index}] must be a plain object.`
        ];
    }

    if (
        !isNonEmptyString(change.analysisType)
    ) {
        errors.push(
            `temporalChanges[${index}].analysisType must be a non-empty string.`
        );
    } else if (
        !VALID_TEMPORAL_CHANGE_TYPES.includes(
            change.analysisType
                .trim()
                .toUpperCase()
        )
    ) {
        errors.push(
            `temporalChanges[${index}].analysisType must be CHANGE.`
        );
    }

    if (
        !isNonEmptyString(change.indexCode)
    ) {
        errors.push(
            `temporalChanges[${index}].indexCode must be a non-empty string.`
        );
    }

    return errors;
}

function validateCropConditionEvidence(
    evidence
) {
    const errors = [];

    if (!isPlainObject(evidence)) {
        return {
            valid: false,
            errors: [
                "Crop condition evidence must be a plain object."
            ]
        };
    }

    if (
        evidence.contractVersion !==
        CROP_CONDITION_EVIDENCE_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${CROP_CONDITION_EVIDENCE_CONTRACT_VERSION}".`
        );
    }

    if (
        evidence.assessmentType !==
        ASSESSMENT_TYPE
    ) {
        errors.push(
            `assessmentType must be "${ASSESSMENT_TYPE}".`
        );
    }

    errors.push(
        ...validateEvidenceArray(
            evidence.indexObservations,
            "indexObservations"
        )
    );

    errors.push(
        ...validateEvidenceArray(
            evidence.classifications,
            "classifications"
        )
    );

    errors.push(
        ...validateEvidenceArray(
            evidence.temporalChanges,
            "temporalChanges"
        )
    );

    if (
        !isPlainObject(
            evidence.spatialContext
        )
    ) {
        errors.push(
            "spatialContext must be a plain object."
        );
    }

    if (
        !isPlainObject(
            evidence.processingContext
        )
    ) {
        errors.push(
            "processingContext must be a plain object."
        );
    }

    if (
        evidence.metadata !== undefined &&
        !isPlainObject(evidence.metadata)
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    if (
        Array.isArray(
            evidence.temporalChanges
        )
    ) {
        evidence.temporalChanges.forEach(
            (change, index) => {
                errors.push(
                    ...validateTemporalChangeEvidence(
                        change,
                        index
                    )
                );
            }
        );
    }

    let totalEvidenceCount = 0;

    if (
        Array.isArray(
            evidence.indexObservations
        )
    ) {
        totalEvidenceCount +=
            evidence.indexObservations.length;
    }

    if (
        Array.isArray(
            evidence.classifications
        )
    ) {
        totalEvidenceCount +=
            evidence.classifications.length;
    }

    if (
        Array.isArray(
            evidence.temporalChanges
        )
    ) {
        totalEvidenceCount +=
            evidence.temporalChanges.length;
    }

    if (totalEvidenceCount === 0) {
        errors.push(
            "At least one analytical evidence item is required."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createCropConditionEvidence(
    evidence
) {
    const result = {
        ...evidence,
        contractVersion:
            CROP_CONDITION_EVIDENCE_CONTRACT_VERSION,
        assessmentType:
            ASSESSMENT_TYPE
    };

    const validation =
        validateCropConditionEvidence(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid crop condition evidence: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_CROP_CONDITION_EVIDENCE";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    CROP_CONDITION_EVIDENCE_CONTRACT_VERSION,
    ASSESSMENT_TYPE,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    VALID_TEMPORAL_CHANGE_TYPES,
    validateCropConditionEvidence,
    createCropConditionEvidence
};
