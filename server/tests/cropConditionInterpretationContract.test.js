"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION,
    INTERPRETATION_TYPE,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    VALID_INTERPRETATION_STATUSES,
    VALID_TEMPORAL_DIRECTIONS,
    validateCropConditionInterpretation,
    createCropConditionInterpretation
} = require("../scientific/cropIntelligence/cropConditionInterpretationContract");

function createValidInterpretation() {
    return {
        contractVersion:
            CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION,

        interpretationType:
            INTERPRETATION_TYPE,

        evidence: {
            indexObservations: [],
            classifications: [],
            temporalChanges: []
        },

        indexInterpretations: [
            {
                indexCode: "NDVI",
                observationDate: "2026-08-15",
                evidenceClass: "high",
                evidenceSummary:
                    "Observed NDVI evidence falls within the registered high qualitative class.",
                interpretationStatus:
                    "evidence_only"
            }
        ],

        temporalInterpretations: [
            {
                indexCode: "NDVI",
                startDate: "2026-07-15",
                endDate: "2026-08-15",
                direction: "increase",
                changeMagnitude: 0.12,
                interpretationStatus:
                    "context_dependent"
            }
        ],

        overallInterpretation: {
            interpretationStatus:
                "calibration_required",
            summary:
                "Remote-sensing evidence is available; crop-specific interpretation requires calibrated context.",
            confidence: 0.5
        },

        spatialContext: {},

        processingContext: {},

        metadata: {
            test: true
        }
    };
}

test(
    "contract exposes version 1.0",
    () => {
        assert.equal(
            CROP_CONDITION_INTERPRETATION_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "contract exposes the correct interpretation type",
    () => {
        assert.equal(
            INTERPRETATION_TYPE,
            "CROP_CONDITION_INTERPRETATION"
        );
    }
);

test(
    "required fields are defined",
    () => {
        for (const field of [
            "contractVersion",
            "interpretationType",
            "evidence",
            "indexInterpretations",
            "temporalInterpretations",
            "overallInterpretation",
            "spatialContext",
            "processingContext"
        ]) {
            assert.ok(
                REQUIRED_FIELDS.includes(field)
            );
        }
    }
);

test(
    "optional metadata field is defined",
    () => {
        assert.ok(
            OPTIONAL_FIELDS.includes("metadata")
        );
    }
);

test(
    "valid interpretation passes validation",
    () => {
        const validation =
            validateCropConditionInterpretation(
                createValidInterpretation()
            );

        assert.equal(validation.valid, true);
        assert.deepEqual(validation.errors, []);
    }
);

test(
    "missing contract version is rejected",
    () => {
        const value =
            createValidInterpretation();

        delete value.contractVersion;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error =>
                    error.includes("contractVersion")
            )
        );
    }
);

test(
    "incorrect interpretation type is rejected",
    () => {
        const value =
            createValidInterpretation();

        value.interpretationType = "CROP_HEALTH";

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "evidence must be a plain object",
    () => {
        const value =
            createValidInterpretation();

        value.evidence = [];

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error =>
                    error.includes("evidence")
            )
        );
    }
);

test(
    "index interpretations must be an array",
    () => {
        const value =
            createValidInterpretation();

        value.indexInterpretations = {};

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "index interpretation requires index code",
    () => {
        const value =
            createValidInterpretation();

        delete value.indexInterpretations[0].indexCode;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error =>
                    error.includes("indexCode")
            )
        );
    }
);

test(
    "index interpretation requires evidence summary",
    () => {
        const value =
            createValidInterpretation();

        delete value.indexInterpretations[0].evidenceSummary;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "invalid interpretation status is rejected",
    () => {
        const value =
            createValidInterpretation();

        value.indexInterpretations[0]
            .interpretationStatus = "healthy";

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "temporal interpretation requires valid direction",
    () => {
        const value =
            createValidInterpretation();

        value.temporalInterpretations[0]
            .direction = "trend";

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "temporal change magnitude must be finite when provided",
    () => {
        const value =
            createValidInterpretation();

        value.temporalInterpretations[0]
            .changeMagnitude = NaN;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "overall interpretation requires summary",
    () => {
        const value =
            createValidInterpretation();

        delete value.overallInterpretation.summary;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "overall confidence must be between zero and one",
    () => {
        const value =
            createValidInterpretation();

        value.overallInterpretation.confidence = 1.5;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
    }
);

test(
    "spatial and processing contexts are required objects",
    () => {
        const value =
            createValidInterpretation();

        value.spatialContext = [];
        value.processingContext = "invalid";

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                error =>
                    error.includes("spatialContext")
            )
        );
        assert.ok(
            validation.errors.some(
                error =>
                    error.includes("processingContext")
            )
        );
    }
);

test(
    "metadata is optional",
    () => {
        const value =
            createValidInterpretation();

        delete value.metadata;

        const validation =
            validateCropConditionInterpretation(value);

        assert.equal(validation.valid, true);
    }
);

test(
    "factory normalizes contract version and interpretation type",
    () => {
        const value =
            createValidInterpretation();

        value.contractVersion = "incorrect";
        value.interpretationType = "incorrect";

        const result =
            createCropConditionInterpretation(value);

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.interpretationType,
            "CROP_CONDITION_INTERPRETATION"
        );
    }
);

test(
    "factory rejects invalid interpretation",
    () => {
        const value =
            createValidInterpretation();

        delete value.overallInterpretation.summary;

        assert.throws(
            () =>
                createCropConditionInterpretation(value),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_CROP_CONDITION_INTERPRETATION"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                return true;
            }
        );
    }
);

test(
    "valid interpretation statuses are explicit",
    () => {
        assert.deepEqual(
            VALID_INTERPRETATION_STATUSES,
            [
                "evidence_only",
                "context_dependent",
                "calibration_required"
            ]
        );
    }
);

test(
    "valid temporal directions are explicit",
    () => {
        assert.deepEqual(
            VALID_TEMPORAL_DIRECTIONS,
            [
                "increase",
                "decrease",
                "no_change"
            ]
        );
    }
);
