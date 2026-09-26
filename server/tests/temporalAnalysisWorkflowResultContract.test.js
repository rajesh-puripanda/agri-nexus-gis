"use strict";

// ============================================================
// server/tests/temporalAnalysisWorkflowResultContract.test.js
//
// AgriNexus GIS
//
// Phase 5.1.6.2
// Temporal Analysis Workflow Result Contract Tests
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION,
    REQUIRED_RESULT_FIELDS,
    OPTIONAL_RESULT_FIELDS,
    validateTemporalAnalysisWorkflowResult,
    createTemporalAnalysisWorkflowResultContract
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowResultContract"
);

function createObservation(
    date,
    suffix
) {
    return {
        contractVersion: "1.0",

        observation: {
            observationDate: date,
            acquisitionDate:
                `${date}T05:30:00Z`,
            sensor: "Sentinel-2",
            sceneId:
                `S2A_${suffix}`,
            indexCode: "NDVI"
        },

        raster: {
            rasterId:
                `NDVI_${suffix}`,
            width: 100,
            height: 100,
            pixelCount: 10000,
            noData: -9999
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
            validPixelCount: 9800,
            noDataPixelCount: 200,
            minimum: -0.45,
            maximum: 0.91,
            mean: 0.57
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        processingContext: {
            processingVersion: "1.0"
        }
    };
}

function createValidComposition() {
    return {
        contractVersion: "1.0",
        compositionId: "NDVI-SERIES-001",
        indexCode: "NDVI",

        observations: [
            createObservation(
                "2026-06-01",
                "20260601_001"
            ),
            createObservation(
                "2026-06-15",
                "20260615_001"
            ),
            createObservation(
                "2026-07-01",
                "20260701_001"
            )
        ],

        temporalContext: {
            startDate: "2026-06-01",
            endDate: "2026-07-01",
            observationCount: 3
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        processingContext: {
            processingVersion: "1.0"
        }
    };
}

function createValidResult(
    overrides = {}
) {
    return {
        contractVersion: "1.0",
        analysisId: "TEMPORAL-ANALYSIS-001",
        analysisType: "TREND",
        composition: createValidComposition(),
        result: {
            status: "complete"
        },
        ...overrides
    };
}

test(
    "exports contract version 1.0",
    () => {
        assert.equal(
            TEMPORAL_ANALYSIS_WORKFLOW_RESULT_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "exports required and optional result fields",
    () => {
        assert.deepEqual(
            REQUIRED_RESULT_FIELDS,
            [
                "contractVersion",
                "analysisId",
                "analysisType",
                "composition",
                "result"
            ]
        );

        assert.deepEqual(
            OPTIONAL_RESULT_FIELDS,
            ["metadata"]
        );
    }
);

test(
    "validates a complete temporal analysis workflow result",
    () => {
        const validation =
            validateTemporalAnalysisWorkflowResult(
                createValidResult()
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
    "normalizes analysis type during validation",
    () => {
        const result =
            createValidResult({
                analysisType: " trend "
            });

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.analysisType,
            "TREND"
        );
    }
);

test(
    "accepts optional metadata",
    () => {
        const result =
            createValidResult({
                metadata: {
                    workflowVersion: "1.0",
                    source: "temporal-analysis"
                }
            });

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            true
        );
    }
);

test(
    "rejects missing analysisId",
    () => {
        const result =
            createValidResult();

        delete result.analysisId;

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "analysisId"
                    )
            )
        );
    }
);

test(
    "rejects missing analysis result payload",
    () => {
        const result =
            createValidResult();

        delete result.result;

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "result"
                    )
            )
        );
    }
);

test(
    "rejects invalid temporal composition",
    () => {
        const result =
            createValidResult();

        result.composition.indexCode =
            "EVI";

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.startsWith(
                        "composition:"
                    )
            )
        );
    }
);

test(
    "rejects non-object result payload",
    () => {
        const result =
            createValidResult({
                result: "complete"
            });

        const validation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "result must be a plain object"
                    )
            )
        );
    }
);

test(
    "factory creates a validated result",
    () => {
        const result =
            createTemporalAnalysisWorkflowResultContract({
                analysisId:
                    "TEMPORAL-ANALYSIS-002",
                analysisType:
                    " change ",
                composition:
                    createValidComposition(),
                result: {
                    status: "complete"
                }
            });

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.analysisId,
            "TEMPORAL-ANALYSIS-002"
        );

        assert.equal(
            result.analysisType,
            "CHANGE"
        );

        assert.deepEqual(
            result.result,
            {
                status: "complete"
            }
        );
    }
);

test(
    "factory preserves metadata",
    () => {
        const metadata = {
            workflowVersion: "1.0",
            source: "test"
        };

        const result =
            createTemporalAnalysisWorkflowResultContract({
                analysisId:
                    "TEMPORAL-ANALYSIS-003",
                analysisType:
                    "SEASONAL",
                composition:
                    createValidComposition(),
                result: {
                    status: "complete"
                },
                metadata
            });

        assert.deepEqual(
            result.metadata,
            metadata
        );
    }
);

test(
    "factory rejects invalid result with typed error",
    () => {
        assert.throws(
            () =>
                createTemporalAnalysisWorkflowResultContract({
                    analysisId:
                        "TEMPORAL-ANALYSIS-004",
                    analysisType:
                        "TREND",
                    composition:
                        createValidComposition(),
                    result: null
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_RESULT"
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
    "validation does not mutate the supplied result",
    () => {
        const result =
            createValidResult({
                analysisType: " trend "
            });

        const before =
            JSON.stringify(result);

        validateTemporalAnalysisWorkflowResult(
            result
        );

        assert.equal(
            JSON.stringify(result),
            before
        );
    }
);
