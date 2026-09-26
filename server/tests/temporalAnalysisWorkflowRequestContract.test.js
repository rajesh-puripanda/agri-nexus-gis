"use strict";

// ============================================================
// server/tests/temporalAnalysisWorkflowRequestContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.6.1
// Temporal Analysis Workflow Request Contract Tests
//
// Contract version: 1.0
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalAnalysisWorkflowRequest,
    createTemporalAnalysisWorkflowRequest
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowRequestContract"
);

const {
    createTemporalComposition
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalCompositionContract"
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

function createValidComposition(
    overrides = {}
) {
    const observations = [
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
    ];

    return {
        contractVersion: "1.0",

        compositionId:
            "NDVI-SERIES-001",

        indexCode:
            "NDVI",

        observations,

        temporalContext: {
            startDate:
                "2026-06-01",
            endDate:
                "2026-07-01",
            observationCount:
                3
        },

        spatialContext: {
            crs:
                "EPSG:4326"
        },

        processingContext: {
            processingVersion:
                "1.0"
        },

        ...overrides
    };
}


function createValidRequest(
    overrides = {}
) {
    return {
        contractVersion: "1.0",

        analysisId:
            "TEMPORAL-ANALYSIS-001",

        analysisType:
            "TREND",

        composition:
            createValidComposition(),

        ...overrides
    };
}
test(
    "temporal analysis workflow request contract version is 1.0",
    () => {
        assert.equal(
            TEMPORAL_ANALYSIS_WORKFLOW_REQUEST_CONTRACT_VERSION,
            "1.0"
        );
    }
);


// ============================================================
// 2. FIELD DEFINITIONS
// ============================================================

test(
    "required and optional fields are defined correctly",
    () => {
        assert.deepEqual(
            REQUIRED_FIELDS,
            [
                "contractVersion",
                "analysisId",
                "analysisType",
                "composition"
            ]
        );

        assert.deepEqual(
            OPTIONAL_FIELDS,
            [
                "parameters",
                "metadata"
            ]
        );
    }
);


// ============================================================
// 3. VALID REQUEST
// ============================================================

test(
    "valid temporal analysis workflow request is accepted",
    () => {
        const request =
            createValidRequest();

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
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
            "TREND"
        );
    }
);


// ============================================================
// 4. ANALYSIS TYPE NORMALIZATION
// ============================================================

test(
    "analysisType is normalized to uppercase",
    () => {
        const request =
            createValidRequest({
                analysisType:
                    "  trend  "
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.analysisType,
            "TREND"
        );

        const created =
            createTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            created.analysisType,
            "TREND"
        );
    }
);


// ============================================================
// 5. COMPOSITION VALIDATION DELEGATION
// ============================================================

test(
    "composition is validated through the temporal composition contract",
    () => {
        const request =
            createValidRequest();

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            true
        );
    }
);


// ============================================================
// 6. INVALID COMPOSITION
// ============================================================

test(
    "invalid composition is rejected",
    () => {
        const request =
            createValidRequest({
                composition: {
                    contractVersion: "1.0",
                    compositionId: "COMP-INVALID",
                    indexCode: "NDVI"
                }
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
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


// ============================================================
// 7. INVALID ANALYSIS ID
// ============================================================

test(
    "missing or empty analysisId is rejected",
    () => {
        const request =
            createValidRequest({
                analysisId: "   "
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.includes(
                "analysisId must be a non-empty string."
            )
        );
    }
);


// ============================================================
// 8. INVALID ANALYSIS TYPE
// ============================================================

test(
    "missing or empty analysisType is rejected",
    () => {
        const request =
            createValidRequest({
                analysisType: ""
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.includes(
                "analysisType must be a non-empty string."
            )
        );
    }
);


// ============================================================
// 9. INVALID PARAMETERS
// ============================================================

test(
    "parameters must be a plain object when supplied",
    () => {
        const request =
            createValidRequest({
                parameters: []
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.includes(
                "parameters must be a plain object when provided."
            )
        );
    }
);


// ============================================================
// 10. INVALID METADATA
// ============================================================

test(
    "metadata must be a plain object when supplied",
    () => {
        const request =
            createValidRequest({
                metadata: "invalid"
            });

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.includes(
                "metadata must be a plain object when provided."
            )
        );
    }
);


// ============================================================
// 11. FACTORY TYPED ERROR
// ============================================================

test(
    "factory throws typed error for invalid request",
    () => {
        assert.throws(
            () =>
                createTemporalAnalysisWorkflowRequest({
                    contractVersion: "1.0",
                    analysisId: "",
                    analysisType: "TREND",
                    composition: createValidComposition()
                }),
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


// ============================================================
// 12. FACTORY PRESERVATION AND IMMUTABILITY
// ============================================================

test(
    "factory preserves supplied composition, parameters and metadata",
    () => {
        const composition =
            createValidComposition();

        const parameters = {
            method: "LINEAR",
            minimumObservations: 2
        };

        const metadata = {
            source: "phase-5.1.6.1-test"
        };

        const request = {
            contractVersion: "1.0",
            analysisId: "ANALYSIS-002",
            analysisType: " trend ",
            composition,
            parameters,
            metadata
        };

        const originalComposition =
            JSON.parse(
                JSON.stringify(composition)
            );

        const originalParameters =
            JSON.parse(
                JSON.stringify(parameters)
            );

        const originalMetadata =
            JSON.parse(
                JSON.stringify(metadata)
            );

        const created =
            createTemporalAnalysisWorkflowRequest(
                request
            );

        assert.equal(
            created.analysisType,
            "TREND"
        );

        assert.deepEqual(
            created.composition,
            composition
        );

        assert.deepEqual(
            created.parameters,
            parameters
        );

        assert.deepEqual(
            created.metadata,
            metadata
        );

        assert.deepEqual(
            composition,
            originalComposition
        );

        assert.deepEqual(
            parameters,
            originalParameters
        );

        assert.deepEqual(
            metadata,
            originalMetadata
        );
    }
);


