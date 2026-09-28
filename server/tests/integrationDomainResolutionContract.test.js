"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION,
    INTEGRATION_DOMAIN_RESOLUTION_TYPE,
    INTEGRATION_DOMAINS,
    DOMAIN_DEFINITIONS,
    validateIntegrationDomainResolution,
    createIntegrationDomainResolution
} = require(
    "../scientific/integration/integrationDomainResolutionContract"
);

test(
    "integration domain resolution contract version and type are defined correctly",
    () => {
        assert.equal(
            INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION,
            "1.0"
        );

        assert.equal(
            INTEGRATION_DOMAIN_RESOLUTION_TYPE,
            "INTEGRATION_DOMAIN_RESOLUTION"
        );
    }
);

test(
    "all eight authoritative integration domains are defined",
    () => {
        assert.deepEqual(
            INTEGRATION_DOMAINS,
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE",
                "CROP_SUITABILITY",
                "FERTILITY_ZONING",
                "HISTORICAL_CONTEXT",
                "TEMPORAL_OBSERVATION",
                "TEMPORAL_COMPOSITION",
                "TEMPORAL_ANALYSIS"
            ]
        );

        assert.equal(
            Object.keys(DOMAIN_DEFINITIONS).length,
            8
        );

        INTEGRATION_DOMAINS.forEach(domain => {
            assert.ok(
                DOMAIN_DEFINITIONS[domain],
                `Missing definition for ${domain}`
            );
        });
    }
);

test(
    "authoritative domain entry points match the frozen architecture matrix",
    () => {
        assert.equal(
            DOMAIN_DEFINITIONS.SOIL_INTELLIGENCE.authoritativeEntryPoint,
            "analyzeSample"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.SPATIAL_INTELLIGENCE.authoritativeEntryPoint,
            "getSpatialAnalysis"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.CROP_SUITABILITY.authoritativeEntryPoint,
            "generateCropRecommendations"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.FERTILITY_ZONING.authoritativeEntryPoint,
            "prepareFertilityZoning"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.HISTORICAL_CONTEXT.authoritativeEntryPoint,
            "getHistoricalContext"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.TEMPORAL_OBSERVATION.authoritativeEntryPoint,
            "processTemporalObservationWorkflow"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.TEMPORAL_COMPOSITION.authoritativeEntryPoint,
            "processTemporalCompositionWorkflow"
        );

        assert.equal(
            DOMAIN_DEFINITIONS.TEMPORAL_ANALYSIS.authoritativeEntryPoint,
            "processTemporalAnalysisWorkflow"
        );
    }
);

test(
    "soil intelligence has no integration-level prerequisites",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.SOIL_INTELLIGENCE.prerequisites,
            []
        );
    }
);

test(
    "crop suitability requires soil intelligence",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.CROP_SUITABILITY.prerequisites,
            [
                "SOIL_INTELLIGENCE"
            ]
        );
    }
);

test(
    "temporal composition requires temporal observation",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.TEMPORAL_COMPOSITION.prerequisites,
            [
                "TEMPORAL_OBSERVATION"
            ]
        );
    }
);

test(
    "temporal analysis requires temporal composition",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.TEMPORAL_ANALYSIS.prerequisites,
            [
                "TEMPORAL_COMPOSITION"
            ]
        );
    }
);

test(
    "spatial intelligence remains independent at integration level",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.SPATIAL_INTELLIGENCE.prerequisites,
            []
        );
    }
);

test(
    "fertility zoning remains independent at integration level",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.FERTILITY_ZONING.prerequisites,
            []
        );
    }
);

test(
    "historical context remains independent at integration level",
    () => {
        assert.deepEqual(
            DOMAIN_DEFINITIONS.HISTORICAL_CONTEXT.prerequisites,
            []
        );
    }
);

test(
    "soil intelligence resolves without additional domains",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ]
            });

        assert.deepEqual(
            resolution.requestedDomains,
            [
                "SOIL_INTELLIGENCE"
            ]
        );

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "SOIL_INTELLIGENCE"
            ]
        );
    }
);

test(
    "crop suitability automatically resolves soil intelligence first",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "CROP_SUITABILITY"
                ]
            });

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY"
            ]
        );

        assert.deepEqual(
            resolution.resolvedDomains[1].prerequisites,
            [
                "SOIL_INTELLIGENCE"
            ]
        );
    }
);

test(
    "temporal analysis resolves the complete temporal dependency chain",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "TEMPORAL_ANALYSIS"
                ]
            });

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "TEMPORAL_OBSERVATION",
                "TEMPORAL_COMPOSITION",
                "TEMPORAL_ANALYSIS"
            ]
        );
    }
);

test(
    "multiple independent domains preserve requested order",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "HISTORICAL_CONTEXT",
                    "SPATIAL_INTELLIGENCE",
                    "FERTILITY_ZONING"
                ]
            });

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "HISTORICAL_CONTEXT",
                "SPATIAL_INTELLIGENCE",
                "FERTILITY_ZONING"
            ]
        );
    }
);

test(
    "mixed independent and dependent domains resolve deterministically",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "SPATIAL_INTELLIGENCE",
                    "CROP_SUITABILITY",
                    "TEMPORAL_ANALYSIS",
                    "HISTORICAL_CONTEXT"
                ]
            });

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "SPATIAL_INTELLIGENCE",
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY",
                "TEMPORAL_OBSERVATION",
                "TEMPORAL_COMPOSITION",
                "TEMPORAL_ANALYSIS",
                "HISTORICAL_CONTEXT"
            ]
        );
    }
);

test(
    "shared prerequisites are resolved only once",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "SOIL_INTELLIGENCE",
                    "CROP_SUITABILITY"
                ]
            });

        assert.deepEqual(
            resolution.resolvedDomains.map(
                entry => entry.domain
            ),
            [
                "SOIL_INTELLIGENCE",
                "CROP_SUITABILITY"
            ]
        );
    }
);

test(
    "resolved domain definitions expose required inputs",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "SOIL_INTELLIGENCE",
                    "CROP_SUITABILITY",
                    "TEMPORAL_ANALYSIS"
                ]
            });

        const soil =
            resolution.resolvedDomains.find(
                entry =>
                    entry.domain ===
                    "SOIL_INTELLIGENCE"
            );

        const crop =
            resolution.resolvedDomains.find(
                entry =>
                    entry.domain ===
                    "CROP_SUITABILITY"
            );

        const temporalAnalysis =
            resolution.resolvedDomains.find(
                entry =>
                    entry.domain ===
                    "TEMPORAL_ANALYSIS"
            );

        assert.deepEqual(
            soil.requiredInputs,
            [
                "sample"
            ]
        );

        assert.deepEqual(
            crop.requiredInputs,
            [
                "sample",
                "analysis"
            ]
        );

        assert.deepEqual(
            temporalAnalysis.requiredInputs,
            [
                "analysisId",
                "analysisType",
                "composition"
            ]
        );
    }
);

test(
    "null and non-object resolutions are rejected",
    () => {
        const nullResult =
            validateIntegrationDomainResolution(
                null
            );

        const arrayResult =
            validateIntegrationDomainResolution(
                []
            );

        assert.equal(
            nullResult.valid,
            false
        );

        assert.equal(
            arrayResult.valid,
            false
        );
    }
);

test(
    "invalid resolution contract version is rejected",
    () => {
        const result =
            validateIntegrationDomainResolution({
                contractVersion: "9.9",
                resolutionType:
                    INTEGRATION_DOMAIN_RESOLUTION_TYPE,
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],
                resolvedDomains: [
                    {
                        domain:
                            "SOIL_INTELLIGENCE",
                        authoritativeService:
                            "server/services/soilAnalysisService.js",
                        authoritativeEntryPoint:
                            "analyzeSample",
                        requiredInputs: [
                            "sample"
                        ],
                        prerequisites: []
                    }
                ]
            });

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "contractVersion"
                    )
            )
        );
    }
);

test(
    "invalid resolution type is rejected",
    () => {
        const result =
            validateIntegrationDomainResolution({
                contractVersion:
                    INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION,
                resolutionType:
                    "INVALID_RESOLUTION",
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],
                resolvedDomains: [
                    {
                        domain:
                            "SOIL_INTELLIGENCE",
                        authoritativeService:
                            "server/services/soilAnalysisService.js",
                        authoritativeEntryPoint:
                            "analyzeSample",
                        requiredInputs: [
                            "sample"
                        ],
                        prerequisites: []
                    }
                ]
            });

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "resolutionType"
                    )
            )
        );
    }
);

test(
    "empty requested domains are rejected",
    () => {
        assert.throws(
            () =>
                createIntegrationDomainResolution({
                    requestedDomains: []
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_INTEGRATION_DOMAIN_RESOLUTION"
                );

                return true;
            }
        );
    }
);

test(
    "duplicate requested domains are rejected",
    () => {
        assert.throws(
            () =>
                createIntegrationDomainResolution({
                    requestedDomains: [
                        "SOIL_INTELLIGENCE",
                        "SOIL_INTELLIGENCE"
                    ]
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_INTEGRATION_DOMAIN_RESOLUTION"
                );

                assert.ok(
                    error.validationErrors.some(
                        message =>
                            message.includes(
                                "duplicates"
                            )
                    )
                );

                return true;
            }
        );
    }
);

test(
    "unsupported requested domain is rejected",
    () => {
        assert.throws(
            () =>
                createIntegrationDomainResolution({
                    requestedDomains: [
                        "UNKNOWN_DOMAIN"
                    ]
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_INTEGRATION_DOMAIN_RESOLUTION"
                );

                assert.ok(
                    error.validationErrors.some(
                        message =>
                            message.includes(
                                "unsupported"
                            )
                    )
                );

                return true;
            }
        );
    }
);

test(
    "factory creates a valid normalized resolution",
    () => {
        const resolution =
            createIntegrationDomainResolution({
                requestedDomains: [
                    "CROP_SUITABILITY"
                ]
            });

        const validation =
            validateIntegrationDomainResolution(
                resolution
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            resolution.requestedDomains,
            [
                "CROP_SUITABILITY"
            ]
        );

        assert.equal(
            resolution.contractVersion,
            "1.0"
        );

        assert.equal(
            resolution.resolutionType,
            "INTEGRATION_DOMAIN_RESOLUTION"
        );
    }
);