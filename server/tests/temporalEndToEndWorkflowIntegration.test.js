"use strict";

// ============================================================
// server/tests/temporalEndToEndWorkflowIntegration.test.js
// ============================================================
//
// AgriNexus-GIS
//
// Phase 5.1.5.3.2 → 5.1.5.5 → 5.1.6
//
// Temporal End-to-End Workflow Integration Test
//
// Real workflow chain:
//
//   Temporal Observation Workflow
//          ↓
//   Temporal Index Observation
//          ↓
//   Temporal Composition Workflow
//          ↓
//   Temporal Composition
//          ↓
//   Temporal Analysis Workflow
//          ↓
//   Temporal Change Calculation
//
// Raster I/O and raster-processing dependencies are stubbed.
// Temporal workflow services and scientific temporal contracts
// remain real production implementations.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");


// ============================================================
// ACTUAL PRODUCTION MODULE PATHS
// ============================================================

const observationWorkflowPath = require.resolve(
    "../services/remoteSensing/temporal/temporalObservationWorkflowService"
);

const rasterReaderPath = require.resolve(
    "../services/remoteSensing/raster/rasterReaderService"
);

const rasterValidationPath = require.resolve(
    "../services/remoteSensing/raster/rasterValidationService"
);

const rasterNormalizationPath = require.resolve(
    "../services/remoteSensing/raster/rasterNormalizationService"
);

const rasterProcessingPath = require.resolve(
    "../services/remoteSensing/raster/rasterIndexProcessingService"
);

const rasterClassificationPath = require.resolve(
    "../services/remoteSensing/raster/rasterIndexClassificationService"
);

const rasterOutputPath = require.resolve(
    "../services/remoteSensing/raster/rasterOutputService"
);

const indexRegistryPath = require.resolve(
    "../scientific/remoteSensing/indices/indexRegistry"
);

const observationRequestContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalObservationWorkflowRequestContract"
);

const temporalObservationContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalIndexObservationContract"
);

const compositionWorkflowPath = require.resolve(
    "../services/remoteSensing/temporal/temporalCompositionWorkflowService"
);

const compositionWorkflowRequestContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalCompositionWorkflowRequestContract"
);

const compositionWorkflowResultContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalCompositionWorkflowResultContract"
);

const compositionContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalCompositionContract"
);

const analysisWorkflowPath = require.resolve(
    "../services/remoteSensing/temporal/temporalAnalysisWorkflowService"
);

const analysisWorkflowRequestContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalAnalysisWorkflowRequestContract"
);

const analysisWorkflowResultContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalAnalysisWorkflowResultContract"
);

const changeCalculationPath = require.resolve(
    "../services/remoteSensing/temporalChangeCalculationService"
);

const changeCalculationContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalChangeCalculationContract"
);


// ============================================================
// MODULE STUB MANAGEMENT
// ============================================================

const originalModules = new Map();

function installStub(modulePath, exports) {
    if (!originalModules.has(modulePath)) {
        originalModules.set(
            modulePath,
            require.cache[modulePath]
        );
    }

    require.cache[modulePath] = {
        id: modulePath,
        filename: modulePath,
        loaded: true,
        exports
    };
}

function restoreModules() {
    for (
        const [modulePath, original]
        of originalModules.entries()
    ) {
        if (original) {
            require.cache[modulePath] = original;
        } else {
            delete require.cache[modulePath];
        }
    }

    originalModules.clear();

    delete require.cache[observationWorkflowPath];
}


// ============================================================
// TEST FIXTURES
// ============================================================

const definition = {
    code: "NDVI",
    name: "Normalized Difference Vegetation Index",
    validRange: {
        min: -1,
        max: 1
    },
    requiredBands: [
        "nir",
        "red"
    ]
};


const baseReaderRaster = {
    width: 2,
    height: 2,
    pixelCount: 4,
    noData: -9999,

    data: [
        [0.80, 0.60],
        [0.40, 0.20]
    ]
};


function createNormalizedRaster() {
    return {
        width: 2,
        height: 2,
        pixelCount: 4,
        noData: -9999,

        bands: {
            nir: {
                data: [0.80, 0.60, 0.40, 0.20]
            },

            red: {
                data: [0.20, 0.20, 0.20, 0.20]
            }
        }
    };
}


function createContinuousRaster(mean) {
    return {
        width: 2,
        height: 2,
        pixelCount: 4,

        bands: {
            NDVI: {
                data: [
                    mean + 0.30,
                    mean + 0.10,
                    mean - 0.10,
                    mean - 0.30
                ]
            }
        }
    };
}


function createClassificationRaster() {
    return {
        width: 2,
        height: 2,
        pixelCount: 4,

        bands: {
            NDVI: {
                data: [4, 3, 2, 1]
            }
        }
    };
}


// ============================================================
// INSTALL REAL WORKFLOW DEPENDENCIES + RASTER STUBS
// ============================================================

function loadWorkflowsWithStubs() {
    let observationCallCount = 0;
    const writtenOutputs = [];

    installStub(
        rasterReaderPath,
        {
            readGeoTiff: async () => ({
                ...baseReaderRaster
            })
        }
    );


    installStub(
        rasterValidationPath,
        {
            validateRaster: () => true
        }
    );


    installStub(
        rasterNormalizationPath,
        {
            normalizeRaster: () =>
                createNormalizedRaster()
        }
    );


    installStub(
        rasterProcessingPath,
        {
            processRasterIndex: ({
                indexCode,
                raster,
                parameters,
                processingContext,
                spatialContext
            }) => {
                assert.equal(
                    indexCode,
                    "NDVI"
                );

                assert.ok(raster);
                assert.ok(parameters);
                assert.ok(processingContext);
                assert.ok(spatialContext);

                observationCallCount += 1;

                const mean =
                    observationCallCount === 1
                        ? 0.30
                        : 0.45;

                const continuousRaster =
                    createContinuousRaster(
                        mean
                    );

                return {
                    analysisType:
                        "remote_sensing_raster_index",

                    analysisVersion:
                        "1.0",

                    results: {
                        raster:
                            continuousRaster
                    },

                    statistics: {
                        validPixelCount: 4,
                        noDataPixelCount: 0,

                        min:
                            mean - 0.30,

                        max:
                            mean + 0.30,

                        mean
                    },

                    spatialContext: {
                        coordinateReferenceSystem:
                            "EPSG:32644",

                        source:
                            "temporal-e2e-test"
                    }
                };
            }
        }
    );


    installStub(
        rasterClassificationPath,
        {
            processRasterIndexClassification: ({
                indexCode,
                raster,
                processingContext,
                spatialContext
            }) => {
                assert.equal(
                    indexCode,
                    "NDVI"
                );

                assert.ok(raster);
                assert.ok(processingContext);
                assert.ok(spatialContext);

                return {
                    classification: {
                        raster:
                            createClassificationRaster()
                    }
                };
            }
        }
    );


    installStub(
        rasterOutputPath,
        {
            writeRasterOutput: async ({
                request,
                outputPath
            }) => {
                writtenOutputs.push({
                    request,
                    outputPath
                });

                return {
                    path: outputPath,
                    outputType:
                        request.outputType,
                    indexCode:
                        request.indexCode
                };
            }
        }
    );


    installStub(
        indexRegistryPath,
        {
            getIndexDefinition: code => {
                assert.equal(
                    code,
                    "NDVI"
                );

                return definition;
            }
        }
    );


    // --------------------------------------------------------
    // Observation request contract remains real.
    // Observation result contract remains real.
    // --------------------------------------------------------
    //
    // These are deliberately NOT stubbed.


    // --------------------------------------------------------
    // Composition and analysis services/contracts remain real.
    // --------------------------------------------------------
    //
    // These are deliberately NOT stubbed.


    const observationWorkflow =
        require(observationWorkflowPath);

    const compositionWorkflow =
        require(compositionWorkflowPath);

    const analysisWorkflow =
        require(analysisWorkflowPath);

    const changeCalculation =
        require(changeCalculationPath);


    return {
        observationWorkflow,
        compositionWorkflow,
        analysisWorkflow,
        changeCalculation,
        writtenOutputs,
        getObservationCallCount: () =>
            observationCallCount
    };
}


// ============================================================
// OBSERVATION REQUEST FACTORY
// ============================================================

function createObservationRequest({
    observationDate,
    acquisitionDate,
    sceneId,
    rasterId,
    inputPath
}) {
    return {
        contractVersion: "1.0",

        temporalIdentity: {
            observationDate,
            acquisitionDate,
            sensor: "Sentinel-2",
            sceneId
        },

        rasterIdentity: {
            rasterId
        },

        workflowRequest: {
            inputPath,

            indexCode: "NDVI",

            bandMapping: {
                nir: 1,
                red: 2
            },

            outputDirectory:
                "D:\\AgriNexus\\outputs",

            noData: -9999,

            parameters: {
                example: true
            },

            processingContext: {
                source:
                    "Phase-5.1.5.3.2-e2e-test"
            },

            spatialContext: {
                coordinateReferenceSystem:
                    "EPSG:32644",

                source:
                    "e2e-request"
            }
        }
    };
}


// ============================================================
// END-TO-END TEST
// ============================================================

test(
    "temporal end-to-end workflow integrates observations, composition, analysis, and change calculation",
    async () => {

        const {
            observationWorkflow,
            compositionWorkflow,
            analysisWorkflow,
            changeCalculation,
            writtenOutputs,
            getObservationCallCount
        } = loadWorkflowsWithStubs();


        // ====================================================
        // 1. FIRST TEMPORAL OBSERVATION
        // ====================================================

        const firstObservationResult =
            await observationWorkflow.processTemporalObservationWorkflow(
                createObservationRequest({
                    observationDate:
                        "2026-09-20",

                    acquisitionDate:
                        "2026-09-20T05:30:00Z",

                    sceneId:
                        "S2A_TEST_20260920_001",

                    rasterId:
                        "RASTER-20260920-NDVI-001",

                    inputPath:
                        "D:\\AgriNexus\\input\\scene_20260920.tif"
                })
            );


        // ====================================================
        // 2. SECOND TEMPORAL OBSERVATION
        // ====================================================

        const secondObservationResult =
            await observationWorkflow.processTemporalObservationWorkflow(
                createObservationRequest({
                    observationDate:
                        "2026-09-25",

                    acquisitionDate:
                        "2026-09-25T05:30:00Z",

                    sceneId:
                        "S2A_TEST_20260925_001",

                    rasterId:
                        "RASTER-20260925-NDVI-001",

                    inputPath:
                        "D:\\AgriNexus\\input\\scene_20260925.tif"
                })
            );


        // ====================================================
        // OBSERVATION ASSERTIONS
        // ====================================================

        assert.equal(
            getObservationCallCount(),
            2
        );

        assert.equal(
            firstObservationResult
                .observation
                .observation
                .observationDate,
            "2026-09-20"
        );

        assert.equal(
            secondObservationResult
                .observation
                .observation
                .observationDate,
            "2026-09-25"
        );

        assert.equal(
            firstObservationResult
                .observation
                .index
                .code,
            "NDVI"
        );

        assert.equal(
            secondObservationResult
                .observation
                .index
                .code,
            "NDVI"
        );

        assert.equal(
            firstObservationResult
                .observation
                .statistics
                .mean,
            0.30
        );

        assert.equal(
            secondObservationResult
                .observation
                .statistics
                .mean,
            0.45
        );


        // ====================================================
        // 3. TEMPORAL COMPOSITION WORKFLOW
        // ====================================================

        const compositionRequest = {
            contractVersion: "1.0",

            compositionId:
                "COMPOSITION-NDVI-20260920-20260925",

            indexCode:
                "NDVI",

            observations: [
                firstObservationResult.observation,
                secondObservationResult.observation
            ],

            temporalContext: {
                startDate:
                    "2026-09-20",

                endDate:
                    "2026-09-25",

                observationCount:
                    2
            },

            spatialContext: {
                coordinateReferenceSystem:
                    "EPSG:32644",

                source:
                    "temporal-e2e-test"
            },

            processingContext: {
                source:
                    "Phase-5.1.5.5-e2e-test"
            },

            metadata: {
                scenario:
                    "two-date NDVI temporal change"
            }
        };


        const compositionWorkflowResult =
            await compositionWorkflow.processTemporalCompositionWorkflow(
                compositionRequest
            );


        // ====================================================
        // COMPOSITION ASSERTIONS
        // ====================================================

        assert.equal(
            compositionWorkflowResult
                .contractVersion,
            "1.0"
        );

        assert.ok(
            compositionWorkflowResult
                .composition
        );

        assert.equal(
            compositionWorkflowResult
                .composition
                .compositionId,
            "COMPOSITION-NDVI-20260920-20260925"
        );

        assert.equal(
            compositionWorkflowResult
                .composition
                .indexCode,
            "NDVI"
        );

        assert.equal(
            compositionWorkflowResult
                .composition
                .observations
                .length,
            2
        );

        assert.equal(
            compositionWorkflowResult
                .composition
                .temporalContext
                .startDate,
            "2026-09-20"
        );

        assert.equal(
            compositionWorkflowResult
                .composition
                .temporalContext
                .endDate,
            "2026-09-25"
        );


        // ====================================================
        // 4. TEMPORAL ANALYSIS WORKFLOW
        // ====================================================

        const analysisRequest = {
            contractVersion: "1.0",

            analysisId:
                "ANALYSIS-CHANGE-NDVI-20260920-20260925",

            analysisType:
                "CHANGE",

            composition:
                compositionWorkflowResult.composition,

            parameters: {
                comparison:
                    "first-last"
            },

            metadata: {
                scenario:
                    "two-date NDVI change analysis"
            }
        };


        const analysisWorkflowResult =
            await analysisWorkflow.processTemporalAnalysisWorkflow(
                analysisRequest
            );


        // ====================================================
        // ANALYSIS WORKFLOW ASSERTIONS
        // ====================================================

        assert.equal(
            analysisWorkflowResult
                .contractVersion,
            "1.0"
        );

        assert.equal(
            analysisWorkflowResult
                .analysisId,
            "ANALYSIS-CHANGE-NDVI-20260920-20260925"
        );

        assert.equal(
            analysisWorkflowResult
                .analysisType,
            "CHANGE"
        );

        assert.deepEqual(
            analysisWorkflowResult
                .composition,
            compositionWorkflowResult
                .composition
        );

        assert.ok(
            analysisWorkflowResult.result
        );


        // ====================================================
        // 5. TEMPORAL CHANGE RESULT
        // ====================================================

        const changeResult =
            analysisWorkflowResult.result;


        assert.equal(
            changeResult.contractVersion,
            "1.0"
        );

        assert.equal(
            changeResult.analysisType,
            "CHANGE"
        );

        assert.equal(
            changeResult.compositionId,
            "COMPOSITION-NDVI-20260920-20260925"
        );

        assert.equal(
            changeResult.indexCode,
            "NDVI"
        );


        // ----------------------------------------------------
        // Comparison
        // ----------------------------------------------------

        assert.deepEqual(
            changeResult.comparison,
            {
                startDate:
                    "2026-09-20",

                endDate:
                    "2026-09-25",

                startMean:
                    0.30,

                endMean:
                    0.45
            }
        );


        // ----------------------------------------------------
        // Scientific change result
        // ----------------------------------------------------

        assert.ok(
            Math.abs(
                changeResult.absoluteChange - 0.15
            ) < 1e-12,
            `Expected absoluteChange to be approximately 0.15, received ${changeResult.absoluteChange}`
        );

        assert.ok(
            Math.abs(
                changeResult.percentageChange - 50
            ) < 1e-12,
            `Expected percentageChange to be approximately 50, received ${changeResult.percentageChange}`
        );

        assert.equal(
            changeResult.percentageChangeStatus,
            "normal"
        );

        assert.equal(
            changeResult.direction,
            "increase"
        );


        // ====================================================
        // 6. OUTPUT RASTER ASSERTIONS
        // ====================================================

        assert.equal(
            writtenOutputs.length,
            4
        );

        assert.equal(
            writtenOutputs[0]
                .request
                .outputType,
            "continuous_index"
        );

        assert.equal(
            writtenOutputs[1]
                .request
                .outputType,
            "classification"
        );

        assert.equal(
            writtenOutputs[2]
                .request
                .outputType,
            "continuous_index"
        );

        assert.equal(
            writtenOutputs[3]
                .request
                .outputType,
            "classification"
        );


        // ====================================================
        // 7. DIRECT CHANGE SERVICE CONSISTENCY CHECK
        // ====================================================
        //
        // The workflow result must agree with the underlying
        // change-calculation service for the same composition.
        //
        // This is intentionally a second assertion of the
        // scientific calculation, not a second workflow path.
        // ====================================================

        const directChangeResult =
            changeCalculation.calculateTemporalChange(
                compositionWorkflowResult.composition
            );


        assert.deepEqual(
            directChangeResult,
            changeResult
        );
    }
);
