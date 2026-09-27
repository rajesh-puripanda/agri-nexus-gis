"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createCropConditionEvidence
} = require("../scientific/cropIntelligence/cropConditionEvidenceContract");

const {
    processCropConditionInterpretation,
    validateAuthoritativeEvidence
} = require("../services/cropIntelligence/cropConditionInterpretationService");

function createTemporalObservation(
    indexCode = "NDVI"
) {
    return {
        contractVersion: "1.0",

        observation: {
            observationDate: "2026-08-15",
            acquisitionDate: "2026-08-15",
            sensor: "TEST_SENSOR",
            sceneId: "SCENE-001",
            indexCode
        },

        raster: {
            rasterId: `RASTER-${indexCode}`,
            width: 2,
            height: 2,
            pixelCount: 4,
        },

        index: {
            code: indexCode,
            name: indexCode,
            validRange: {
                min: -1,
                max: 1
            }
        },

        statistics: {
            validPixelCount: 4,
            noDataPixelCount: 0,
            minimum: 0.2,
            maximum: 0.8,
            mean: 0.5
        },

        spatialContext: {
            test: true
        },

        processingContext: {
            test: true
        }
    };
}

function createClassification(
    indexCode = "NDVI"
) {
    return {
        analysisType:
            "remote_sensing_raster_index_classification",

        analysisVersion:
            "1.0",

        timestamp:
            "2026-08-15T00:00:00.000Z",

        inputContext: {
            indexCode,
            indexName: indexCode,
            processingContext: {}
        },

        spatialContext: {},

        parameters: {
            classificationMethod:
                "baseline_qualitative"
        },

        results: {
            raster: {
                width: 2,
                height: 2
            }
        },

        classification: {
            method:
                "baseline_qualitative",

            classDefinitions: [],

            raster: {
                width: 2,
                height: 2
            },

            statistics: {
                validPixelCount: 4,
                noDataPixelCount: 0,
                totalPixelCount: 4,
                classes: []
            }
        },

        statistics: {
            validPixelCount: 4,
            noDataPixelCount: 0,
            totalPixelCount: 4
        },

        metadata: {
            processingType:
                "pixelwise_raster_classification",
            indexCode,
            indexName: indexCode,
            classificationMethod:
                "baseline_qualitative",
            sourceRasterContractVersion:
                "1.0",
        }
    };
}

function createTemporalChange(
    indexCode = "NDVI"
) {
    return {
        contractVersion: "1.0",

        analysisType: "CHANGE",

        compositionId:
            `COMPOSITION-${indexCode}`,

        indexCode,

        comparison: {
            startDate: "2026-07-15",
            endDate: "2026-08-15",
            startMean: 0.40,
            endMean: 0.52
        },

        absoluteChange: 0.12,

        percentageChange: 30,

        percentageChangeStatus:
            "normal",

        direction: "increase"
    };
}

function createValidEvidence() {
    return createCropConditionEvidence({
        indexObservations: [
            createTemporalObservation("NDVI"),
            createTemporalObservation("NDMI")
        ],

        classifications: [
            createClassification("NDVI"),
            createClassification("NDMI"),
            createClassification("NDWI")
        ],

        temporalChanges: [
            createTemporalChange("NDVI"),
            createTemporalChange("NDMI")
        ],

        spatialContext: {
            testArea: "phase-6.4.2"
        },

        processingContext: {
            source: "test"
        },

        metadata: {
            test: true
        }
    });
}

test(
    "valid crop condition evidence produces a valid interpretation",
    () => {
        const evidence =
            createValidEvidence();

        const result =
            processCropConditionInterpretation(
                evidence
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.interpretationType,
            "CROP_CONDITION_INTERPRETATION"
        );

        assert.equal(
            result.indexInterpretations.length,
            2
        );

        assert.equal(
            result.temporalInterpretations.length,
            2
        );

        assert.equal(
            result.overallInterpretation
                .interpretationStatus,
            "calibration_required"
        );
    }
);

test(
    "invalid evidence envelope is rejected",
    () => {
        const evidence = {
            contractVersion: "1.0",
            assessmentType:
                "CROP_CONDITION_EVIDENCE",
            indexObservations: [],
            classifications: [],
            temporalChanges: [],
            spatialContext: {},
            processingContext: {}
        };

        assert.throws(
            () =>
                processCropConditionInterpretation(
                    evidence
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_CROP_CONDITION_EVIDENCE"
                );

                return true;
            }
        );
    }
);

test(
    "invalid temporal observation is rejected",
    () => {
        const evidence =
            createValidEvidence();

        delete evidence.indexObservations[0]
            .statistics;

        assert.throws(
            () =>
                processCropConditionInterpretation(
                    evidence
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_AUTHORITATIVE_CROP_CONDITION_EVIDENCE"
                );

                assert.ok(
                    error.validationErrors.some(
                        item =>
                            item.includes(
                                "indexObservations[0]"
                            )
                    )
                );

                return true;
            }
        );
    }
);

test(
    "invalid raster classification is rejected",
    () => {
        const evidence =
            createValidEvidence();

        delete evidence.classifications[0]
            .classification;

        assert.throws(
            () =>
                processCropConditionInterpretation(
                    evidence
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_AUTHORITATIVE_CROP_CONDITION_EVIDENCE"
                );

                assert.ok(
                    error.validationErrors.some(
                        item =>
                            item.includes(
                                "classifications[0]"
                            )
                    )
                );

                return true;
            }
        );
    }
);

test(
    "invalid temporal change is rejected",
    () => {
        const evidence =
            createValidEvidence();

        evidence.temporalChanges[0]
            .direction = "trend";

        assert.throws(
            () =>
                processCropConditionInterpretation(
                    evidence
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_AUTHORITATIVE_CROP_CONDITION_EVIDENCE"
                );

                assert.ok(
                    error.validationErrors.some(
                        item =>
                            item.includes(
                                "temporalChanges[0]"
                            )
                    )
                );

                return true;
            }
        );
    }
);

test(
    "NDMI remains contextual evidence rather than a crop-health score",
    () => {
        const evidence =
            createValidEvidence();

        const result =
            processCropConditionInterpretation(
                evidence
            );

        const ndmi =
            result.indexInterpretations.find(
                item =>
                    item.indexCode === "NDMI"
            );

        assert.ok(ndmi);

        assert.equal(
            ndmi.interpretationStatus,
            "context_dependent"
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                ndmi,
                "healthScore"
            ),
            false
        );
    }
);

test(
    "NDWI is preserved as evidence without plant-moisture interpretation",
    () => {
        const evidence =
            createValidEvidence();

        const result =
            processCropConditionInterpretation(
                evidence
            );

        assert.equal(
            result.metadata
                .classificationEvidenceCount,
            3
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                result,
                "irrigationRequired"
            ),
            false
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                result,
                "waterStress"
            ),
            false
        );
    }
);

test(
    "temporal increase preserves calculated absolute change",
    () => {
        const evidence =
            createValidEvidence();

        const result =
            processCropConditionInterpretation(
                evidence
            );

        const ndviChange =
            result.temporalInterpretations.find(
                item =>
                    item.indexCode === "NDVI"
            );

        assert.equal(
            ndviChange.direction,
            "increase"
        );

        assert.equal(
            ndviChange.changeMagnitude,
            0.12
        );

        assert.equal(
            ndviChange.interpretationStatus,
            "context_dependent"
        );
    }
);

test(
    "authoritative evidence validator returns no errors for valid evidence",
    () => {
        const evidence =
            createValidEvidence();

        const errors =
            validateAuthoritativeEvidence(
                evidence
            );

        assert.deepEqual(
            errors,
            []
        );
    }
);

test(
    "generated interpretation contains required scientific contexts",
    () => {
        const evidence =
            createValidEvidence();

        const result =
            processCropConditionInterpretation(
                evidence
            );

        assert.deepEqual(
            result.spatialContext,
            evidence.spatialContext
        );

        assert.deepEqual(
            result.processingContext,
            evidence.processingContext
        );
    }
);
