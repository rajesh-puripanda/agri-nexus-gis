"use strict";

const assert = require("node:assert/strict");
const {
    test,
    afterEach
} = require("node:test");

const supertest =
    require("supertest");

const {
    app
} = require("../server");

const batchServicePath =
    require.resolve(
        "../services/remoteSensing/raster/" +
        "rasterIndexBatchWorkflowService"
    );

const batchService =
    require(batchServicePath);

const originalProcess =
    batchService
        .processRasterIndexBatchWorkflow;

function validRequest() {
    return {
        inputPath:
            "D:\\data\\scene.tif",

        indexCodes: [
            "NDVI",
            "EVI"
        ],

        bandMapping: {
            Blue: 1,
            Green: 2,
            Red: 3,
            NIR: 4,
            SWIR: 5
        },

        noData: -9999,

        parameters: {},

        processingContext: {
            sensor: "Sentinel-2"
        },

        spatialContext: {
            crs: "EPSG:4326"
        },

        outputDirectory:
            "D:\\data\\output"
    };
}

function workflowResult(indexCode) {
    const names = {
        NDVI: "Normalized Difference Vegetation Index",
        EVI: "Enhanced Vegetation Index"
    };

    return {
        workflowVersion: "1.0",

        indexCode,

        input: {
            filePath:
                "D:\\data\\scene.tif",
            width: 4,
            height: 2,
            pixelCount: 8
        },

        processing: {
            indexCode,
            indexName:
                names[indexCode],
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

function batchResult() {
    return {
        batchVersion: "1.0",

        input: {
            filePath:
                "D:\\data\\scene.tif",

            indexCodes: [
                "NDVI",
                "EVI"
            ]
        },

        results: [
            workflowResult("NDVI"),
            workflowResult("EVI")
        ]
    };
}

afterEach(() => {
    batchService
        .processRasterIndexBatchWorkflow =
        originalProcess;
});

test(
    "POST batch workflow returns HTTP 200 with batch result",
    async () => {
        batchService
            .processRasterIndexBatchWorkflow =
            async request => {
                assert.deepEqual(
                    request.indexCodes,
                    [
                        "NDVI",
                        "EVI"
                    ]
                );

                return batchResult();
            };

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send(
                    validRequest()
                );

        assert.equal(
            response.status,
            200
        );

        assert.equal(
            response.body.batchVersion,
            "1.0"
        );

        assert.deepEqual(
            response.body.input.indexCodes,
            [
                "NDVI",
                "EVI"
            ]
        );

        assert.equal(
            response.body.results.length,
            2
        );
    }
);

test(
    "API forwards optional batch context",
    async () => {
        let capturedRequest;

        batchService
            .processRasterIndexBatchWorkflow =
            async request => {
                capturedRequest =
                    request;

                return batchResult();
            };

        const request =
            validRequest();

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send(request);

        assert.equal(
            response.status,
            200
        );

        assert.deepEqual(
            capturedRequest.parameters,
            request.parameters
        );

        assert.deepEqual(
            capturedRequest.processingContext,
            request.processingContext
        );

        assert.deepEqual(
            capturedRequest.spatialContext,
            request.spatialContext
        );
    }
);

test(
    "API returns HTTP 400 for invalid batch request",
    async () => {
        let serviceCalled = false;

        batchService
            .processRasterIndexBatchWorkflow =
            async () => {
                serviceCalled = true;

                return batchResult();
            };

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send({
                    inputPath:
                        "D:\\data\\scene.tif",

                    indexCodes: [],

                    bandMapping: {
                        Red: 3,
                        NIR: 4
                    },

                    outputDirectory:
                        "D:\\data\\output"
                });

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "INVALID_RASTER_INDEX_BATCH_WORKFLOW_REQUEST"
        );

        assert.ok(
            Array.isArray(
                response.body.errors
            )
        );

        assert.equal(
            serviceCalled,
            false
        );
    }
);

test(
    "API returns HTTP 400 when request body is missing",
    async () => {
        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                );

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "INVALID_RASTER_INDEX_BATCH_WORKFLOW_REQUEST"
        );
    }
);

test(
    "API returns HTTP 500 for unexpected batch workflow error",
    async () => {
        batchService
            .processRasterIndexBatchWorkflow =
            async () => {
                throw new Error(
                    "Simulated batch workflow failure"
                );
            };

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send(
                    validRequest()
                );

        assert.equal(
            response.status,
            500
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "RASTER_INDEX_BATCH_WORKFLOW_ERROR"
        );

        assert.equal(
            response.body.message,
            "Simulated batch workflow failure"
        );
    }
);

test(
    "API propagates delegated batch failure context",
    async () => {
        batchService
            .processRasterIndexBatchWorkflow =
            async () => {
                const error =
                    new Error(
                        "Simulated EVI workflow failure"
                    );

                error.code =
                    "SIMULATED_EVI_FAILURE";

                error.indexCode =
                    "EVI";

                error.batchIndex =
                    1;

                throw error;
            };

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send(
                    validRequest()
                );

        assert.equal(
            response.status,
            500
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "RASTER_INDEX_BATCH_WORKFLOW_ERROR"
        );

        assert.equal(
            response.body.message,
            "Simulated EVI workflow failure"
        );

        assert.equal(
            response.body.errorCode,
            "SIMULATED_EVI_FAILURE"
        );

        assert.equal(
            response.body.indexCode,
            "EVI"
        );

        assert.equal(
            response.body.batchIndex,
            1
        );
    }
);
test(
    "API preserves batch workflow service statusCode",
    async () => {
        batchService
            .processRasterIndexBatchWorkflow =
            async () => {
                const error =
                    new Error(
                        "Batch output unavailable"
                    );

                error.statusCode = 422;

                throw error;
            };

        const response =
            await supertest(app)
                .post(
                    "/api/remote-sensing/raster/" +
                    "index-batch-workflow"
                )
                .send(
                    validRequest()
                );

        assert.equal(
            response.status,
            422
        );

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "RASTER_INDEX_BATCH_WORKFLOW_ERROR"
        );

        assert.equal(
            response.body.message,
            "Batch output unavailable"
        );
    }
);
