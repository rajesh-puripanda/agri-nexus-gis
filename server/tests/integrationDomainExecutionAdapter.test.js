"use strict";

// ============================================================
// server/tests/integrationDomainExecutionAdapter.test.js
//
// AgriNexus GIS
//
// Phase 8.15.12
// Integration Domain Execution Adapter Tests
//
// Purpose:
// Verifies that resolved integration-domain service arguments
// are dispatched to the authoritative domain entry points.
//
// The tests verify:
// - all eight integration domains are supported;
// - authoritative entry points are reachable;
// - service arguments are mapped correctly;
// - temporal observation requests execute sequentially;
// - authoritative results are preserved;
// - adapter validation is deterministic;
// - authoritative errors are propagated.
//
// Temporal observation execution is isolated with a test-only
// module stub because the adapter test verifies dispatch and
// result preservation, while the temporal workflow itself is
// tested separately by the temporal workflow integration tests.
// ============================================================

const {
    test,
    after
} = require("node:test");

const assert = require("node:assert/strict");
const { pool } = require("../config/db");

// ============================================================
// Integration domain contract
// ============================================================

const {
    INTEGRATION_DOMAINS,
    DOMAIN_DEFINITIONS
} = require(
    "../scientific/integration/integrationDomainResolutionContract"
);

// ============================================================
// Test-only temporal observation stub
// ============================================================
//
// The production adapter imports the authoritative temporal
// observation workflow at module load time.
//
// Therefore the test installs the stub BEFORE loading the
// adapter. This verifies the adapter's actual dispatch boundary
// without requiring physical GeoTIFF input files.
//

const observationWorkflowPath = require.resolve(
    "../services/remoteSensing/temporal/temporalObservationWorkflowService"
);

const adapterPath = require.resolve(
    "../scientific/integration/integrationDomainExecutionAdapter"
);

const originalObservationWorkflowModule =
    require.cache[
        observationWorkflowPath
    ];

const originalAdapterModule =
    require.cache[
        adapterPath
    ];

const temporalObservationCalls = [];

const temporalObservationResultOne = {
    marker:
        "TEMPORAL_OBSERVATION_RESULT_ONE"
};

const temporalObservationResultTwo = {
    marker:
        "TEMPORAL_OBSERVATION_RESULT_TWO"
};

function installTemporalObservationStub() {
    require.cache[
        observationWorkflowPath
    ] = {
        id:
            observationWorkflowPath,

        filename:
            observationWorkflowPath,

        loaded:
            true,

        exports: {
            processTemporalObservationWorkflow:
                async request => {
                    temporalObservationCalls.push(
                        request
                    );

                    const callIndex =
                        temporalObservationCalls.length;

                    if (callIndex === 1) {
                        return temporalObservationResultOne;
                    }

                    if (callIndex === 2) {
                        return temporalObservationResultTwo;
                    }

                    return {
                        marker:
                            `TEMPORAL_OBSERVATION_RESULT_${callIndex}`
                    };
                }
        }
    };
}

function restoreTemporalObservationStub() {
    if (originalObservationWorkflowModule) {
        require.cache[
            observationWorkflowPath
        ] =
            originalObservationWorkflowModule;
    } else {
        delete require.cache[
            observationWorkflowPath
        ];
    }

    if (originalAdapterModule) {
        require.cache[
            adapterPath
        ] =
            originalAdapterModule;
    } else {
        delete require.cache[
            adapterPath
        ];
    }
}

installTemporalObservationStub();

// ============================================================
// Adapter
// ============================================================
//
// Loaded AFTER the temporal observation stub is installed.
//

const {
    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_VERSION,
    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_TYPE,
    ADAPTER_ERROR_CODES,
    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_METADATA,
    executeIntegrationDomain
} = require(
    "../scientific/integration/integrationDomainExecutionAdapter"
);

// Restore the module cache after this test file completes.

after(async () => {
    restoreTemporalObservationStub();
    await pool.end();
});

// ============================================================
// Test helpers
// ============================================================

function createTemporalObservationRequest(
    observationDate
) {
    return {
        contractVersion:
            "1.0",

        temporalIdentity: {
            observationDate,

            acquisitionDate:
                `${observationDate}T05:30:00Z`,

            sensor:
                "Sentinel-2",

            sceneId:
                `S2A_TEST_${observationDate.replaceAll("-", "")}_001`
        },

        rasterIdentity: {
            rasterId:
                `RASTER-${observationDate}`
        },

        workflowRequest: {
            inputPath:
                `D:\\AgriNexus\\input\\scene_${observationDate.replaceAll("-", "")}.tif`,

            indexCode:
                "NDVI",

            bandMapping: {
                nir: 1,
                red: 2
            },

            outputDirectory:
                "D:\\AgriNexus\\outputs",

            noData:
                -9999,

            parameters: {
                example:
                    true
            },

            processingContext: {
                source:
                    "Phase-8.15.12-adapter-test"
            },

            spatialContext: {
                coordinateReferenceSystem:
                    "EPSG:4326",

                source:
                    "adapter-test"
            }
        }
    };
}

// ============================================================
// Contract identity
// ============================================================

test(
    "adapter contract version and type are defined",
    () => {
        assert.equal(
            INTEGRATION_DOMAIN_EXECUTION_ADAPTER_VERSION,
            "1.0"
        );

        assert.equal(
            INTEGRATION_DOMAIN_EXECUTION_ADAPTER_TYPE,
            "INTEGRATION_DOMAIN_EXECUTION_ADAPTER"
        );
    }
);

test(
    "adapter metadata exposes all eight integration domains",
    () => {
        assert.deepEqual(
            INTEGRATION_DOMAIN_EXECUTION_ADAPTER_METADATA
                .supportedDomains,
            INTEGRATION_DOMAINS
        );
    }
);

test(
    "all eight domain definitions have authoritative entry points",
    () => {
        for (
            const domain
            of INTEGRATION_DOMAINS
        ) {
            assert.equal(
                typeof DOMAIN_DEFINITIONS[
                    domain
                ].authoritativeEntryPoint,
                "string"
            );

            assert.ok(
                DOMAIN_DEFINITIONS[
                    domain
                ].authoritativeEntryPoint.length > 0
            );
        }
    }
);

// ============================================================
// Invalid domain handling
// ============================================================

test(
    "adapter rejects an unsupported integration domain",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "UNSUPPORTED_DOMAIN",
                    {}
                ),
            error => {
                assert.equal(
                    error.name,
                    "IntegrationDomainExecutionAdapterError"
                );

                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_DOMAIN
                );

                return true;
            }
        );
    }
);

test(
    "adapter rejects a missing domain",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    undefined,
                    {}
                ),
            error => {
                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_DOMAIN
                );

                return true;
            }
        );
    }
);

test(
    "adapter rejects non-object service arguments",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "SOIL_INTELLIGENCE",
                    null
                ),
            error => {
                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_SERVICE_ARGUMENTS
                );

                return true;
            }
        );
    }
);

test(
    "adapter rejects array service arguments",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "SOIL_INTELLIGENCE",
                    []
                ),
            error => {
                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_SERVICE_ARGUMENTS
                );

                return true;
            }
        );
    }
);

// ============================================================
// Soil Intelligence
// ============================================================

test(
    "SOIL_INTELLIGENCE executes the authoritative soil entry point",
    async () => {
        const sample = {
            sampleId:
                "S-001",

            pH:
                6.8,

            nitrogen:
                215,

            phosphorus:
                18,

            potassium:
                240,

            organicCarbon:
                0.72,

            electricalConductivity:
                0.35,

            soilTexture:
                "Loamy"
        };

        const result =
            await executeIntegrationDomain(
                "SOIL_INTELLIGENCE",
                {
                    sample
                }
            );

        assert.ok(
            result !== undefined
        );

        assert.equal(
            typeof result,
            "object"
        );
    }
);

// ============================================================
// Spatial Intelligence
// ============================================================

test(
    "SPATIAL_INTELLIGENCE executes the authoritative spatial entry point",
    async () => {
        const result =
            await executeIntegrationDomain(
                "SPATIAL_INTELLIGENCE",
                {
                    latitude:
                        17.71234,

                    longitude:
                        83.30125
                }
            );

        assert.ok(
            result !== undefined
        );

        assert.equal(
            typeof result,
            "object"
        );
    }
);

// ============================================================
// Crop Suitability
// ============================================================

test(
    "CROP_SUITABILITY passes sample and prerequisite analysis",
    async () => {
        const sample = {
            soil_texture:
                "Loamy"
        };

        // Canonical soil-analysis structure used by
        // cropSuitabilityService.test.js.

        const analysis = {
            values: {
                pH: {
                    value:
                        6.8,

                    unit:
                        "",

                    classification:
                        "Neutral"
                },

                nitrogen: {
                    value:
                        300,

                    unit:
                        "kg/ha",

                    classification:
                        "Medium"
                },

                phosphorus: {
                    value:
                        20,

                    unit:
                        "kg/ha",

                    classification:
                        "Medium"
                },

                potassium: {
                    value:
                        250,

                    unit:
                        "kg/ha",

                    classification:
                        "Medium"
                },

                organicCarbon: {
                    value:
                        0.72,

                    unit:
                        "%",

                    classification:
                        "Medium"
                },

                electricalConductivity: {
                    value:
                        0.35,

                    unit:
                        "dS/m",

                    classification:
                        "Non-saline"
                }
            },

            overallFertility:
                "Moderate / Good",

            soilTexture:
                "Loamy"
        };

        const result =
            await executeIntegrationDomain(
                "CROP_SUITABILITY",
                {
                    sample,
                    analysis
                }
            );

        assert.ok(
            result !== undefined
        );
    }
);

// ============================================================
// Fertility Zoning
// ============================================================

test(
    "FERTILITY_ZONING passes options to the authoritative zoning service",
    async () => {
        const result =
            await executeIntegrationDomain(
                "FERTILITY_ZONING",
                {
                    options: {}
                }
            );

        assert.ok(
            result !== undefined
        );
    }
);

// ============================================================
// Historical Context
// ============================================================

test(
    "HISTORICAL_CONTEXT passes sampleId and parameter",
    async () => {
        const result =
            await executeIntegrationDomain(
                "HISTORICAL_CONTEXT",
                {
                    sampleId:
                        "S-001",

                    parameter:
                        "pH"
                }
            );

        assert.ok(
            result !== undefined
        );
    }
);

// ============================================================
// Temporal Observation
// ============================================================

test(
    "TEMPORAL_OBSERVATION rejects an empty request array",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "TEMPORAL_OBSERVATION",
                    {
                        observationRequests:
                            []
                    }
                ),
            error => {
                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_TEMPORAL_OBSERVATION_REQUESTS
                );

                return true;
            }
        );
    }
);

test(
    "TEMPORAL_OBSERVATION rejects a non-array request collection",
    async () => {
        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "TEMPORAL_OBSERVATION",
                    {
                        observationRequests:
                            {}
                    }
                ),
            error => {
                assert.equal(
                    error.code,
                    ADAPTER_ERROR_CODES
                        .INVALID_TEMPORAL_OBSERVATION_REQUESTS
                );

                return true;
            }
        );
    }
);

test(
    "TEMPORAL_OBSERVATION executes multiple requests in input order and preserves results",
    async () => {
        temporalObservationCalls.length =
            0;

        const firstRequest =
            createTemporalObservationRequest(
                "2026-09-20"
            );

        const secondRequest =
            createTemporalObservationRequest(
                "2026-09-25"
            );

        const result =
            await executeIntegrationDomain(
                "TEMPORAL_OBSERVATION",
                {
                    observationRequests: [
                        firstRequest,
                        secondRequest
                    ]
                }
            );

        // ----------------------------------------------------
        // Result contract
        // ----------------------------------------------------

        assert.ok(
            Array.isArray(result)
        );

        assert.equal(
            result.length,
            2
        );

        // ----------------------------------------------------
        // Sequential input order
        // ----------------------------------------------------

        assert.equal(
            temporalObservationCalls.length,
            2
        );

        assert.strictEqual(
            temporalObservationCalls[0],
            firstRequest
        );

        assert.strictEqual(
            temporalObservationCalls[1],
            secondRequest
        );

        // ----------------------------------------------------
        // Authoritative result preservation
        // ----------------------------------------------------

        assert.strictEqual(
            result[0],
            temporalObservationResultOne
        );

        assert.strictEqual(
            result[1],
            temporalObservationResultTwo
        );
    }
);

// ============================================================
// Temporal Composition
// ============================================================

test(
    "TEMPORAL_COMPOSITION dispatches the resolved request and preserves authoritative validation errors",
    async () => {
        const request = {
            contractVersion:
                "1.0",

            compositionId:
                "COMPOSITION-INTEGRATION-001",

            indexCode:
                "NDVI",

            observations:
                [],

            temporalContext: {
                startDate:
                    "2026-09-20",

                endDate:
                    "2026-09-25",

                observationCount:
                    0
            },

            spatialContext: {
                coordinateReferenceSystem:
                    "EPSG:4326"
            },

            processingContext: {
                method:
                    "phase-8.15.18-adapter-test"
            }
        };

        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "TEMPORAL_COMPOSITION",
                    {
                        request
                    }
                ),
            error => {
                assert.equal(
                    error.name,
                    "TypeError"
                );

                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                assert.ok(
                    error.validationErrors.length > 0
                );

                assert.match(
                    error.message,
                    /^Invalid temporal composition workflow request: /
                );

                return true;
            }
        );
    }
);

// ============================================================
// Temporal Analysis
// ============================================================

test(
    "TEMPORAL_ANALYSIS dispatches the resolved request and preserves authoritative validation errors",
    async () => {
        const request = {
            contractVersion:
                "1.0",

            analysisId:
                "ANALYSIS-INTEGRATION-001",

            analysisType:
                "trend",

            composition: {
                contractVersion:
                    "1.0",

                compositionId:
                    "COMPOSITION-INTEGRATION-001",

                indexCode:
                    "NDVI",

                observations:
                    [],

                temporalContext: {
                    startDate:
                        "2026-09-20",

                    endDate:
                        "2026-09-25",

                    observationCount:
                        0
                },

                spatialContext: {
                    coordinateReferenceSystem:
                        "EPSG:4326"
                },

                processingContext: {
                    method:
                        "phase-8.15.18-adapter-test"
                }
            }
        };

        await assert.rejects(
            () =>
                executeIntegrationDomain(
                    "TEMPORAL_ANALYSIS",
                    {
                        request
                    }
                ),
            error => {
                assert.equal(
                    error.name,
                    "TypeError"
                );

                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                assert.ok(
                    error.validationErrors.length > 0
                );

                assert.match(
                    error.message,
                    /^Invalid temporal analysis workflow request: /
                );

                return true;
            }
        );
    }
);
