"use strict";

// ============================================================
// server/tests/integrationInputResolutionContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 8.14.18.6
// Integration Input Resolution Contract Tests
//
// Purpose:
// Verifies that integration-domain inputs are resolved into
// authoritative service arguments without duplicating
// scientific logic or bypassing domain prerequisites.
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    INTEGRATION_DOMAINS,
    RESOLUTION_STATUSES,
    resolveIntegrationDomainInputs,
    validateIntegrationInputResolution
} = require(
    "../scientific/integration/integrationInputResolutionContract"
);

// ============================================================
// Canonical temporal fixtures
// ============================================================

function createTemporalObservation(
    observationDate,
    mean = 0.4
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

            minimum:
                mean - 0.1,

            maximum:
                mean + 0.1,

            mean
        },

        spatialContext: {
            coordinateReferenceSystem:
                "EPSG:4326"
        },

        processingContext: {
            method:
                "phase-8.14.18.6-integration-test"
        }
    };
}

function createValidComposition() {
    const firstObservation =
        createTemporalObservation(
            "2026-09-20",
            0.4
        );

    const secondObservation =
        createTemporalObservation(
            "2026-09-25",
            0.55
        );

    return {
        contractVersion: "1.0",

        compositionId:
            "COMPOSITION-INTEGRATION-001",

        indexCode:
            "NDVI",

        observations: [
            firstObservation,
            secondObservation
        ],

        temporalContext: {
            startDate:
                "2026-09-20",

            endDate:
                "2026-09-25",

            observationCount: 2
        },

        spatialContext: {
            coordinateReferenceSystem:
                "EPSG:4326"
        },

        processingContext: {
            method:
                "phase-8.14.18.6-integration-test"
        }
    };
}

// ============================================================
// Contract identity
// ============================================================

test(
    "integration input resolution contract version and type are defined correctly",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "SOIL_INTELLIGENCE",
                {
                    sample: {
                        sampleId: "S-001"
                    }
                }
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.resolutionType,
            "INTEGRATION_INPUT_RESOLUTION"
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
    }
);

test(
    "resolution statuses are explicitly defined",
    () => {
        assert.deepEqual(
            RESOLUTION_STATUSES,
            [
                "resolved",
                "blocked"
            ]
        );
    }
);

// ============================================================
// Soil Intelligence
// ============================================================

test(
    "soil intelligence resolves sample input",
    () => {
        const sample = {
            sampleId: "S-001",
            pH: 6.8,
            nitrogen: 215
        };

        const result =
            resolveIntegrationDomainInputs(
                "SOIL_INTELLIGENCE",
                {
                    sample
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments,
            {
                sample
            }
        );
    }
);

test(
    "soil intelligence blocks when sample is missing",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "SOIL_INTELLIGENCE",
                {}
            );

        assert.equal(
            result.status,
            "blocked"
        );

        assert.ok(
            result.missingInputs.length > 0
        );
    }
);

// ============================================================
// Spatial Intelligence
// ============================================================

test(
    "spatial intelligence resolves latitude and longitude",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "SPATIAL_INTELLIGENCE",
                {
                    latitude: 17.71234,
                    longitude: 83.30125
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments,
            {
                latitude: 17.71234,
                longitude: 83.30125
            }
        );
    }
);

// ============================================================
// Crop Suitability
// ============================================================

test(
    "crop suitability consumes authoritative soil result",
    () => {
        const soilResult = {
            standard: "AgriNexus Soil Standard",
            version: "1.0",
            soilTexture: "Loamy",
            values: {},
            overallFertility: "Medium"
        };

        const sample = {
            sampleId: "S-001"
        };

        const result =
            resolveIntegrationDomainInputs(
                "CROP_SUITABILITY",
                {
                    sample
                },
                {},
                {
                    SOIL_INTELLIGENCE:
                        soilResult
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments,
            {
                sample,
                analysis: soilResult
            }
        );

        assert.equal(
            result.sourceDomains.includes("SOIL_INTELLIGENCE.result"),
            true
        );
    }
);

test(
    "crop suitability blocks without soil prerequisite result",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "CROP_SUITABILITY",
                {
                    sample: {
                        sampleId: "S-001"
                    }
                }
            );

        assert.equal(
            result.status,
            "blocked"
        );

        assert.ok(
            result.missingInputs.length > 0
        );
    }
);

// ============================================================
// Fertility Zoning
// ============================================================

test(
    "fertility zoning resolves options",
    () => {
        const options = {
            classification: "standard"
        };

        const result =
            resolveIntegrationDomainInputs(
                "FERTILITY_ZONING",
                {
                    options
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments,
            {
                options
            }
        );
    }
);

// ============================================================
// Historical Context
// ============================================================

test(
    "historical context resolves sampleId and parameter",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "HISTORICAL_CONTEXT",
                {
                    sampleId: "S-001",
                    parameter: "pH"
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments,
            {
                sampleId: "S-001",
                parameter: "pH"
            }
        );
    }
);

// ============================================================
// Temporal Observation
// ============================================================

test(
    "temporal observation resolves complete observation requests",
    () => {
        const request = {
            contractVersion: "1.0",

            temporalIdentity: {
                observationDate:
                    "2026-09-20",

                acquisitionDate:
                    "2026-09-20T10:00:00Z",

                sensor:
                    "Sentinel-2",

                sceneId:
                    "SCENE-001"
            },

            rasterIdentity: {
                rasterId:
                    "RASTER-001"
            },

            workflowRequest: {
                inputPath:
                    "D:\\AgriNexus\\input.tif",

                indexCode:
                    "NDVI",

                bandMapping: {
                    nir: 1,
                    red: 2
                },

                outputDirectory:
                    "D:\\AgriNexus\\outputs"
            }
        };

        const result =
            resolveIntegrationDomainInputs(
                "TEMPORAL_OBSERVATION",
                {
                    observationRequests: [
                        request
                    ]
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.equal(
            result.serviceArguments
                .observationRequests.length,
            1
        );

        assert.equal(
            result.serviceArguments
                .observationRequests[0]
                .workflowRequest
                .indexCode,
            "NDVI"
        );

        assert.equal(
            result.serviceArguments
                .observationRequests[0]
                .temporalIdentity
                .acquisitionDate,
            "2026-09-20T10:00:00Z"
        );
    }
);

// ============================================================
// Temporal Composition
// ============================================================

test(
    "temporal composition consumes completed observation results",
    () => {
        const firstObservation =
            createTemporalObservation(
                "2026-09-20",
                0.4
            );

        const result =
            resolveIntegrationDomainInputs(
                "TEMPORAL_COMPOSITION",
                {
                    composition: {
                        compositionId:
                            "COMP-001",

                        indexCode:
                            "NDVI",

                        temporalContext: {
                            startDate:
                                "2026-09-20",

                            endDate:
                                "2026-09-20",

                            observationCount:
                                1
                        },

                        spatialContext: {
                            coordinateReferenceSystem:
                                "EPSG:4326",

                            source:
                                "integration-test"
                        },

                        processingContext: {
                            source:
                                "integration-test"
                        }
                    }
                },
                {},
                {
                    TEMPORAL_OBSERVATION: [
                        firstObservation
                    ]
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments
                .request.observations,
            [firstObservation]
        );

        assert.equal(
            result.serviceArguments
                .request.indexCode,
            "NDVI"
        );
    }
);

test(
    "temporal composition blocks without observation prerequisite",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "TEMPORAL_COMPOSITION",
                {
                    composition: {
                        compositionId:
                            "COMP-001",

                        indexCode:
                            "NDVI",

                        temporalContext: {
                            startDate:
                                "2026-09-20",

                            endDate:
                                "2026-09-20",

                            observationCount:
                                1
                        },

                        spatialContext: {},

                        processingContext: {}
                    }
                }
            );

        assert.equal(
            result.status,
            "blocked"
        );

        assert.ok(
            result.missingInputs.length > 0
        );
    }
);

// ============================================================
// Temporal Analysis
// ============================================================

test(
    "temporal analysis consumes completed composition result",
    () => {
        const composition =
            createValidComposition();

        const result =
            resolveIntegrationDomainInputs(
                "TEMPORAL_ANALYSIS",
                {
                    analysis: {
                        analysisId:
                            "ANALYSIS-001",

                        analysisType:
                            "CHANGE"
                    }
                },
                {},
                {
                    TEMPORAL_COMPOSITION:
                        composition
                }
            );

        assert.equal(
            result.status,
            "resolved"
        );

        assert.deepEqual(
            result.serviceArguments
                .request.composition,
            composition
        );

        assert.equal(
            result.serviceArguments
                .request.analysisType,
            "CHANGE"
        );
    }
);

test(
    "temporal analysis blocks without composition prerequisite",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "TEMPORAL_ANALYSIS",
                {
                    analysis: {
                        analysisId:
                            "ANALYSIS-001",

                        analysisType:
                            "CHANGE"
                    }
                }
            );

        assert.equal(
            result.status,
            "blocked"
        );

        assert.ok(
            result.missingInputs.length > 0
        );
    }
);

// ============================================================
// Unsupported domain
// ============================================================

test(
    "unsupported domain is blocked",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "UNSUPPORTED_DOMAIN",
                {}
            );

        assert.equal(
            result.status,
            "blocked"
        );

        assert.ok(
            result.missingInputs.length > 0
        );
    }
);

// ============================================================
// Resolution contract validation
// ============================================================

test(
    "resolved resolution contract is valid",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "SOIL_INTELLIGENCE",
                {
                    sample: {
                        sampleId: "S-001"
                    }
                }
            );

        const validation =
            validateIntegrationInputResolution(
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
    }
);

test(
    "blocked resolution contract is valid",
    () => {
        const result =
            resolveIntegrationDomainInputs(
                "SOIL_INTELLIGENCE",
                {}
            );

        const validation =
            validateIntegrationInputResolution(
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
    }
);

test(
    "resolved resolution cannot contain missing inputs",
    () => {
        const result = {
            contractVersion: "1.0",
            resolutionType:
                "INTEGRATION_INPUT_RESOLUTION",
            domain:
                "SOIL_INTELLIGENCE",
            status:
                "resolved",
            serviceArguments: {
                sample: {
                    sampleId: "S-001"
                }
            },
            missingInputs: [
                "sample"
            ]
        };

        const validation =
            validateIntegrationInputResolution(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);

test(
    "blocked resolution cannot contain service arguments",
    () => {
        const result = {
            contractVersion: "1.0",
            resolutionType:
                "INTEGRATION_INPUT_RESOLUTION",
            domain:
                "SOIL_INTELLIGENCE",
            status:
                "blocked",
            serviceArguments: {
                sample: {
                    sampleId: "S-001"
                }
            },
            missingInputs: [
                "sample"
            ]
        };

        const validation =
            validateIntegrationInputResolution(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);


