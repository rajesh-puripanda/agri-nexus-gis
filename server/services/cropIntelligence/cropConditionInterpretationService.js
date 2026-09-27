"use strict";

// ============================================================
// server/services/cropIntelligence/
// cropConditionInterpretationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 6.4.2
// Crop Condition Interpretation Service
//
// Purpose:
// Composes validated remote-sensing evidence into a
// conservative Crop Condition Interpretation.
//
// Scientific authority remains in the existing:
//   - Temporal Index Observation Contract
//   - Raster Index Classification Contract
//   - Temporal CHANGE Contract
//
// This service does NOT:
//   - calculate spectral indices
//   - classify raster pixels
//   - calculate temporal change
//   - define crop-specific thresholds
//   - calculate crop suitability
//   - determine yield
//   - recommend irrigation
// ============================================================

const {
    validateCropConditionEvidence
} = require("../../scientific/cropIntelligence/cropConditionEvidenceContract");

const {
    validateCropConditionInterpretation,
    createCropConditionInterpretation
} = require("../../scientific/cropIntelligence/cropConditionInterpretationContract");

const {
    validateTemporalIndexObservation
} = require("../../scientific/remoteSensing/temporal/temporalIndexObservationContract");

const {
    validateRasterIndexClassificationResult
} = require("../../scientific/remoteSensing/raster/rasterIndexClassificationContract");

const {
    validateTemporalChangeCalculationResult
} = require("../../scientific/remoteSensing/temporal/temporalChangeCalculationContract");

const CROP_CONDITION_INTERPRETATION_SERVICE_VERSION = "1.0";

function assertValidEvidenceEnvelope(evidence) {
    const validation =
        validateCropConditionEvidence(evidence);

    if (!validation.valid) {
        const error = new Error(
            "Invalid crop condition evidence: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_CROP_CONDITION_EVIDENCE";

        error.validationErrors =
            validation.errors;

        throw error;
    }
}

function validateAuthoritativeEvidence(evidence) {
    const errors = [];

    for (
        let index = 0;
        index < evidence.indexObservations.length;
        index += 1
    ) {
        const validation =
            validateTemporalIndexObservation(
                evidence.indexObservations[index]
            );

        if (validation.length > 0) {
            errors.push(
                ...validation.map(
                    error =>
                        `indexObservations[${index}]: ${error}`
                )
            );
        }
    }

    for (
        let index = 0;
        index < evidence.classifications.length;
        index += 1
    ) {
        const validation =
            validateRasterIndexClassificationResult(
                evidence.classifications[index]
            );

        if (!validation.valid) {
            errors.push(
                ...validation.errors.map(
                    error =>
                        `classifications[${index}]: ${error}`
                )
            );
        }
    }

    for (
        let index = 0;
        index < evidence.temporalChanges.length;
        index += 1
    ) {
        const validation =
            validateTemporalChangeCalculationResult(
                evidence.temporalChanges[index]
            );

        if (!validation.valid) {
            errors.push(
                ...validation.errors.map(
                    error =>
                        `temporalChanges[${index}]: ${error}`
                )
            );
        }
    }

    return errors;
}

function assertAuthoritativeEvidence(evidence) {
    const errors =
        validateAuthoritativeEvidence(
            evidence
        );

    if (errors.length > 0) {
        const error = new Error(
            "Invalid authoritative crop condition evidence: " +
            errors.join("; ")
        );

        error.code =
            "INVALID_AUTHORITATIVE_CROP_CONDITION_EVIDENCE";

        error.validationErrors =
            errors;

        throw error;
    }
}

function createIndexInterpretation(
    observation
) {
    const indexCode =
        observation.observation.indexCode;

    return {
        indexCode,

        observationDate:
            observation.observation.observationDate,

        evidenceClass:
            "remote_sensing_index_observation",

        evidenceSummary:
            `${observation.index.name} observation recorded with mean value ${observation.statistics.mean}.`,

        interpretationStatus:
            "context_dependent"
    };
}

function createTemporalInterpretation(
    change
) {
    return {
        indexCode:
            change.indexCode,

        startDate:
            change.comparison.startDate,

        endDate:
            change.comparison.endDate,

        direction:
            change.direction,

        changeMagnitude:
            change.absoluteChange,

        interpretationStatus:
            "context_dependent"
    };
}

function createOverallInterpretation(
    evidence
) {
    const evidenceCount =
        evidence.indexObservations.length +
        evidence.classifications.length +
        evidence.temporalChanges.length;

    return {
        interpretationStatus:
            "calibration_required",

        summary:
            `Remote-sensing crop-condition evidence is available from ${evidenceCount} analytical evidence item(s). Crop-specific interpretation requires calibrated agricultural context.`,

        confidence: undefined
    };
}

function processCropConditionInterpretation(
    evidence
) {
    assertValidEvidenceEnvelope(
        evidence
    );

    assertAuthoritativeEvidence(
        evidence
    );

    const indexInterpretations =
        evidence.indexObservations.map(
            createIndexInterpretation
        );

    const temporalInterpretations =
        evidence.temporalChanges.map(
            createTemporalInterpretation
        );

    const result =
        createCropConditionInterpretation({
            evidence,

            indexInterpretations,

            temporalInterpretations,

            overallInterpretation:
                createOverallInterpretation(
                    evidence
                ),

            spatialContext:
                evidence.spatialContext,

            processingContext:
                evidence.processingContext,

            metadata: {
                serviceVersion:
                    CROP_CONDITION_INTERPRETATION_SERVICE_VERSION,

                classificationEvidenceCount:
                    evidence.classifications.length,

                indexObservationCount:
                    evidence.indexObservations.length,

                temporalChangeCount:
                    evidence.temporalChanges.length
            }
        });

    const validation =
        validateCropConditionInterpretation(
            result
        );

    if (!validation.valid) {
        const error = new Error(
            "Generated crop condition interpretation failed contract validation: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_GENERATED_CROP_CONDITION_INTERPRETATION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    CROP_CONDITION_INTERPRETATION_SERVICE_VERSION,
    assertValidEvidenceEnvelope,
    validateAuthoritativeEvidence,
    assertAuthoritativeEvidence,
    createIndexInterpretation,
    createTemporalInterpretation,
    createOverallInterpretation,
    processCropConditionInterpretation
};
