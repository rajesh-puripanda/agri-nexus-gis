"use strict";

// ============================================================
// server/tests/integrationExecutionOrchestrator.test.js
//
// AgriNexus GIS
//
// Phase 8.15.14
// Integration Execution Orchestrator Tests
//
// Purpose:
// Verifies deterministic integration request orchestration:
// - request normalization;
// - dependency-aware domain resolution;
// - prerequisite ordering;
// - input-resolution blocking;
// - prerequisite result propagation;
// - authoritative adapter dispatch;
// - completed, blocked, and failed domain results;
// - final integration execution contract assembly.
//
// The domain execution adapter is isolated with a test-only
// module stub. Domain science and authoritative service behavior
// are tested separately by the adapter and domain test suites.
// ============================================================

const {
    test,
    after
} = require("node:test");

const assert = require("node:assert/strict");

// ============================================================
// Integration execution adapter stub
// ============================================================
//
// The production orchestrator imports the adapter at module load
// time. Install the stub before loading the orchestrator so the
// tests verify orchestration behavior without executing database,
// raster, or other domain infrastructure.
// ============================================================

const adapterPath = require.resolve(
    "../scientific/integration/integrationDomainExecutionAdapter"
);

const orchestratorPath = require.resolve(
    "../scientific/integration/integrationExecutionOrchestrator"
);

const originalAdapterModule =
    require.cache[
        adapterPath
    ];

const originalOrchestratorModule =
    require.cache[
        orchestratorPath
    ];

const executionCalls = [];

const authoritativeResults = {
    SOIL_INTELLIGENCE: {
        marker:
            "SOIL_RESULT"
    },

    SPATIAL_INTELLIGENCE: {
        marker:
            "SPATIAL_RESULT"
    },

    CROP_SUITABILITY: {
        marker:
            "CROP_RESULT"
    },

    FERTILITY_ZONING: {
        marker:
            "FERTILITY_RESULT"
    },

    HISTORICAL_CONTEXT: {
        marker:
            "HISTORICAL_RESULT"
    },

    TEMPORAL_OBSERVATION: {
        marker:
            "TEMPORAL_OBSERVATION_RESULT"
    },

    TEMPORAL_COMPOSITION: {
        marker:
            "TEMPORAL_COMPOSITION_RESULT"
    },

    TEMPORAL_ANALYSIS: {
        marker:
            "TEMPORAL_ANALYSIS_RESULT"
    }
};

function installAdapterStub() {
    require.cache[
        adapterPath
    ] = {
        id:
            adapterPath,

        filename:
            adapterPath,

        loaded:
            true,

        exports: {
            executeIntegrationDomain:
                async (
                    domain,
                    serviceArguments
                ) => {
                    executionCalls.push({
                        domain,
                        serviceArguments
                    });

                    return (
                        authoritativeResults[
                            domain
                        ]
                    );
                }
        }
    };
}

function installFailingAdapterStub() {
    require.cache[
        adapterPath
    ] = {
        id:
            adapterPath,

        filename:
            adapterPath,

        loaded:
            true,

        exports: {
            executeIntegrationDomain:
                async (
                    domain,
                    serviceArguments
                ) => {
                    executionCalls.push({
                        domain,
                        serviceArguments
                    });

                    if (
                        domain ===
                        "SOIL_INTELLIGENCE"
                    ) {
                        throw new Error(
                            "AUTHORITATIVE_SOIL_FAILURE"
                        );
                    }

                    return (
                        authoritativeResults[
                            domain
                        ]
                    );
                }
        }
    };
}

function restoreModules() {
    if (
        originalAdapterModule
    ) {
        require.cache[
            adapterPath
        ] =
            originalAdapterModule;
    } else {
        delete require.cache[
            adapterPath
        ];
    }

    if (
        originalOrchestratorModule
    ) {
        require.cache[
            orchestratorPath
        ] =
            originalOrchestratorModule;
    } else {
        delete require.cache[
            orchestratorPath
        ];
    }
}

function loadOrchestrator() {
    delete require.cache[
        orchestratorPath
    ];

    return require(
        "../scientific/integration/integrationExecutionOrchestrator"
    );
}

installAdapterStub();

const {
    INTEGRATION_EXECUTION_ORCHESTRATOR_VERSION,
    INTEGRATION_EXECUTION_ORCHESTRATOR_TYPE,
    executeIntegrationRequest
} = loadOrchestrator();

after(() => {
    restoreModules();
});

// ============================================================
// Test helpers
// ============================================================

function createCanonicalSample() {
    return {
        sample_id:
            "S-001",

        latitude:
            17.71234,

        longitude:
            83.30125,

        ph:
            6.8,

        nitrogen:
            215,

        phosphorus:
            18,

        potassium:
            240,

        organic_carbon:
            0.72,

        electrical_conductivity:
            0.35,

        texture:
            "Loamy"
    };
}

// ============================================================
// Contract identity
// ============================================================

test(
    "orchestrator contract version and type are defined",
    () => {
        assert.equal(
            INTEGRATION_EXECUTION_ORCHESTRATOR_VERSION,
            "1.0"
        );

        assert.equal(
            INTEGRATION_EXECUTION_ORCHESTRATOR_TYPE,
            "INTEGRATION_EXECUTION_ORCHESTRATOR"
        );
    }
);

// ============================================================
// Single-domain execution
// ============================================================

test(
    "orchestrator executes a resolved soil domain and assembles a completed result",
    async () => {
        executionCalls.length =
            0;

        const sample =
            createCanonicalSample();

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],

                inputs: {
                    sample
                }
            });

        assert.deepEqual(
            execution.requestedDomains,
            [
                "SOIL_INTELLIGENCE"
            ]
        );

        assert.equal(
            execution.resolvedDomains.length,
            1
        );

        assert.equal(
            execution.domainResults.length,
            1
        );

        assert.equal(
            execution.domainResults[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.equal(
            execution.domainResults[0].status,
            "completed"
        );

        assert.deepEqual(
            execution.domainResults[0].prerequisites,
            []
        );

        assert.strictEqual(
            execution.domainResults[0].result,
            authoritativeResults.SOIL_INTELLIGENCE
        );

        assert.equal(
            executionCalls.length,
            1
        );

        assert.equal(
            executionCalls[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.deepEqual(
            executionCalls[0].serviceArguments,
            {
                sample
            }
        );
    }
);

// ============================================================
// Direct input blocking
// ============================================================

test(
    "orchestrator blocks a domain when required direct input is missing",
    async () => {
        executionCalls.length =
            0;

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ]
            });

        assert.equal(
            execution.domainResults.length,
            1
        );

        assert.equal(
            execution.domainResults[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.equal(
            execution.domainResults[0].status,
            "blocked"
        );

        assert.deepEqual(
            execution.domainResults[0].prerequisites,
            []
        );

        assert.deepEqual(
            execution.domainResults[0].missingInputs,
            [
                "inputs.sample"
            ]
        );

        assert.strictEqual(
            execution.domainResults[0].result,
            null
        );

        assert.equal(
            executionCalls.length,
            0
        );
    }
);

// ============================================================
// Dependency resolution and ordering
// ============================================================

test(
    "orchestrator executes CROP_SUITABILITY after SOIL_INTELLIGENCE",
    async () => {
        executionCalls.length =
            0;

        const sample =
            createCanonicalSample();

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "CROP_SUITABILITY"
                ],

                inputs: {
                    sample
                }
            });

        assert.deepEqual(
            execution.resolvedDomains.map(
                entry =>
                    entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY"
            ]
        );

        assert.deepEqual(
            execution.domainResults.map(
                entry =>
                    entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY"
            ]
        );

        assert.deepEqual(
            execution.domainResults.map(
                entry =>
                    entry.status
            ),
            [
                "completed",
                "completed"
            ]
        );

        assert.deepEqual(
            executionCalls.map(
                entry =>
                    entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY"
            ]
        );
    }
);

// ============================================================
// Prerequisite result propagation
// ============================================================

test(
    "orchestrator passes completed prerequisite result into dependent input resolution",
    async () => {
        executionCalls.length =
            0;

        const sample =
            createCanonicalSample();

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "CROP_SUITABILITY"
                ],

                inputs: {
                    sample
                }
            });

        assert.equal(
            executionCalls.length,
            2
        );

        assert.equal(
            executionCalls[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.deepEqual(
            executionCalls[0].serviceArguments,
            {
                sample
            }
        );

        assert.equal(
            executionCalls[1].domain,
            "CROP_SUITABILITY"
        );

        assert.deepEqual(
            executionCalls[1].serviceArguments,
            {
                sample,

                analysis:
                    authoritativeResults
                        .SOIL_INTELLIGENCE
            }
        );

        assert.strictEqual(
            execution.domainResults[1].result,
            authoritativeResults
                .CROP_SUITABILITY
        );
    }
);

// ============================================================
// Blocked prerequisite propagation
// ============================================================

test(
    "orchestrator blocks a dependent domain when its prerequisite is unavailable",
    async () => {
        executionCalls.length =
            0;

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "CROP_SUITABILITY"
                ]
            });

        assert.equal(
            execution.domainResults.length,
            2
        );

        assert.equal(
            execution.domainResults[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.equal(
            execution.domainResults[0].status,
            "blocked"
        );

        assert.equal(
            execution.domainResults[1].domain,
            "CROP_SUITABILITY"
        );

        assert.equal(
            execution.domainResults[1].status,
            "blocked"
        );

        assert.deepEqual(
            execution.domainResults[1].prerequisites,
            [
                "SOIL_INTELLIGENCE"
            ]
        );

        assert.deepEqual(
            execution.domainResults[1].missingInputs,
            [
                "inputs.sample",
                "SOIL_INTELLIGENCE.result"
            ]
        );

        assert.strictEqual(
            execution.domainResults[1].result,
            null
        );

        assert.equal(
            executionCalls.length,
            0
        );
    }
);

// ============================================================
// Independent domain preservation
// ============================================================

test(
    "orchestrator preserves independent domain results without artificial dependency ordering",
    async () => {
        executionCalls.length =
            0;

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "SOIL_INTELLIGENCE",
                    "SPATIAL_INTELLIGENCE"
                ],

                inputs: {
                    sample:
                        createCanonicalSample(),

                    latitude:
                        17.71234,

                    longitude:
                        83.30125
                }
            });

        assert.deepEqual(
            execution.resolvedDomains.map(
                entry =>
                    entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE"
            ]
        );

        assert.deepEqual(
            execution.domainResults.map(
                entry =>
                    entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE"
            ]
        );

        assert.deepEqual(
            execution.domainResults.map(
                entry =>
                    entry.prerequisites
            ),
            [
                [],
                []
            ]
        );

        assert.strictEqual(
            execution.domainResults[0].result,
            authoritativeResults
                .SOIL_INTELLIGENCE
        );

        assert.strictEqual(
            execution.domainResults[1].result,
            authoritativeResults
                .SPATIAL_INTELLIGENCE
        );
    }
);

// ============================================================
// Authoritative failure handling
// ============================================================

test(
    "orchestrator records an authoritative execution failure without manufacturing a result",
    async () => {
        restoreModules();

        installFailingAdapterStub();

        const orchestrator =
            loadOrchestrator();

        executionCalls.length =
            0;

        const execution =
            await orchestrator
                .executeIntegrationRequest({
                    requestedDomains: [
                        "SOIL_INTELLIGENCE"
                    ],

                    inputs: {
                        sample:
                            createCanonicalSample()
                    }
                });

        assert.equal(
            execution.domainResults.length,
            1
        );

        assert.equal(
            execution.domainResults[0].domain,
            "SOIL_INTELLIGENCE"
        );

        assert.equal(
            execution.domainResults[0].status,
            "failed"
        );

        assert.equal(
            execution.domainResults[0].error,
            "AUTHORITATIVE_SOIL_FAILURE"
        );

        assert.equal(
            "result" in
                execution.domainResults[0],
            false
        );

        assert.equal(
            executionCalls.length,
            1
        );

        assert.equal(
            executionCalls[0].domain,
            "SOIL_INTELLIGENCE"
        );

        restoreModules();

        installAdapterStub();

        loadOrchestrator();
    }
);

// ============================================================
// Final execution contract
// ============================================================

test(
    "orchestrator returns the canonical integration execution contract",
    async () => {
        executionCalls.length =
            0;

        const execution =
            await executeIntegrationRequest({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],

                inputs: {
                    sample:
                        createCanonicalSample()
                }
            });

        assert.equal(
            execution.contractVersion,
            "1.0"
        );

        assert.equal(
            execution.executionType,
            "INTEGRATION_EXECUTION_RESULT"
        );

        assert.ok(
            Array.isArray(
                execution.resolvedDomains
            )
        );

        assert.ok(
            Array.isArray(
                execution.domainResults
            )
        );

        assert.equal(
            execution.executionMetadata
                .orchestratorVersion,
            "1.0"
        );

        assert.equal(
            execution.executionMetadata
                .orchestratorType,
            "INTEGRATION_EXECUTION_ORCHESTRATOR"
        );
    }
);
