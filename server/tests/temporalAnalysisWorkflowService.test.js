"use strict";

// ============================================================
// server/tests/temporalAnalysisWorkflowService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.17
// Temporal Analysis Workflow Service  Focused Tests
//
// ============================================================

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    processTemporalAnalysisWorkflow,
    TEMPORAL_ANALYSIS_WORKFLOW_SERVICE_VERSION
} = require(
    "../services/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowService"
);

function createValidObservation(
    observationDate,
    mean
) {
    return {
        contractVersion: "1.0",

        observation: {
            observationDate,
            acquisitionDate:
                `${observationDate}T10:00:00Z`,
            sensor: "SENTINEL-2",
            sceneId:
                `SCENE-${observationDate}`,
            indexCode: "NDVI"
        },

        raster: {
            rasterId:
                `RASTER-${observationDate}`,
            width: 2,
            height: 2,
            pixelCount: 4
        },

        index: {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: {
                min: -1,
                max: 1
            }
        },

        statistics: {
            validPixelCount: 4,
            noDataPixelCount: 0,
            minimum: mean - 0.1,
            maximum: mean + 0.1,
            mean
        },

        spatialContext: {
            coordinateReferenceSystem:
                "EPSG:4326"
        },

        processingContext: {
            method: "test"
        }
    };
}

function createValidComposition() {
    return {
        contractVersion: "1.0",

        compositionId:
            "COMPOSITION-CHANGE-001",

        indexCode:
            "NDVI",

        observations: [
            createValidObservation(
                "2025-01-10",
                0.40
            ),
            createValidObservation(
                "2025-02-10",
                0.55
            )
        ],

        temporalContext: {
            startDate:
                "2025-01-10",

            endDate:
                "2025-02-10",

            observationCount:
                2
        },

        spatialContext: {
            coordinateReferenceSystem:
                "EPSG:4326"
        },

        processingContext: {
            method:
                "temporal-test"
        }
    };
}

function setObservationMean(
    observation,
    mean
) {
    observation.statistics.mean =
        mean;

    observation.statistics.minimum =
        Math.min(
            mean - 0.1,
            mean
        );

    observation.statistics.maximum =
        Math.max(
            mean + 0.1,
            mean
        );
}

function createValidRequest(
    overrides = {}
) {
    return {
        contractVersion: "1.0",

        analysisId:
            "TEMPORAL-ANALYSIS-001",

        analysisType:
            "CHANGE",

        composition:
            createValidComposition(),

        ...overrides
    };
}

// ------------------------------------------------------------
// Service version
// ------------------------------------------------------------

test(
    "exports temporal analysis workflow service version 1.0",
    () => {
        assert.equal(
            TEMPORAL_ANALYSIS_WORKFLOW_SERVICE_VERSION,
            "1.0"
        );
    }
);

// ------------------------------------------------------------
// CHANGE happy path
// ------------------------------------------------------------

test(
    "processes a valid CHANGE workflow",
    async () => {
        const request =
            createValidRequest();

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.analysisId,
            "TEMPORAL-ANALYSIS-001"
        );

        assert.equal(
            result.analysisType,
            "CHANGE"
        );

        assert.deepEqual(
            result.composition,
            request.composition
        );

        assert.equal(
            result.result.analysisType,
            "CHANGE"
        );

        assert.equal(
            result.result.compositionId,
            "COMPOSITION-CHANGE-001"
        );

        assert.equal(
            result.result.indexCode,
            "NDVI"
        );

        assert.equal(
            result.result.comparison.startMean,
            0.40
        );

        assert.equal(
            result.result.comparison.endMean,
            0.55
        );

        assert.ok(
            Math.abs(
                result.result.absoluteChange - 0.15
            ) < 1e-12
        );

        assert.equal(
            result.result.direction,
            "increase"
        );
    }
);

// ------------------------------------------------------------
// Analysis type normalization
// ------------------------------------------------------------

test(
    "normalizes CHANGE analysis type before dispatch",
    async () => {
        const request =
            createValidRequest({
                analysisType:
                    "change"
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.analysisType,
            "CHANGE"
        );

        assert.equal(
            result.result.analysisType,
            "CHANGE"
        );
    }
);

// ------------------------------------------------------------
// Analysis identity preservation
// ------------------------------------------------------------

test(
    "preserves the workflow analysis ID",
    async () => {
        const request =
            createValidRequest({
                analysisId:
                    "CHANGE-ANALYSIS-ABC"
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.analysisId,
            "CHANGE-ANALYSIS-ABC"
        );
    }
);

// ------------------------------------------------------------
// Composition preservation
// ------------------------------------------------------------

test(
    "preserves the supplied TemporalComposition",
    async () => {
        const request =
            createValidRequest();

        const originalComposition =
            structuredClone(
                request.composition
            );

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.deepEqual(
            result.composition,
            originalComposition
        );

        assert.deepEqual(
            request.composition,
            originalComposition
        );
    }
);

// ------------------------------------------------------------
// Scientific result verification
// ------------------------------------------------------------

test(
    "returns the authoritative temporal CHANGE calculation",
    async () => {
        const request =
            createValidRequest();

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.result.absoluteChange,
            0.15000000000000002
        );

        assert.equal(
            result.result.percentageChange,
            37.50000000000001
        );

        assert.equal(
            result.result.percentageChangeStatus,
            "normal"
        );

        assert.equal(
            result.result.direction,
            "increase"
        );
    }
);

// ------------------------------------------------------------
// Zero baseline behavior
// ------------------------------------------------------------

test(
    "preserves zero-baseline CHANGE semantics",
    async () => {
        const composition =
            createValidComposition();

        setObservationMean(
            composition.observations[0],
            0
        );

        const request =
            createValidRequest({
                composition
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.result.absoluteChange,
            0.55
        );

        assert.equal(
            result.result.percentageChange,
            null
        );

        assert.equal(
            result.result.percentageChangeStatus,
            "undefined_zero_baseline"
        );
    }
);

// ------------------------------------------------------------
// Invalid request
// ------------------------------------------------------------

test(
    "rejects an invalid workflow request",
    async () => {
        const request =
            createValidRequest({
                analysisId: ""
            });

        await assert.rejects(
            () =>
                processTemporalAnalysisWorkflow(
                    request
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST"
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

// ------------------------------------------------------------
// Unsupported analysis type
// ------------------------------------------------------------

test(
    "rejects TREND because TREND is not implemented",
    async () => {
        const request =
            createValidRequest({
                analysisType:
                    "TREND"
            });

        await assert.rejects(
            () =>
                processTemporalAnalysisWorkflow(
                    request
                ),
            error => {
                assert.equal(
                    error.code,
                    "UNSUPPORTED_TEMPORAL_ANALYSIS_TYPE"
                );

                assert.equal(
                    error.analysisType,
                    "TREND"
                );

                return true;
            }
        );
    }
);

// ------------------------------------------------------------
// Unsupported arbitrary type
// ------------------------------------------------------------

test(
    "rejects an unsupported temporal analysis type",
    async () => {
        const request =
            createValidRequest({
                analysisType:
                    "UNKNOWN_ANALYSIS"
            });

        await assert.rejects(
            () =>
                processTemporalAnalysisWorkflow(
                    request
                ),
            error => {
                assert.equal(
                    error.code,
                    "UNSUPPORTED_TEMPORAL_ANALYSIS_TYPE"
                );

                assert.equal(
                    error.analysisType,
                    "UNKNOWN_ANALYSIS"
                );

                return true;
            }
        );
    }
);

// ------------------------------------------------------------
// Insufficient observations
// ------------------------------------------------------------

test(
    "propagates the CHANGE scientific observation requirement",
    async () => {
        const composition =
            createValidComposition();

        composition.observations =
            [
                composition.observations[0]
            ];

        composition.temporalContext = {
            startDate:
                "2025-01-10",

            endDate:
                "2025-01-10",

            observationCount:
                1
        };

        const request =
            createValidRequest({
                composition
            });

        await assert.rejects(
            () =>
                processTemporalAnalysisWorkflow(
                    request
                ),
            error => {
                assert.equal(
                    error.code,
                    "INSUFFICIENT_TEMPORAL_OBSERVATIONS"
                );

                return true;
            }
        );
    }
);

// ------------------------------------------------------------
// Zero-change behavior
// ------------------------------------------------------------

test(
    "returns no_change when first and last means are equal",
    async () => {
        const composition =
            createValidComposition();

        setObservationMean(
            composition.observations[1],
            0.40
        );

        const request =
            createValidRequest({
                composition
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.result.absoluteChange,
            0
        );

        assert.equal(
            result.result.direction,
            "no_change"
        );

        assert.equal(
            result.result.percentageChange,
            0
        );
    }
);

// ------------------------------------------------------------
// Decrease behavior
// ------------------------------------------------------------

test(
    "returns decrease for a negative CHANGE",
    async () => {
        const composition =
            createValidComposition();

        setObservationMean(
            composition.observations[1],
            0.20
        );

        const request =
            createValidRequest({
                composition
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.result.absoluteChange,
            -0.2
        );

        assert.equal(
            result.result.direction,
            "decrease"
        );
    }
);


