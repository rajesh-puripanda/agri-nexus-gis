"use strict";

// ============================================================
// server/tests/rasterIndexWorkflowApi.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.6.5
// Raster Index Workflow API Integration Tests
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { app } = require("../server");

const rasterIndexWorkflowService =
    require(
        "../services/remoteSensing/raster/" +
        "rasterIndexWorkflowService"
    );

const originalProcessRasterIndexWorkflow =
    rasterIndexWorkflowService
        .processRasterIndexWorkflow;

// ============================================================
// TEST DATA
// ============================================================

const validRequest = {
    inputPath: "D:\\data\\scene.tif",
    indexCode: "NDVI",
    bandMapping: {
        Red: 3,
        NIR: 4
    },
    outputDirectory: "D:\\data\\output"
};

const validWorkflowResult = {
    workflowVersion: "1.0",
    indexCode: "NDVI",

    input: {
        filePath: "D:\\data\\scene.tif",
        width: 2,
        height: 2,
        pixelCount: 4
    },

    processing: {
        indexCode: "NDVI",
        indexName: "Normalized Difference Vegetation Index",
        classificationMethod:
            "baseline_qualitative"
    },

    continuousOutput: {
        outputPath:
            "D:\\data\\output\\NDVI_index.tif",
        outputType: "continuous_index",
        indexCode: "NDVI",
        dataType: "Float32",
        width: 2,
        height: 2,
        pixelCount: 4
    },

    classificationOutput: {
        outputPath:
            "D:\\data\\output\\NDVI_classification.tif",
        outputType: "classification",
        indexCode: "NDVI",
        dataType: "Uint8",
        width: 2,
        height: 2,
        pixelCount: 4
    }
};

// ============================================================
// CLEANUP
// ============================================================

test.afterEach(() => {
    rasterIndexWorkflowService
        .processRasterIndexWorkflow =
        originalProcessRasterIndexWorkflow;
});

// ============================================================
// TEST 1  SUCCESS
// ============================================================

test(
    "POST /api/remote-sensing/raster/index-workflow " +
    "returns HTTP 200 with workflow result",
    async () => {

        rasterIndexWorkflowService
            .processRasterIndexWorkflow =
            async () => validWorkflowResult;

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                )
                .send(validRequest)
                .set(
                    "Content-Type",
                    "application/json"
                );

        assert.equal(response.status, 200);

        assert.deepEqual(
            response.body,
            validWorkflowResult
        );

        assert.equal(
            response.body.workflowVersion,
            "1.0"
        );

        assert.equal(
            response.body.indexCode,
            "NDVI"
        );

        assert.equal(
            response.body
                .continuousOutput
                .outputType,
            "continuous_index"
        );

        assert.equal(
            response.body
                .classificationOutput
                .outputType,
            "classification"
        );
    }
);

// ============================================================
// TEST 2  OPTIONAL CONTEXT
// ============================================================

test(
    "API accepts optional workflow context",
    async () => {

        let capturedRequest = null;

        rasterIndexWorkflowService
            .processRasterIndexWorkflow =
            async (workflowRequest) => {
                capturedRequest =
                    workflowRequest;

                return validWorkflowResult;
            };

        const requestBody = {
            ...validRequest,
            noData: -9999,
            parameters: {
                gamma: 1
            },
            processingContext: {
                sensor: "Sentinel-2"
            },
            spatialContext: {
                source: "test"
            }
        };

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                )
                .send(requestBody);

        assert.equal(response.status, 200);

        assert.deepEqual(
            capturedRequest,
            requestBody
        );
    }
);

// ============================================================
// TEST 3  INVALID REQUEST
// ============================================================

test(
    "API returns HTTP 400 for invalid request",
    async () => {

        let serviceCalled = false;

        rasterIndexWorkflowService
            .processRasterIndexWorkflow =
            async () => {
                serviceCalled = true;
                return validWorkflowResult;
            };

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                )
                .send({
                    inputPath: "",
                    indexCode: "UNKNOWN",
                    bandMapping: {},
                    outputDirectory: ""
                });

        assert.equal(response.status, 400);

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "INVALID_RASTER_INDEX_WORKFLOW_REQUEST"
        );

        assert.ok(
            Array.isArray(response.body.errors)
        );

        assert.ok(
            response.body.errors.length > 0
        );

        assert.equal(
            serviceCalled,
            false
        );
    }
);

// ============================================================
// TEST 4  MISSING BODY
// ============================================================

test(
    "API returns HTTP 400 when request body is missing",
    async () => {

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                );

        assert.equal(response.status, 400);

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "INVALID_RASTER_INDEX_WORKFLOW_REQUEST"
        );
    }
);

// ============================================================
// TEST 5  INTERNAL SERVICE ERROR
// ============================================================

test(
    "API returns HTTP 500 for unexpected workflow error",
    async () => {

        rasterIndexWorkflowService
            .processRasterIndexWorkflow =
            async () => {
                throw new Error(
                    "Simulated workflow failure"
                );
            };

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                )
                .send(validRequest);

        assert.equal(response.status, 500);

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "RASTER_INDEX_WORKFLOW_ERROR"
        );

        assert.equal(
            response.body.message,
            "Simulated workflow failure"
        );
    }
);

// ============================================================
// TEST 6  SERVICE STATUS CODE PROPAGATION
// ============================================================

test(
    "API preserves workflow service statusCode",
    async () => {

        rasterIndexWorkflowService
            .processRasterIndexWorkflow =
            async () => {

                const error =
                    new Error(
                        "Output directory unavailable"
                    );

                error.statusCode = 422;

                throw error;
            };

        const response =
            await request(app)
                .post(
                    "/api/remote-sensing/raster/index-workflow"
                )
                .send(validRequest);

        assert.equal(response.status, 422);

        assert.equal(
            response.body.success,
            false
        );

        assert.equal(
            response.body.code,
            "RASTER_INDEX_WORKFLOW_ERROR"
        );

        assert.equal(
            response.body.message,
            "Output directory unavailable"
        );
    }
);

// ============================================================
// EXPORT / COMPLETE
// ============================================================

console.log(
    "Raster Index Workflow API integration tests loaded."
);
