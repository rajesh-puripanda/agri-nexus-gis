"use strict";

// ============================================================
// server/tests/rasterIndexWorkflowController.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.7
// Raster Index Workflow REST API Controller Regression
//
// Responsibilities tested:
//
//   1. Valid request validation
//   2. Workflow delegation
//   3. Successful workflow response
//   4. Optional workflow context
//   5. Invalid request response
//   6. Missing request body
//   7. Invalid service result handling
//   8. Unexpected workflow error handling
//   9. Service statusCode preservation
//
// Scientific raster processing is tested separately.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const rasterIndexWorkflowController =
    require(
        "../controllers/rasterIndexWorkflowController"
    );

const workflowService =
    require(
        "../services/remoteSensing/raster/" +
        "rasterIndexWorkflowService"
    );

function createMockResponse() {
    return {
        statusCode: null,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

function validRequest() {
    return {
        inputPath:
            "D:\\data\\scene.tif",

        indexCode:
            "NDVI",

        bandMapping: {
            Red: 3,
            NIR: 4
        },

        outputDirectory:
            "D:\\data\\output"
    };
}

function validWorkflowResult(requestData = validRequest()) {
    return {
        workflowVersion: "1.0",

        indexCode: "NDVI",

        input: {
            filePath:
                requestData.inputPath,
            width: 4,
            height: 2,
            pixelCount: 8
        },

        processing: {
            indexCode: "NDVI",
            indexName:
                "Normalized Difference Vegetation Index",
            classificationMethod:
                "baseline_qualitative"
        },

        continuousOutput: {
            outputPath:
                "D:\\data\\output\\NDVI_index.tif",
            outputType:
                "continuous_index",
            indexCode:
                "NDVI",
            dataType:
                "Float32",
            width: 4,
            height: 2,
            pixelCount: 8
        },

        classificationOutput: {
            outputPath:
                "D:\\data\\output\\NDVI_classification.tif",
            outputType:
                "classification",
            indexCode:
                "NDVI",
            dataType:
                "Uint8",
            width: 4,
            height: 2,
            pixelCount: 8
        }
    };
}

// ============================================================
// SUCCESS
// ============================================================

test(
    "processRasterIndexWorkflowRequest delegates valid request and returns HTTP 200",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        const requestData =
            validRequest();

        const expectedResult =
            validWorkflowResult(
                requestData
            );

        let receivedRequest = null;

        workflowService.processRasterIndexWorkflow =
            async (request) => {
                receivedRequest = request;
                return expectedResult;
            };

        try {
            const req = {
                body: requestData
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                200
            );

            assert.deepEqual(
                receivedRequest,
                requestData
            );

            assert.deepEqual(
                res.body,
                expectedResult
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// OPTIONAL FIELDS
// ============================================================

test(
    "processRasterIndexWorkflowRequest delegates optional workflow context",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        const requestData = {
            ...validRequest(),

            noData: -9999,

            parameters: {
                L: 0.5
            },

            processingContext: {
                source: "GeoTIFF"
            },

            spatialContext: {
                coordinateSystem:
                    "EPSG:4326"
            }
        };

        let receivedRequest = null;

        workflowService.processRasterIndexWorkflow =
            async (request) => {
                receivedRequest = request;

                return validWorkflowResult(
                    requestData
                );
            };

        try {
            const req = {
                body: requestData
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                200
            );

            assert.deepEqual(
                receivedRequest,
                requestData
            );

            assert.deepEqual(
                res.body,
                validWorkflowResult(
                    requestData
                )
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// INVALID REQUEST
// ============================================================

test(
    "processRasterIndexWorkflowRequest rejects invalid request with HTTP 400",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        let workflowCalled = false;

        workflowService.processRasterIndexWorkflow =
            async () => {
                workflowCalled = true;

                throw new Error(
                    "Workflow must not execute."
                );
            };

        try {
            const req = {
                body: {
                    inputPath: "",
                    indexCode: "UNKNOWN",
                    bandMapping: {},
                    outputDirectory: ""
                }
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                400
            );

            assert.equal(
                res.body.success,
                false
            );

            assert.equal(
                res.body.code,
                "INVALID_RASTER_INDEX_WORKFLOW_REQUEST"
            );

            assert.ok(
                Array.isArray(
                    res.body.errors
                )
            );

            assert.ok(
                res.body.errors.length > 0
            );

            assert.equal(
                workflowCalled,
                false
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// MISSING BODY
// ============================================================

test(
    "processRasterIndexWorkflowRequest safely rejects missing request body",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        let workflowCalled = false;

        workflowService.processRasterIndexWorkflow =
            async () => {
                workflowCalled = true;

                return validWorkflowResult();
            };

        try {
            const req = {};

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                400
            );

            assert.equal(
                res.body.success,
                false
            );

            assert.equal(
                res.body.code,
                "INVALID_RASTER_INDEX_WORKFLOW_REQUEST"
            );

            assert.equal(
                workflowCalled,
                false
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// INVALID SERVICE RESULT
// ============================================================

test(
    "processRasterIndexWorkflowRequest returns HTTP 500 when workflow service returns invalid result",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        workflowService.processRasterIndexWorkflow =
            async () => {
                return {
                    workflowVersion: "1.0",
                    indexCode: "NDVI"
                };
            };

        try {
            const req = {
                body:
                    validRequest()
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                500
            );

            assert.equal(
                res.body.success,
                false
            );

            assert.equal(
                res.body.code,
                "RASTER_INDEX_WORKFLOW_ERROR"
            );

            assert.match(
                res.body.message,
                /^Raster index workflow returned an invalid result:/
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// UNEXPECTED ERROR
// ============================================================

test(
    "processRasterIndexWorkflowRequest returns HTTP 500 for unexpected workflow error",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        workflowService.processRasterIndexWorkflow =
            async () => {
                throw new Error(
                    "Simulated raster workflow failure."
                );
            };

        try {
            const req = {
                body:
                    validRequest()
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                500
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    code:
                        "RASTER_INDEX_WORKFLOW_ERROR",
                    message:
                        "Simulated raster workflow failure."
                }
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);

// ============================================================
// STATUS-CODE PROPAGATION
// ============================================================

test(
    "processRasterIndexWorkflowRequest preserves service statusCode",
    async () => {
        const original =
            workflowService.processRasterIndexWorkflow;

        const error =
            new Error(
                "Raster output directory unavailable."
            );

        error.statusCode = 422;

        workflowService.processRasterIndexWorkflow =
            async () => {
                throw error;
            };

        try {
            const req = {
                body:
                    validRequest()
            };

            const res =
                createMockResponse();

            await rasterIndexWorkflowController
                .processRasterIndexWorkflowRequest(
                    req,
                    res
                );

            assert.equal(
                res.statusCode,
                422
            );

            assert.deepEqual(
                res.body,
                {
                    success: false,
                    code:
                        "RASTER_INDEX_WORKFLOW_ERROR",
                    message:
                        "Raster output directory unavailable."
                }
            );
        } finally {
            workflowService
                .processRasterIndexWorkflow =
                original;
        }
    }
);
