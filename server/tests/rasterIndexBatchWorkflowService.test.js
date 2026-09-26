"use strict";

const assert = require("node:assert/strict");
const {
    test,
    afterEach
} = require("node:test");

const {
    getIndexDefinition
} = require(
    "../scientific/remoteSensing/indices/indexRegistry"
);

const workflowServicePath =
    require.resolve(
        "../services/remoteSensing/raster/" +
        "rasterIndexWorkflowService"
    );

const batchServicePath =
    require.resolve(
        "../services/remoteSensing/raster/" +
        "rasterIndexBatchWorkflowService"
    );

const workflowService =
    require(workflowServicePath);

let originalProcessRasterIndexWorkflow =
    workflowService.processRasterIndexWorkflow;

function loadBatchServiceWithWorkflowStub(stub) {
    workflowService.processRasterIndexWorkflow =
        stub;

    delete require.cache[batchServicePath];

    return require(batchServicePath);
}

afterEach(() => {
    workflowService.processRasterIndexWorkflow =
        originalProcessRasterIndexWorkflow;

    delete require.cache[batchServicePath];
});

function validRequest(overrides = {}) {
    return {
        inputPath: "D:\\data\\scene.tif",

        indexCodes: [
            "NDVI",
            "EVI",
            "NDMI"
        ],

        bandMapping: {
            Blue: 1,
            Green: 2,
            Red: 3,
            NIR: 4,
            SWIR: 5
        },

        noData: -9999,

        parameters: {
            SAVI: {
                L: 0.5
            }
        },

        processingContext: {
            sensor: "Sentinel-2",
            sceneId: "TEST-SCENE-001"
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        outputDirectory:
            "D:\\data\\output",

        ...overrides
    };
}

function workflowResult(indexCode) {
    return {
        workflowVersion: "1.0",
        indexCode,
        input: {
            filePath: "D:\\data\\scene.tif",
            width: 4,
            height: 2,
            pixelCount: 8
        },
        processing: {
            indexCode,
            indexName: getIndexDefinition(indexCode).name,
            classificationMethod:
                "baseline_qualitative"
        },
        continuousOutput: {
            outputPath:
                `D:\\data\\output\\${indexCode}_index.tif`,
            outputType:
                "continuous_index",
            indexCode,
            dataType: "Float32",
            width: 4,
            height: 2,
            pixelCount: 8
        },
        classificationOutput: {
            outputPath:
                `D:\\data\\output\\${indexCode}_classification.tif`,
            outputType:
                "classification",
            indexCode,
            dataType: "Uint8",
            width: 4,
            height: 2,
            pixelCount: 8
        }
    };
}

test(
    "batch workflow version is 1.0",
    () => {
        const batchService =
            loadBatchServiceWithWorkflowStub(
                async () => workflowResult("NDVI")
            );

        assert.equal(
            batchService.BATCH_WORKFLOW_VERSION,
            "1.0"
        );
    }
);

test(
    "batch workflow processes indices in requested order",
    async () => {
        const calls = [];

        const batchService =
            loadBatchServiceWithWorkflowStub(
                async (request) => {
                    calls.push(request);

                    return workflowResult(
                        request.indexCode
                    );
                }
            );

        const request =
            validRequest({
                indexCodes: [
                    "NDMI",
                    "NDVI",
                    "EVI"
                ]
            });

        const result =
            await batchService
                .processRasterIndexBatchWorkflow(
                    request
                );

        assert.deepEqual(
            calls.map(
                call => call.indexCode
            ),
            [
                "NDMI",
                "NDVI",
                "EVI"
            ]
        );

        assert.deepEqual(
            result.results.map(
                item => item.indexCode
            ),
            [
                "NDMI",
                "NDVI",
                "EVI"
            ]
        );
    }
);

test(
    "batch workflow forwards common request context to every index",
    async () => {
        const calls = [];

        const batchService =
            loadBatchServiceWithWorkflowStub(
                async (request) => {
                    calls.push(request);

                    return workflowResult(
                        request.indexCode
                    );
                }
            );

        const request =
            validRequest();

        await batchService
            .processRasterIndexBatchWorkflow(
                request
            );

        assert.equal(
            calls.length,
            3
        );

        for (const call of calls) {
            assert.equal(
                call.inputPath,
                request.inputPath
            );

            assert.deepEqual(
                call.bandMapping,
                request.bandMapping
            );

            assert.equal(
                call.noData,
                request.noData
            );

            assert.deepEqual(
                call.parameters,
                request.parameters
            );

            assert.deepEqual(
                call.processingContext,
                request.processingContext
            );

            assert.deepEqual(
                call.spatialContext,
                request.spatialContext
            );

            assert.equal(
                call.outputDirectory,
                request.outputDirectory
            );
        }
    }
);

test(
    "batch workflow returns complete delegated results",
    async () => {
        const batchService =
            loadBatchServiceWithWorkflowStub(
                async (request) =>
                    workflowResult(
                        request.indexCode
                    )
            );

        const request =
            validRequest({
                indexCodes: [
                    "NDVI",
                    "EVI"
                ]
            });

        const result =
            await batchService
                .processRasterIndexBatchWorkflow(
                    request
                );

        assert.equal(
            result.batchVersion,
            "1.0"
        );

        assert.deepEqual(
            result.input,
            {
                filePath:
                    request.inputPath,

                indexCodes: [
                    "NDVI",
                    "EVI"
                ]
            }
        );

        assert.equal(
            result.results.length,
            2
        );

        assert.equal(
            result.results[0].indexCode,
            "NDVI"
        );

        assert.equal(
            result.results[1].indexCode,
            "EVI"
        );

        assert.ok(
            result.results[0].continuousOutput
        );

        assert.ok(
            result.results[0].classificationOutput
        );
    }
);

test(
    "invalid batch request is rejected before workflow execution",
    async () => {
        let workflowCallCount = 0;

        const batchService =
            loadBatchServiceWithWorkflowStub(
                async () => {
                    workflowCallCount += 1;

                    return workflowResult("NDVI");
                }
            );

        await assert.rejects(
            () =>
                batchService
                    .processRasterIndexBatchWorkflow({
                        inputPath:
                            "D:\\data\\scene.tif",

                        indexCodes: [],

                        bandMapping: {
                            Red: 3,
                            NIR: 4
                        },

                        outputDirectory:
                            "D:\\data\\output"
                    }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_RASTER_INDEX_BATCH_WORKFLOW_REQUEST"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                return true;
            }
        );

        assert.equal(
            workflowCallCount,
            0
        );
    }
);

test(
    "workflow failure stops batch processing",
    async () => {
        const calls = [];

        const batchService =
            loadBatchServiceWithWorkflowStub(
                async (request) => {
                    calls.push(
                        request.indexCode
                    );

                    if (
                        request.indexCode ===
                        "EVI"
                    ) {
                        throw new Error(
                            "Simulated EVI workflow failure"
                        );
                    }

                    return workflowResult(
                        request.indexCode
                    );
                }
            );

        await assert.rejects(
            () =>
                batchService
                    .processRasterIndexBatchWorkflow(
                        validRequest({
                            indexCodes: [
                                "NDVI",
                                "EVI",
                                "NDMI"
                            ]
                        })
                    ),
            error => {
                assert.equal(
                    error.message,
                    "Simulated EVI workflow failure"
                );

                return true;
            }
        );

        assert.deepEqual(
            calls,
            [
                "NDVI",
                "EVI"
            ]
        );
    }
);

test(
    "batch workflow does not execute indices concurrently",
    async () => {
        const events = [];
        let active = 0;
        let maximumActive = 0;

        const batchService =
            loadBatchServiceWithWorkflowStub(
                async (request) => {
                    active += 1;

                    maximumActive =
                        Math.max(
                            maximumActive,
                            active
                        );

                    events.push(
                        `start:${request.indexCode}`
                    );

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                5
                            )
                    );

                    events.push(
                        `end:${request.indexCode}`
                    );

                    active -= 1;

                    return workflowResult(
                        request.indexCode
                    );
                }
            );

        await batchService
            .processRasterIndexBatchWorkflow(
                validRequest({
                    indexCodes: [
                        "NDVI",
                        "EVI",
                        "NDMI"
                    ]
                })
            );

        assert.equal(
            maximumActive,
            1
        );

        assert.deepEqual(
            events,
            [
                "start:NDVI",
                "end:NDVI",
                "start:EVI",
                "end:EVI",
                "start:NDMI",
                "end:NDMI"
            ]
        );
    }
);
