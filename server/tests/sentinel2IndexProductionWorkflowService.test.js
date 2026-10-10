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
    "processSentinel2IndexProductionWorkflow resolves SSMI SWIR1 and SWIR2 bands at 20m",
    async () => {
        let preparationRequest = null;
        let rasterRequest = null;

        const preparationImpl = async (request) => {
            preparationRequest = request;

            return {
                workflowVersion: "1.0",
                sceneId: "S2C_SSMI_TEST_SCENE",
                acquisitionDate: "2026-09-28T04:47:01.025000Z",
                outputDirectory: request.outputDirectory,
                outputs: {
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
                        outputPath: "prepared-20m.tif",
                    },
                },
            };
        };

        const indexWorkflowImpl = async (request) => {
            rasterRequest = request;

            return {
                indexCode: request.indexCode,
                targetResolution: request.targetResolution,
                sourceBands: request.sources.map((source) => ({
                    band: source.band,
                    sourceBand: source.sourceBand,
                    inputPath: source.inputPath,
                })),
                result: {
                    results: {
                        raster: {
                            width: 2,
                            height: 2,
                            pixelCount: 4,
                            bands: {
                                SSMI: {
                                    dataType: "Float32",
                                    data: [0.1, 0.2, 0.3, 0.4],
                                },
                            },
                        },
                    },
                },
            };
        };

        const result = await processSentinel2IndexProductionWorkflow({
            request: {
                indexCode: "SSMI",
                parameters: {},
            },
            outputDirectory: "test-output",
            targetResolution: 20,
            preparationImpl,
            indexWorkflowImpl,
            postProcessingImpl: async () => ({
                outputPaths: {
                    continuous: "SSMI_index.tif",
                    classification: "SSMI_classification.tif",
                },
            }),
        });

        assert.equal(result.indexCode, "SSMI");
        assert.equal(result.indexName, "Surface Soil Moisture Indicator");
        assert.equal(result.targetResolution, 20);
        assert.equal(result.acquisitionDate, "2026-09-28");

        assert.deepEqual(preparationRequest.bandNames, [
            "SWIR1",
            "SWIR2",
        ]);

        assert.deepEqual(result.sources, [
            {
                band: "SWIR1",
                inputPath: "prepared-20m.tif",
                sourceBand: 5,
            },
            {
                band: "SWIR2",
                inputPath: "prepared-20m.tif",
                sourceBand: 6,
            },
        ]);

        assert.equal(rasterRequest.indexCode, "SSMI");
        assert.equal(rasterRequest.targetResolution, 20);
        assert.deepEqual(rasterRequest.sources, result.sources);
    }
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
    "processSentinel2IndexProductionWorkflow resolves NDVI Red and NIR bands",
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
                        "S2C_NDVI_TEST_SCENE",

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
                        NDVI: {
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
                            "NDVI_index.tif",

                        classification:
                            "NDVI_classification.tif",
                    },
                };
            };

        const result =
            await processSentinel2IndexProductionWorkflow({
                request: {
                    indexCode: "NDVI",
                    parameters: {},
                },

                outputDirectory:
                    "test-output",

                targetResolution: 10,

                preparationImpl,

                indexWorkflowImpl,

                postProcessingImpl,
            });

        assert.equal(
            result.indexCode,
            "NDVI"
        );

        assert.equal(
            result.indexName,
            "Normalized Difference Vegetation Index"
        );

        assert.equal(
            result.sceneId,
            "S2C_NDVI_TEST_SCENE"
        );

        assert.equal(
            result.acquisitionDate,
            "2026-09-08"
        );

        assert.equal(
            result.targetResolution,
            10
        );

        assert.deepEqual(
            preparationRequest.bandNames,
            [
                "NIR",
                "Red",
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
                    band: "Red",
                    inputPath:
                        "prepared-10m.tif",
                    sourceBand: 3,
                },
            ]
        );

        assert.equal(
            rasterRequest.indexCode,
            "NDVI"
        );

        assert.equal(
            rasterRequest.targetResolution,
            10
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
            "NDVI"
        );

        assert.equal(
            postProcessingRequest.indexName,
            "Normalized Difference Vegetation Index"
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
                    "NDVI_index.tif",

                classification:
                    "NDVI_classification.tif",
            }
        );
    }
);

test(
    "processSentinel2IndexProductionWorkflow resolves BSI bands across 10m and 20m resolutions",
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
                        "S2C_BSI_TEST_SCENE",

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
                        BSI: {
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
                            "BSI_index.tif",

                        classification:
                            "BSI_classification.tif",
                    },
                };
            };

        const result =
            await processSentinel2IndexProductionWorkflow({
                request: {
                    indexCode: "BSI",
                    parameters: {},
                },

                outputDirectory:
                    "test-output",

                targetResolution: 10,

                preparationImpl,

                indexWorkflowImpl,

                postProcessingImpl,
            });

        assert.equal(
            result.indexCode,
            "BSI"
        );

        assert.equal(
            result.indexName,
            "Bare Soil Index"
        );

        assert.equal(
            result.sceneId,
            "S2C_BSI_TEST_SCENE"
        );

        assert.equal(
            result.acquisitionDate,
            "2026-09-08"
        );

        assert.equal(
            result.targetResolution,
            10
        );

        assert.deepEqual(
            preparationRequest.bandNames,
            [
                "Blue",
                "Red",
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
                    band: "Blue",
                    inputPath:
                        "prepared-10m.tif",
                    sourceBand: 1,
                },

                {
                    band: "Red",
                    inputPath:
                        "prepared-10m.tif",
                    sourceBand: 3,
                },

                {
                    band: "NIR",
                    inputPath:
                        "prepared-10m.tif",
                    sourceBand: 4,
                },

                {
                    band: "SWIR1",
                    inputPath:
                        "prepared-20m.tif",
                    sourceBand: 5,
                },
            ]
        );

        assert.equal(
            rasterRequest.indexCode,
            "BSI"
        );

        assert.equal(
            rasterRequest.targetResolution,
            10
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
            "BSI"
        );

        assert.equal(
            postProcessingRequest.indexName,
            "Bare Soil Index"
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
                    "BSI_index.tif",

                classification:
                    "BSI_classification.tif",
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

test(
    "processSentinel2IndexProductionWorkflow resolves SBI Green Red and NIR bands at 10m",
    async () => {
        let preparationRequest = null;
        let rasterRequest = null;
        let postProcessingRequest = null;

        const preparationImpl =
            async (request) => {
                preparationRequest = request;

                return {
                    workflowVersion: "1.0",
                    sceneId: "S2C_SBI_TEST_SCENE",
                    acquisitionDate: "2026-09-08",
                    outputDirectory: request.outputDirectory,
                    outputs: {
                        10: {
                            resolution: 10,
                            bands: [
                                "Blue",
                                "Green",
                                "Red",
                                "NIR",
                            ],
                            outputPath: "prepared-10m.tif",
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
                        SBI: {
                            dataType: "Float32",
                            data: [
                                0.30,
                                0.60,
                                0.90,
                                1.20,
                            ],
                        },
                    },
                },
            },
            analysisVersion: "1.0",
            timestamp: "2026-09-08T00:00:00.000Z",
        };

        const indexWorkflowImpl =
            async (request) => {
                rasterRequest = request;

                return {
                    indexCode: request.indexCode,
                    targetResolution: request.targetResolution,
                    sourceBands: request.sources.map(
                        (source) => ({
                            band: source.band,
                            sourceBand: source.sourceBand,
                        })
                    ),
                    result: calculationResult,
                };
            };

        const postProcessingImpl =
            async (request) => {
                postProcessingRequest = request;

                return {
                    outputPaths: {
                        continuous: "SBI_index.tif",
                        classification: "SBI_classification.tif",
                    },
                };
            };

        const result =
            await processSentinel2IndexProductionWorkflow({
                request: {
                    indexCode: "SBI",
                    parameters: {},
                },
                outputDirectory: "test-output",
                targetResolution: 10,
                preparationImpl,
                indexWorkflowImpl,
                postProcessingImpl,
            });

        assert.equal(result.indexCode, "SBI");
        assert.equal(result.indexName, "Soil Brightness Index");
        assert.equal(result.sceneId, "S2C_SBI_TEST_SCENE");
        assert.equal(result.acquisitionDate, "2026-09-08");
        assert.equal(result.targetResolution, 10);

        assert.deepEqual(
            preparationRequest.bandNames,
            [
                "Green",
                "Red",
                "NIR",
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
                    band: "Green",
                    inputPath: "prepared-10m.tif",
                    sourceBand: 2,
                },
                {
                    band: "Red",
                    inputPath: "prepared-10m.tif",
                    sourceBand: 3,
                },
                {
                    band: "NIR",
                    inputPath: "prepared-10m.tif",
                    sourceBand: 4,
                },
            ]
        );

        assert.equal(
            rasterRequest.indexCode,
            "SBI"
        );

        assert.equal(
            rasterRequest.targetResolution,
            10
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
            "SBI"
        );

        assert.equal(
            postProcessingRequest.indexName,
            "Soil Brightness Index"
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
                continuous: "SBI_index.tif",
                classification: "SBI_classification.tif",
            }
        );
    }
);

test(
  "processSentinel2IndexProductionWorkflow resolves NDSI NIR and SWIR1 bands across 10m and 20m resolutions",
  async () => {
    let preparationRequest = null;
    let rasterRequest = null;
    let postProcessingRequest = null;

    const preparationImpl =
      async (request) => {
        preparationRequest = request;

        return {
          workflowVersion: "1.0",
          sceneId: "S2C_NDSI_TEST_SCENE",
          acquisitionDate: "2026-09-08",
          outputDirectory: request.outputDirectory,

          outputs: {
            10: {
              resolution: 10,
              bands: [
                "Blue",
                "Green",
                "Red",
                "NIR",
              ],
              outputPath: "prepared-10m.tif",
            },

            20: {
              resolution: 20,
              bands: [
                "RedEdge1",
                "RedEdge2",
                "RedEdge3",
                "NIR",
                "SWIR1",
                "SWIR2",
              ],
              outputPath: "prepared-20m.tif",
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
            NDSI: {
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
          result: calculationResult,
        };
      };

    const postProcessingImpl =
      async (request) => {
        postProcessingRequest = request;

        return {
          outputPaths: {
            continuous:
              "NDSI_index.tif",

            classification:
              "NDSI_classification.tif",
          },
        };
      };

    const result =
      await processSentinel2IndexProductionWorkflow({
        request: {
          indexCode: "NDSI",
          acquisitionParameters: {
            sceneId: "S2C_NDSI_EXPLICIT_SCENE"
          },
          parameters: {},
        },

        outputDirectory:
            "test-acquisition",

        analyticalOutputDirectory:
            "test-output",

        targetResolution: 10,

        preparationImpl,

        indexWorkflowImpl,

        postProcessingImpl,
      });

    assert.equal(
      result.indexCode,
      "NDSI"
    );

    assert.equal(
      result.indexName,
      "Normalized Difference Soil Index"
    );

    assert.equal(
      result.sceneId,
      "S2C_NDSI_TEST_SCENE"
    );

    assert.equal(
      result.acquisitionDate,
      "2026-09-08"
    );

    assert.equal(
      result.targetResolution,
      10
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
        "test-acquisition"
        );

    assert.equal(
        postProcessingRequest.outputDirectory,
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
          inputPath: "prepared-10m.tif",
          sourceBand: 4,
        },
        {
          band: "SWIR1",
          inputPath: "prepared-20m.tif",
          sourceBand: 5,
        },
      ]
    );

    assert.equal(
      rasterRequest.indexCode,
      "NDSI"
    );

    assert.equal(
      rasterRequest.targetResolution,
      10
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
      "NDSI"
    );

    assert.equal(
      postProcessingRequest.indexName,
      "Normalized Difference Soil Index"
    );

    assert.equal(
        preparationRequest.outputDirectory,
        "test-acquisition"
    );

    assert.equal(
        postProcessingRequest.outputDirectory,
        "test-output"
    );

    assert.equal(
      postProcessingRequest.calculationResult,
      calculationResult
    );


    assert.deepEqual(
      result.outputProcessing.outputPaths,
      {
        continuous:
          "NDSI_index.tif",

        classification:
          "NDSI_classification.tif",
      }
    );
  }
);

test(
    "publishes scene archive outputs to stable analytical paths",
    async () => {
        const fs = require("node:fs/promises");
        const os = require("node:os");
        const path = require("node:path");

        const temporaryRoot = await fs.mkdtemp(
            path.join(os.tmpdir(), "agrinexus-publication-test-")
        );

        try {
            const acquisitionDirectory = path.join(
                temporaryRoot,
                "acquisition"
            );
            const productionRoot = path.join(
                temporaryRoot,
                "production"
            );
            const analyticalDirectory = path.join(
                temporaryRoot,
                "analytical"
            );
            const sceneId = "S2C_PUBLICATION_TEST_SCENE";
            const sceneDirectory = path.join(
                productionRoot,
                sceneId
            );

            const rasterBytes = {
                continuous: "test-continuous-raster",
                classification: "test-classification-raster",
            };

            let postProcessingRequest = null;

            const preparationImpl = async (request) => ({
                workflowVersion: "1.0",
                sceneId,
                acquisitionDate: "2026-09-08",
                outputDirectory: request.outputDirectory,
                outputs: {
                    10: {
                        resolution: 10,
                        bands: ["Blue", "Green", "Red", "NIR"],
                        outputPath: "prepared-10m.tif",
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
                        outputPath: "prepared-20m.tif",
                    },
                },
            });

            const indexWorkflowImpl = async () => ({
                result: {
                    results: {
                        raster: {
                            contractVersion: "1.0",
                            width: 2,
                            height: 2,
                            pixelCount: 4,
                            bands: {
                                NDSI: {
                                    dataType: "Float32",
                                    data: [0.1, 0.2, 0.3, 0.4],
                                },
                            },
                        },
                    },
                    analysisVersion: "1.0",
                    timestamp: "2026-09-08T00:00:00.000Z",
                },
            });

            const postProcessingImpl = async (request) => {
                postProcessingRequest = request;

                await fs.mkdir(request.outputDirectory, {
                    recursive: true,
                });

                const continuousPath = path.join(
                    request.outputDirectory,
                    "NDSI_index.tif"
                );
                const classificationPath = path.join(
                    request.outputDirectory,
                    "NDSI_classification.tif"
                );

                await fs.writeFile(
                    continuousPath,
                    rasterBytes.continuous
                );
                await fs.writeFile(
                    classificationPath,
                    rasterBytes.classification
                );

                return {
                    outputPaths: {
                        continuous: continuousPath,
                        classification: classificationPath,
                    },
                };
            };

            await processSentinel2IndexProductionWorkflow({
                request: {
                    indexCode: "NDSI",
                    parameters: {},
                },
                outputDirectory: acquisitionDirectory,
                productionDirectory: productionRoot,
                analyticalOutputDirectory: analyticalDirectory,
                targetResolution: 10,
                preparationImpl,
                indexWorkflowImpl,
                postProcessingImpl,
            });

            assert.equal(
                postProcessingRequest.outputDirectory,
                sceneDirectory
            );

            const expectedFiles = [
                ["NDSI_index.tif", rasterBytes.continuous],
                [
                    "NDSI_classification.tif",
                    rasterBytes.classification,
                ],
            ];

            for (const [fileName, expectedContent] of expectedFiles) {
                assert.equal(
                    await fs.readFile(
                        path.join(sceneDirectory, fileName),
                        "utf8"
                    ),
                    expectedContent,
                    `scene archive file ${fileName}`
                );

                assert.equal(
                    await fs.readFile(
                        path.join(analyticalDirectory, fileName),
                        "utf8"
                    ),
                    expectedContent,
                    `stable analytical file ${fileName}`
                );
            }

            // Verify the scene-specific production manifest.
            const manifestPath = path.join(
                sceneDirectory,
                "production_metadata.json"
            );

            const manifest = JSON.parse(
                await fs.readFile(manifestPath, "utf8")
            );

            assert.equal(
                manifest.observation.sceneId,
                sceneId,
                "manifest observation should identify the scene"
            );

            assert.equal(
                manifest.observation.acquisitionDate,
                "2026-09-08",
                "manifest observation should record the acquisition date"
            );

            assert.ok(
                Array.isArray(manifest.products),
                "manifest should contain a products array"
            );

            assert.ok(
                manifest.products.some(
                    (product) =>
                        product.indexCode === "NDSI" &&
                        product.sceneId === sceneId &&
                        product.acquisitionDate === "2026-09-08" &&
                        product.outputs?.continuous === "NDSI_index.tif" &&
                        product.outputs?.classification ===
                            "NDSI_classification.tif"
                ),
                "manifest should record both NDSI output files"
            );
        } finally {
            await fs.rm(temporaryRoot, {
                recursive: true,
                force: true,
            });
        }
    }
);




test(
    "does not publish either stable output when a source file is missing",
    async () => {
        const fs = require("node:fs/promises");
        const os = require("node:os");
        const path = require("node:path");

        const temporaryRoot = await fs.mkdtemp(
            path.join(os.tmpdir(), "agrinexus-publication-failure-")
        );

        try {
            const productionRoot = path.join(
                temporaryRoot,
                "production"
            );
            const analyticalDirectory = path.join(
                temporaryRoot,
                "analytical"
            );
            const sourceDirectory = path.join(
                temporaryRoot,
                "sources"
            );
            const sceneId = "S2C_PUBLICATION_FAILURE_SCENE";

            await fs.mkdir(sourceDirectory, { recursive: true });
            await fs.mkdir(analyticalDirectory, { recursive: true });

            const stableContinuous = path.join(
                analyticalDirectory,
                "NDSI_index.tif"
            );
            const stableClassification = path.join(
                analyticalDirectory,
                "NDSI_classification.tif"
            );
            const validContinuousSource = path.join(
                sourceDirectory,
                "NDSI_index.tif"
            );
            const missingClassificationSource = path.join(
                sourceDirectory,
                "missing-classification.tif"
            );

            await fs.writeFile(stableContinuous, "old-continuous");
            await fs.writeFile(stableClassification, "old-classification");
            await fs.writeFile(validContinuousSource, "new-continuous");

            const preparationImpl = async (request) => ({
                workflowVersion: "1.0",
                sceneId,
                acquisitionDate: "2026-09-08",
                outputDirectory: request.outputDirectory,
                outputs: {
                    10: {
                        resolution: 10,
                        bands: ["Blue", "Green", "Red", "NIR"],
                        outputPath: "prepared-10m.tif",
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
                        outputPath: "prepared-20m.tif",
                    },
                },
            });

            const indexWorkflowImpl = async () => ({
                result: {
                    results: {
                        raster: {
                            contractVersion: "1.0",
                            width: 2,
                            height: 2,
                            pixelCount: 4,
                            bands: {
                                NDSI: {
                                    dataType: "Float32",
                                    data: [0.1, 0.2, 0.3, 0.4],
                                },
                            },
                        },
                    },
                    analysisVersion: "1.0",
                    timestamp: "2026-09-08T00:00:00.000Z",
                },
            });

            const postProcessingImpl = async () => ({
                outputPaths: {
                    continuous: validContinuousSource,
                    classification: missingClassificationSource,
                },
            });

            await assert.rejects(
                processSentinel2IndexProductionWorkflow({
                    request: {
                        indexCode: "NDSI",
                        parameters: {},
                    },
                    outputDirectory: path.join(temporaryRoot, "acquisition"),
                    productionDirectory: productionRoot,
                    analyticalOutputDirectory: analyticalDirectory,
                    targetResolution: 10,
                    preparationImpl,
                    indexWorkflowImpl,
                    postProcessingImpl,
                }),
                (error) => error && error.code === "ENOENT"
            );

            assert.equal(
                await fs.readFile(stableContinuous, "utf8"),
                "old-continuous"
            );
            assert.equal(
                await fs.readFile(stableClassification, "utf8"),
                "old-classification"
            );

            const stableFiles = await fs.readdir(analyticalDirectory);
            assert.equal(
                stableFiles.some((name) => name.includes(".tmp-")),
                false,
                "temporary publication files should be cleaned up"
            );
        } finally {
            await fs.rm(temporaryRoot, {
                recursive: true,
                force: true,
            });
        }
    }
);
