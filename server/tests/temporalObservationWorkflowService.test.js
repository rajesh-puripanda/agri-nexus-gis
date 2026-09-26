"use strict";

// ============================================================
// server/tests/temporalObservationWorkflowService.test.js
// ============================================================
//
// AgriNexus-GIS
//
// Phase 5.1.5.3.2
// Temporal Observation Workflow Service Tests
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const servicePath = require.resolve(
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

const workflowRequestContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalObservationWorkflowRequestContract"
);

const temporalObservationContractPath = require.resolve(
    "../scientific/remoteSensing/temporal/temporalIndexObservationContract"
);

const originalModules = new Map();

function installStub(modulePath, exports) {
    originalModules.set(modulePath, require.cache[modulePath]);

    require.cache[modulePath] = {
        id: modulePath,
        filename: modulePath,
        loaded: true,
        exports
    };
}

function restoreModules() {
    for (const [modulePath, original] of originalModules.entries()) {
        if (original) {
            require.cache[modulePath] = original;
        } else {
            delete require.cache[modulePath];
        }
    }

    originalModules.clear();

    delete require.cache[servicePath];
}

function loadServiceWithStubs(stubs) {
    installStub(rasterReaderPath, stubs.rasterReader);
    installStub(rasterValidationPath, stubs.rasterValidation);
    installStub(rasterNormalizationPath, stubs.rasterNormalization);
    installStub(rasterProcessingPath, stubs.rasterProcessing);
    installStub(rasterClassificationPath, stubs.rasterClassification);
    installStub(rasterOutputPath, stubs.rasterOutput);
    installStub(indexRegistryPath, stubs.indexRegistry);
    installStub(
        workflowRequestContractPath,
        stubs.workflowRequestContract
    );
    installStub(
        temporalObservationContractPath,
        stubs.temporalObservationContract
    );

    return require(servicePath);
}

test.afterEach(() => {
    restoreModules();
});

test(
    "processTemporalObservationWorkflow orchestrates the complete temporal observation pipeline",
    async () => {
        const calls = [];

        const definition = {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: {
                min: -1,
                max: 1
            },
            requiredBands: ["nir", "red"]
        };

        const readerRaster = {
            width: 2,
            height: 2,
            data: [
                [0.80, 0.70, 0.60, 0.50],
                [0.20, 0.30, 0.40, 0.50]
            ],
            noData: -9999,
            origin: [83.0, 17.0],
            resolution: [10, -10],
            boundingBox: [83.0, 16.99, 83.01, 17.0],
            geoKeys: {
                ProjectedCSTypeGeoKey: 32644
            },
            metadata: {
                fileName: "scene_20260920.tif"
            }
        };

        const normalizedRaster = {
            contractVersion: "1.0",
            width: 2,
            height: 2,
            pixelCount: 4,
            bands: {
                nir: {
                    sourceBand: 1,
                    data: [0.80, 0.70, 0.60, 0.50]
                },
                red: {
                    sourceBand: 2,
                    data: [0.20, 0.30, 0.40, 0.50]
                }
            },
            noData: -9999,
            spatialReference: {
                origin: [83.0, 17.0],
                resolution: [10, -10],
                boundingBox: [83.0, 16.99, 83.01, 17.0],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644
                }
            }
        };

        const continuousRaster = {
            width: 2,
            height: 2,
            pixelCount: 4,
            bands: {
                NDVI: {
                    data: [0.60, 0.40, 0.20, 0.00],
                    dataType: "Float32"
                }
            },
            noData: -9999
        };

        const classificationRaster = {
            width: 2,
            height: 2,
            pixelCount: 4,
            bands: {
                NDVI: {
                    data: [4, 3, 2, 1],
                    dataType: "Uint8"
                }
            },
            noData: -9999
        };

        const calculationResult = {
            analysisType: "remote_sensing_raster_index",
            analysisVersion: "1.0",

            results: {
                raster: continuousRaster
            },

            statistics: {
                validPixelCount: 4,
                noDataPixelCount: 0,
                min: 0,
                max: 0.60,
                mean: 0.30
            },

            spatialContext: {
                coordinateReferenceSystem: "EPSG:32644",
                source: "test-raster"
            }
        };

        const classificationResult = {
            classification: {
                raster: classificationRaster
            }
        };

        const outputResults = {
            continuous: {
                outputPath:
                    "D:\\AgriNexus\\outputs\\NDVI_index.tif",
                outputType: "continuous_index",
                indexCode: "NDVI",
                dataType: "Float32",
                width: 2,
                height: 2,
                pixelCount: 4,
                byteLength: 16,
                format: "GeoTIFF",
                metadata: {
                    writer: "geotiff"
                }
            },

            classification: {
                outputPath:
                    "D:\\AgriNexus\\outputs\\NDVI_classification.tif",
                outputType: "classification",
                indexCode: "NDVI",
                dataType: "Uint8",
                width: 2,
                height: 2,
                pixelCount: 4,
                byteLength: 4,
                format: "GeoTIFF",
                metadata: {
                    writer: "geotiff"
                }
            }
        };

        const request = {
            contractVersion: "1.0",

            temporalIdentity: {
                observationDate: "2026-09-20",
                acquisitionDate: "2026-09-20T05:30:00Z",
                sensor: "Sentinel-2",
                sceneId: "S2A_TEST_20260920_001"
            },

            rasterIdentity: {
                rasterId: "RASTER-20260920-NDVI-001"
            },

            workflowRequest: {
                inputPath:
                    "D:\\AgriNexus\\input\\scene_20260920.tif",
                indexCode: "ndvi",

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
                    source: "Phase-5.1.5.3.2-test"
                },

                spatialContext: {
                    coordinateReferenceSystem: "EPSG:32644",
                    source: "request"
                }
            }
        };

        const service = loadServiceWithStubs({
            rasterReader: {
                readGeoTiff: async (inputPath) => {
                    calls.push(["readGeoTiff", inputPath]);
                    return readerRaster;
                }
            },

            rasterValidation: {
                validateRaster: (args) => {
                    calls.push(["validateRaster", args]);
                    return {
                        valid: true
                    };
                }
            },

            rasterNormalization: {
                normalizeRaster: (args) => {
                    calls.push(["normalizeRaster", args]);
                    return normalizedRaster;
                }
            },

            rasterProcessing: {
                processRasterIndex: (args) => {
                    calls.push(["processRasterIndex", args]);
                    return calculationResult;
                }
            },

            rasterClassification: {
                processRasterIndexClassification: (args) => {
                    calls.push([
                        "processRasterIndexClassification",
                        args
                    ]);
                    return classificationResult;
                }
            },

            rasterOutput: {
                writeRasterOutput: async (args) => {
                    calls.push(["writeRasterOutput", args]);

                    if (
                        args.request.outputType ===
                        "continuous_index"
                    ) {
                        return outputResults.continuous;
                    }

                    return outputResults.classification;
                }
            },

            indexRegistry: {
                getIndexDefinition: (indexCode) => {
                    calls.push([
                        "getIndexDefinition",
                        indexCode
                    ]);
                    return definition;
                }
            },

            workflowRequestContract: {
                createTemporalObservationWorkflowRequestContract:
                    (input) => {
                        calls.push([
                            "createTemporalObservationWorkflowRequestContract",
                            input
                        ]);

                        return {
                            contractVersion: "1.0",
                            temporalIdentity: {
                                observationDate:
                                    "2026-09-20",
                                acquisitionDate:
                                    "2026-09-20T05:30:00Z",
                                sensor: "Sentinel-2",
                                sceneId:
                                    "S2A_TEST_20260920_001"
                            },
                            rasterIdentity: {
                                rasterId:
                                    "RASTER-20260920-NDVI-001"
                            },
                            workflowRequest: {
                                inputPath:
                                    "D:\\AgriNexus\\input\\scene_20260920.tif",
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
                                        "Phase-5.1.5.3.2-test"
                                },
                                spatialContext: {
                                    coordinateReferenceSystem:
                                        "EPSG:32644",
                                    source: "request"
                                }
                            }
                        };
                    }
            },

            temporalObservationContract: {
                createTemporalIndexObservation:
                    (input) => {
                        calls.push([
                            "createTemporalIndexObservation",
                            input
                        ]);

                        return input;
                    }
            }
        });

        const result =
            await service.processTemporalObservationWorkflow(
                request
            );

        assert.ok(result);

        assert.equal(
            result.observation.observation.observationDate,
            "2026-09-20"
        );

        assert.equal(
            result.observation.observation.acquisitionDate,
            "2026-09-20T05:30:00Z"
        );

        assert.equal(
            result.observation.observation.sensor,
            "Sentinel-2"
        );

        assert.equal(
            result.observation.observation.sceneId,
            "S2A_TEST_20260920_001"
        );

        assert.equal(
            result.observation.observation.indexCode,
            "NDVI"
        );

        assert.equal(
            result.observation.raster.rasterId,
            "RASTER-20260920-NDVI-001"
        );

        assert.equal(
            result.observation.raster.width,
            2
        );

        assert.equal(
            result.observation.raster.height,
            2
        );

        assert.equal(
            result.observation.raster.pixelCount,
            4
        );

        assert.equal(
            result.observation.statistics.validPixelCount,
            4
        );

        assert.equal(
            result.observation.statistics.noDataPixelCount,
            0
        );

        assert.equal(
            result.observation.statistics.minimum,
            0
        );

        assert.equal(
            result.observation.statistics.maximum,
            0.60
        );

        assert.equal(
            result.observation.statistics.mean,
            0.30
        );

        assert.deepEqual(
            result.observation.spatialContext,
            calculationResult.spatialContext
        );

        assert.deepEqual(
            result.observation.processingContext,
            {
                source:
                    "Phase-5.1.5.3.2-test"
            }
        );

        assert.equal(
            result.continuousOutput.outputType,
            "continuous_index"
        );

        assert.equal(
            result.continuousOutput.indexCode,
            "NDVI"
        );

        assert.equal(
            result.classificationOutput.outputType,
            "classification"
        );

        assert.equal(
            result.classificationOutput.indexCode,
            "NDVI"
        );

        assert.equal(
            result.continuousOutput.outputPath,
            path.join(
                "D:\\AgriNexus\\outputs",
                "NDVI_index.tif"
            )
        );

        assert.equal(
            result.classificationOutput.outputPath,
            path.join(
                "D:\\AgriNexus\\outputs",
                "NDVI_classification.tif"
            )
        );

        const processingCall =
            calls.find(
                ([name]) =>
                    name === "processRasterIndex"
            );

        assert.deepEqual(
            processingCall[1].processingContext,
            {
                source:
                    "Phase-5.1.5.3.2-test"
            }
        );

        assert.deepEqual(
            processingCall[1].spatialContext,
            {
                coordinateReferenceSystem:
                    "EPSG:32644",
                source: "request"
            }
        );

        const classificationCall =
            calls.find(
                ([name]) =>
                    name ===
                    "processRasterIndexClassification"
            );

        assert.deepEqual(
            classificationCall[1].spatialContext,
            calculationResult.spatialContext
        );

        const observationCall =
            calls.find(
                ([name]) =>
                    name ===
                    "createTemporalIndexObservation"
            );

        assert.ok(observationCall);

        assert.equal(
            observationCall[1].raster.rasterId,
            "RASTER-20260920-NDVI-001"
        );

        assert.equal(
            observationCall[1].statistics.mean,
            0.30
        );

        assert.equal(
            calls.filter(
                ([name]) =>
                    name === "writeRasterOutput"
            ).length,
            2
        );
    }
);

test(
    "buildOutputPaths produces the frozen raster output naming convention",
    () => {
        const service =
            require(
                "../services/remoteSensing/temporal/temporalObservationWorkflowService"
            );

        const result =
            service.buildOutputPaths({
                outputDirectory:
                    "D:\\AgriNexus\\outputs",
                indexCode: "NDVI"
            });

        assert.equal(
            result.continuous,
            path.join(
                "D:\\AgriNexus\\outputs",
                "NDVI_index.tif"
            )
        );

        assert.equal(
            result.classification,
            path.join(
                "D:\\AgriNexus\\outputs",
                "NDVI_classification.tif"
            )
        );
    }
);

test(
    "createContinuousOutputRaster preserves raster content and sets Float32",
    () => {
        const service =
            require(
                "../services/remoteSensing/temporal/temporalObservationWorkflowService"
            );

        const raster = {
            width: 1,
            height: 1,
            bands: {
                NDVI: {
                    data: [0.5],
                    dataType: "Float64"
                }
            }
        };

        const result =
            service.createContinuousOutputRaster({
                raster,
                indexCode: "NDVI"
            });

        assert.equal(
            result.bands.NDVI.dataType,
            "Float32"
        );

        assert.deepEqual(
            result.bands.NDVI.data,
            [0.5]
        );
    }
);

test(
    "createClassificationOutputRaster preserves raster content and sets Uint8",
    () => {
        const service =
            require(
                "../services/remoteSensing/temporal/temporalObservationWorkflowService"
            );

        const raster = {
            width: 1,
            height: 1,
            bands: {
                NDVI: {
                    data: [3],
                    dataType: "Int32"
                }
            }
        };

        const result =
            service.createClassificationOutputRaster({
                raster,
                indexCode: "NDVI"
            });

        assert.equal(
            result.bands.NDVI.dataType,
            "Uint8"
        );

        assert.deepEqual(
            result.bands.NDVI.data,
            [3]
        );
    }
);
