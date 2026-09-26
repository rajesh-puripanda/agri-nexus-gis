"use strict";

// ============================================================
// server/tests/temporalAnalysisWorkflowIntegration.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.18
// Temporal Analysis Workflow Integration Validation
//
// Validates:
//
//   TemporalAnalysisWorkflowRequest Factory
//              |
//              v
//   Temporal Analysis Workflow Service
//              |
//              v
//   TemporalAnalysisWorkflowResult Contract
//
// This suite intentionally does not introduce new scientific
// calculations. CHANGE remains authoritative in the existing
// temporalChangeCalculationService.
//
// ============================================================

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createTemporalAnalysisWorkflowRequest
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowRequestContract"
);

const {
    validateTemporalAnalysisWorkflowResult
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowResultContract"
);

const {
    processTemporalAnalysisWorkflow
} = require(
    "../services/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowService"
);


// ============================================================
// Test fixtures
// ============================================================

function createObservation(
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
            name:
                "Normalized Difference Vegetation Index",
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
            method: "phase-5.1.7.18-test"
        }
    };
}

function createValidComposition() {
    return {
        contractVersion: "1.0",

        compositionId:
            "COMPOSITION-INTEGRATION-001",

        indexCode:
            "NDVI",

        observations: [
            createObservation(
                "2026-01-10",
                0.40
            ),
            createObservation(
                "2026-02-10",
                0.55
            )
        ],

        temporalContext: {
            startDate:
                "2026-01-10",

            endDate:
                "2026-02-10",

            observationCount:
                2
        },

        spatialContext: {
            coordinateReferenceSystem:
                "EPSG:4326"
        },

        processingContext: {
            method:
                "phase-5.1.7.18-test"
        }
    };
}

function createValidRequest(
    overrides = {}
) {
    return createTemporalAnalysisWorkflowRequest({
        contractVersion: "1.0",

        analysisId:
            "TEMPORAL-INTEGRATION-001",

        analysisType:
            "CHANGE",

        composition:
            createValidComposition(),

        ...overrides
    });
}


// ============================================================
// 1. Complete contract-to-service-to-result path
// ============================================================

test(
    "executes the complete CHANGE contract-to-service-to-result path",
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
            request.analysisId
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


// ============================================================
// 2. Analysis type normalization
// ============================================================

test(
    "preserves normalized CHANGE analysis type through the full pipeline",
    async () => {
        const request =
            createValidRequest({
                analysisType:
                    " change "
            });

        assert.equal(
            request.analysisType,
            "CHANGE"
        );

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


// ============================================================
// 3. Analysis identity
// ============================================================

test(
    "preserves analysis identity through the complete workflow",
    async () => {
        const request =
            createValidRequest({
                analysisId:
                    "CHANGE-INTEGRATION-ABC"
            });

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.equal(
            result.analysisId,
            "CHANGE-INTEGRATION-ABC"
        );

        assert.equal(
            result.result.compositionId,
            "COMPOSITION-INTEGRATION-001"
        );
    }
);


// ============================================================
// 4. Composition preservation
// ============================================================

test(
    "preserves the authoritative TemporalComposition",
    async () => {
        const request =
            createValidRequest();

        const original =
            structuredClone(
                request.composition
            );

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        assert.deepEqual(
            result.composition,
            original
        );

        assert.deepEqual(
            request.composition,
            original
        );
    }
);


// ============================================================
// 5. Scientific CHANGE result propagation
// ============================================================

test(
    "propagates the authoritative CHANGE calculation",
    async () => {
        const request =
            createValidRequest();

        const result =
            await processTemporalAnalysisWorkflow(
                request
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

        assert.ok(
            Math.abs(
                result.result.percentageChange - 37.5
            ) < 1e-10
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


// ============================================================
// 6. Zero-baseline integration
// ============================================================

test(
    "preserves zero-baseline semantics through the full pipeline",
    async () => {
        const composition =
            createValidComposition();

        composition.observations[0]
            .statistics.mean = 0;

        composition.observations[0]
            .statistics.minimum = -0.1;

        composition.observations[0]
            .statistics.maximum = 0.1;

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

        assert.equal(
            result.result.direction,
            "increase"
        );
    }
);


// ============================================================
// 7. Workflow boundary validation
// ============================================================

test(
    "rejects an invalid request before producing a workflow result",
    async () => {
        assert.throws(
            () =>
                createTemporalAnalysisWorkflowRequest({
                    contractVersion: "1.0",
                    analysisId: "",
                    analysisType: "CHANGE",
                    composition:
                        createValidComposition()
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST"
                );

                return true;
            }
        );
    }
);


// ============================================================
// 8. Result contract validation
// ============================================================

test(
    "workflow output passes the authoritative result contract",
    async () => {
        const request =
            createValidRequest();

        const result =
            await processTemporalAnalysisWorkflow(
                request
            );

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );

        assert.equal(
            validation.analysisType,
            "CHANGE"
        );
    }
);
