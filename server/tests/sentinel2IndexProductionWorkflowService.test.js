"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    processSentinel2IndexProductionWorkflow,
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2IndexProductionWorkflowService"
);

test(
    "processSentinel2IndexProductionWorkflow resolves NDMI bands and delegates mixed-resolution processing",
    async () => {
        let preparationRequest = null;
        let rasterRequest = null;
        let postProcessingRequest = null;

        const preparationImpl =
            async (request) => {
                preparationRequest = request;

                return {
                    workflowVersion: "1.0",
                    sceneId:
                        "S2C_TEST_SCENE",
                    acquisitionDate:
                        "2026-09-08",
                    outputDirectory:
                        request.outputDirectory,
                    outputs: {
                        10: {
                            resolution: 10,
                            bands: [
                                "Blue",
                                "Green",
                                "Red",
                                "NIR",
                            ],
                            outputPath:
                                "prepared-10m.tif",
                        },
                        20: {
                            resolution: 20,
                            bands: [
                                "RedEdge1",
                                "RedEdge2",
                                "RedEdge3",
                                "RedEdge4",
                                "SWIR1",
                                "SWIR2",
                            ],
                            outputPath:
                                "prepared-20m.tif",
                        },
                    },
                };
            };

        const calculationResult = {
            results: {
                raster: {
                    contractVersion: "1.0",
                    width: 2,
                    height: 2,
                    pixelCount: 4,
                    bands: {
                        NDMI: {
                            dataType: "Float32",
                            data: [
                                0.10,
                                0.20,
                                0.30,
                                0.40,
                            ],
                        },
                    },
                },
            },

            analysisVersion: "1.0",

            timestamp:
                "2026-09-08T00:00:00.000Z",
        };

        const indexWorkflowImpl =
            async (request) => {
                rasterRequest = request;

                return {
                    indexCode:
                        request.indexCode,

                    targetResolution:
                        request.targetResolution,

                    sourceBands:
                        request.sources.map(
                            (source) => ({
                                band:
                                    source.band,
                                sourceBand:
                                    source.sourceBand,
                            })
                        ),

                    result:
                        calculationResult,
                };
            };

        const postProcessingImpl =
            async (request) => {
                postProcessingRequest =
                    request;

                return {
                    outputPaths: {
                        continuous:
                            "NDMI_index.tif",
                        classification:
                            "NDMI_classification.tif",
                    },
                };
            };

        const result =
            await processSentinel2IndexProductionWorkflow({
                request: {
                    indexCode: "NDMI",
                    parameters: {},
                },

                outputDirectory:
                    "test-output",

                targetResolution: 20,

                preparationImpl,

                indexWorkflowImpl,

                postProcessingImpl,
            });

        assert.equal(
            result.indexCode,
            "NDMI"
        );

        assert.equal(
            result.indexName,
            "Normalized Difference Moisture Index"
        );

        assert.equal(
            result.sceneId,
            "S2C_TEST_SCENE"
        );

        assert.equal(
            result.acquisitionDate,
            "2026-09-08"
        );

        assert.equal(
            result.targetResolution,
            20
        );

        assert.deepEqual(
            preparationRequest.bandNames,
            [
                "NIR",
                "SWIR1",
            ]
        );

        assert.equal(
            preparationRequest.outputDirectory,
            "test-output"
        );

        assert.equal(
            preparationRequest.outputNoData,
            -9999
        );

        assert.deepEqual(
            result.sources,
            [
                {
                    band: "NIR",
                    inputPath:
                        "prepared-10m.tif",
                    sourceBand: 4,
                },
                {
                    band: "SWIR",
                    inputPath:
                        "prepared-20m.tif",
                    sourceBand: 5,
                },
            ]
        );

        assert.equal(
            rasterRequest.indexCode,
            "NDMI"
        );

        assert.equal(
            rasterRequest.targetResolution,
            20
        );

        assert.equal(
            rasterRequest.noData,
            -9999
        );

        assert.deepEqual(
            rasterRequest.sources,
            result.sources
        );

        assert.equal(
            postProcessingRequest.indexCode,
            "NDMI"
        );

        assert.equal(
            postProcessingRequest.indexName,
            "Normalized Difference Moisture Index"
        );

        assert.equal(
            postProcessingRequest.outputDirectory,
            "test-output"
        );

        assert.equal(
            postProcessingRequest.calculationResult,
            calculationResult
        );

        assert.equal(
            result.rasterWorkflow.result,
            calculationResult
        );

        assert.deepEqual(
            result.outputProcessing.outputPaths,
            {
                continuous:
                    "NDMI_index.tif",
                classification:
                    "NDMI_classification.tif",
            }
        );
    }
);

test(
    "processSentinel2IndexProductionWorkflow rejects unknown index",
    async () => {
        await assert.rejects(
            () =>
                processSentinel2IndexProductionWorkflow({
                    request: {
                        indexCode:
                            "NOT_REAL",
                    },

                    outputDirectory:
                        "test-output",

                    targetResolution: 20,
                }),
            /Unknown remote sensing index: NOT_REAL/
        );
    }
);

test(
    "processSentinel2IndexProductionWorkflow requires explicit target resolution",
    async () => {
        await assert.rejects(
            () =>
                processSentinel2IndexProductionWorkflow({
                    request: {
                        indexCode:
                            "NDMI",
                    },

                    outputDirectory:
                        "test-output",
                }),
            /targetResolution must be a positive finite number/
        );
    }
);
