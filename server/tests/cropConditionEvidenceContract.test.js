"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    CROP_CONDITION_EVIDENCE_CONTRACT_VERSION,
    ASSESSMENT_TYPE,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    VALID_TEMPORAL_CHANGE_TYPES,
    validateCropConditionEvidence,
    createCropConditionEvidence
} = require("../scientific/cropIntelligence/cropConditionEvidenceContract");

function createValidEvidence() {
    return {
        contractVersion:
            CROP_CONDITION_EVIDENCE_CONTRACT_VERSION,

        assessmentType:
            ASSESSMENT_TYPE,

        indexObservations: [
            {
                indexCode: "NDVI",
                observationDate: "2026-06-01"
            }
        ],

        classifications: [
            {
                indexCode: "NDVI",
                method: "baseline_qualitative"
            }
        ],

        temporalChanges: [
            {
                analysisType: "CHANGE",
                indexCode: "NDVI"
            }
        ],

        spatialContext: {
            source: "test"
        },

        processingContext: {
            source: "test"
        }
    };
}

test(
    "exports the Crop Condition Evidence contract definition",
    () => {
        assert.equal(
            CROP_CONDITION_EVIDENCE_CONTRACT_VERSION,
            "1.0"
        );

        assert.equal(
            ASSESSMENT_TYPE,
            "CROP_CONDITION_EVIDENCE"
        );

        assert.deepEqual(
            VALID_TEMPORAL_CHANGE_TYPES,
            ["CHANGE"]
        );

        assert.deepEqual(
            REQUIRED_FIELDS,
            [
                "contractVersion",
                "assessmentType",
                "indexObservations",
                "classifications",
                "temporalChanges",
                "spatialContext",
                "processingContext"
            ]
        );

        assert.deepEqual(
            OPTIONAL_FIELDS,
            ["metadata"]
        );
    }
);

test(
    "accepts a valid evidence envelope",
    () => {
        const validation =
            validateCropConditionEvidence(
                createValidEvidence()
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );
    }
);

test(
    "accepts evidence containing only index observations",
    () => {
        const evidence =
            createValidEvidence();

        evidence.classifications = [];
        evidence.temporalChanges = [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );
    }
);

test(
    "accepts evidence containing only classifications",
    () => {
        const evidence =
            createValidEvidence();

        evidence.indexObservations = [];
        evidence.temporalChanges = [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );
    }
);

test(
    "accepts evidence containing only temporal CHANGE results",
    () => {
        const evidence =
            createValidEvidence();

        evidence.indexObservations = [];
        evidence.classifications = [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );
    }
);

test(
    "rejects an empty evidence envelope",
    () => {
        const evidence =
            createValidEvidence();

        evidence.indexObservations = [];
        evidence.classifications = [];
        evidence.temporalChanges = [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "At least one analytical evidence item"
                    )
            )
        );
    }
);

test(
    "rejects an invalid contract version",
    () => {
        const evidence =
            createValidEvidence();

        evidence.contractVersion =
            "9.9";

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "contractVersion"
                    )
            )
        );
    }
);

test(
    "rejects an invalid assessment type",
    () => {
        const evidence =
            createValidEvidence();

        evidence.assessmentType =
            "OTHER";

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "assessmentType"
                    )
            )
        );
    }
);

test(
    "rejects non-array evidence collections",
    () => {
        const evidence =
            createValidEvidence();

        evidence.indexObservations =
            "NDVI";

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "indexObservations must be an array"
                    )
            )
        );
    }
);

test(
    "rejects invalid temporal change type",
    () => {
        const evidence =
            createValidEvidence();

        evidence.temporalChanges[0]
            .analysisType = "TREND";

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "analysisType must be CHANGE"
                    )
            )
        );
    }
);

test(
    "rejects temporal CHANGE evidence without indexCode",
    () => {
        const evidence =
            createValidEvidence();

        delete evidence.temporalChanges[0]
            .indexCode;

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "indexCode must be a non-empty string"
                    )
            )
        );
    }
);

test(
    "rejects invalid spatial context",
    () => {
        const evidence =
            createValidEvidence();

        evidence.spatialContext =
            null;

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "spatialContext"
                    )
            )
        );
    }
);

test(
    "rejects invalid processing context",
    () => {
        const evidence =
            createValidEvidence();

        evidence.processingContext =
            [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "processingContext"
                    )
            )
        );
    }
);

test(
    "accepts optional metadata",
    () => {
        const evidence =
            createValidEvidence();

        evidence.metadata = {
            source: "Phase 6.4.1 test"
        };

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );
    }
);

test(
    "rejects invalid optional metadata",
    () => {
        const evidence =
            createValidEvidence();

        evidence.metadata = [];

        const validation =
            validateCropConditionEvidence(
                evidence
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "metadata"
                    )
            )
        );
    }
);

test(
    "factory normalizes contract version and assessment type",
    () => {
        const evidence =
            createValidEvidence();

        evidence.contractVersion =
            "0.1";

        evidence.assessmentType =
            "OTHER";

        const result =
            createCropConditionEvidence(
                evidence
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.assessmentType,
            "CROP_CONDITION_EVIDENCE"
        );
    }
);

test(
    "factory rejects invalid evidence",
    () => {
        const evidence =
            createValidEvidence();

        evidence.indexObservations = [];
        evidence.classifications = [];
        evidence.temporalChanges = [];

        assert.throws(
            () =>
                createCropConditionEvidence(
                    evidence
                ),
            (error) => {
                assert.equal(
                    error.code,
                    "INVALID_CROP_CONDITION_EVIDENCE"
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
