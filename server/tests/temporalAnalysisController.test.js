"use strict";

// ============================================================
// server/tests/temporalAnalysisController.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.19
// Temporal Analysis Workflow REST API Controller Regression
//
// Responsibilities tested:
//
//   1. Valid request validation
//   2. Workflow delegation
//   3. Successful workflow response
//   4. Invalid request response
//   5. Missing request body
//   6. Invalid service result handling
//   7. Unexpected workflow error handling
//   8. Service statusCode preservation
//
// Scientific temporal calculations are tested separately.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const temporalAnalysisController =
    require(
        "../controllers/temporalAnalysisController"
    );

const workflowService =
    require(
        "../services/remoteSensing/temporal/" +
        "temporalAnalysisWorkflowService"
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
        contractVersion: "1.0",

        analysisId:
            "TEMP-CTRL-001",

        analysisType:
            "CHANGE",

        composition: {
            contractVersion: "1.0",

            compositionId:
                "COMP-CTRL-001",

            indexCode:
                "NDVI",

            observations: [
                {
                    contractVersion: "1.0",

                    observation: {
                        observationDate:
                            "2025-06-01",

                        acquisitionDate:
                            "2025-06-01",

                        sensor:
                            "Sentinel-2",

                        sceneId:
                            "SCENE-001",

                        indexCode:
                            "NDVI"
                    },

                    raster: {
                        rasterId:
                            "RASTER-001",

                        width: 10,

                        height: 10,

                        pixelCount: 100
                    },

                    index: {
                        code:
                            "NDVI",

                        name:
                            "Normalized Difference Vegetation Index",

                        validRange: {
                            min: -1,

                            max: 1
                        }
                    },

                    statistics: {
                        validPixelCount:
                            95,

                        noDataPixelCount:
                            5,

                        minimum:
                            0.20,

                        maximum:
                            0.80,

                        mean:
                            0.50
                    },

                    spatialContext: {},

                    processingContext: {}
                },

                {
                    contractVersion: "1.0",

                    observation: {
                        observationDate:
                            "2025-10-01",

                        acquisitionDate:
                            "2025-10-01",

                        sensor:
                            "Sentinel-2",

                        sceneId:
                            "SCENE-002",

                        indexCode:
                            "NDVI"
                    },

                    raster: {
                        rasterId:
                            "RASTER-002",

                        width: 10,

                        height: 10,

                        pixelCount: 100
                    },

                    index: {
                        code:
                            "NDVI",

                        name:
                            "Normalized Difference Vegetation Index",

                        validRange: {
                            min: -1,

                            max: 1
                        }
                    },

                    statistics: {
                        validPixelCount:
                            92,

                        noDataPixelCount:
                            8,

                        minimum:
                            0.30,

                        maximum:
                            0.90,

                        mean:
                            0.65
                    },

                    spatialContext: {},

                    processingContext: {}
                }
            ],

            temporalContext: {
                startDate:
                    "2025-06-01",

                endDate:
                    "2025-10-01",

                observationCount:
                    2
            },

            spatialContext: {},

            processingContext: {}
        }
    };
}

function validWorkflowResult(requestData = validRequest()) {
    return {
        contractVersion:
            "1.0",

        analysisId:
            requestData.analysisId,

        analysisType:
            "CHANGE",

        composition:
            requestData.composition,

        result: {
            contractVersion:
                "1.0",

            analysisType:
                "CHANGE",

            compositionId:
                requestData.composition.compositionId,

            indexCode:
                "NDVI",

            comparison: {},

            absoluteChange:
                0.15,

            percentageChange:
                30,

            percentageChangeStatus:
                "normal",

            direction:
                "increase"
        }
    };
}

// ============================================================
// SUCCESS
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest delegates valid request and returns HTTP 200",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        const requestData =
            validRequest();

        const expectedResult =
            validWorkflowResult(
                requestData
            );

        let receivedRequest = null;

        workflowService
            .processTemporalAnalysisWorkflow =
            async (request) => {
                receivedRequest = request;

                return expectedResult;
            };

        try {
            const req = {
                body:
                    requestData
            };

            const res =
                createMockResponse();

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);

// ============================================================
// INVALID REQUEST
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest rejects invalid request with HTTP 400",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        let workflowCalled = false;

        workflowService
            .processTemporalAnalysisWorkflow =
            async () => {
                workflowCalled = true;

                throw new Error(
                    "Workflow must not execute."
                );
            };

        try {
            const req = {
                body: {
                    contractVersion:
                        "1.0",

                    analysisId:
                        "BAD-001",

                    analysisType:
                        "CHANGE"
                }
            };

            const res =
                createMockResponse();

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST"
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
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);

// ============================================================
// MISSING BODY
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest safely rejects missing request body",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        let workflowCalled = false;

        workflowService
            .processTemporalAnalysisWorkflow =
            async () => {
                workflowCalled = true;

                return validWorkflowResult();
            };

        try {
            const req = {};

            const res =
                createMockResponse();

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST"
            );

            assert.equal(
                workflowCalled,
                false
            );
        } finally {
            workflowService
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);

// ============================================================
// INVALID SERVICE RESULT
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest returns HTTP 500 when workflow service returns invalid result",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        workflowService
            .processTemporalAnalysisWorkflow =
            async () => {
                return {
                    contractVersion:
                        "1.0",

                    analysisId:
                        "TEMP-CTRL-001"
                };
            };

        try {
            const req = {
                body:
                    validRequest()
            };

            const res =
                createMockResponse();

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                "TEMPORAL_ANALYSIS_WORKFLOW_ERROR"
            );

            assert.match(
                res.body.message,
                /^Temporal analysis workflow returned an invalid result:/
            );
        } finally {
            workflowService
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);

// ============================================================
// UNEXPECTED ERROR
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest returns HTTP 500 for unexpected workflow error",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        workflowService
            .processTemporalAnalysisWorkflow =
            async () => {
                throw new Error(
                    "Simulated temporal workflow failure."
                );
            };

        try {
            const req = {
                body:
                    validRequest()
            };

            const res =
                createMockResponse();

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                        "TEMPORAL_ANALYSIS_WORKFLOW_ERROR",

                    message:
                        "Simulated temporal workflow failure."
                }
            );
        } finally {
            workflowService
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);

// ============================================================
// STATUS-CODE PROPAGATION
// ============================================================

test(
    "processTemporalAnalysisWorkflowRequest preserves service statusCode",
    async () => {
        const original =
            workflowService
                .processTemporalAnalysisWorkflow;

        const error =
            new Error(
                "Temporal workflow dependency unavailable."
            );

        error.statusCode =
            422;

        workflowService
            .processTemporalAnalysisWorkflow =
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

            await temporalAnalysisController
                .processTemporalAnalysisWorkflowRequest(
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
                        "TEMPORAL_ANALYSIS_WORKFLOW_ERROR",

                    message:
                        "Temporal workflow dependency unavailable."
                }
            );
        } finally {
            workflowService
                .processTemporalAnalysisWorkflow =
                original;
        }
    }
);
