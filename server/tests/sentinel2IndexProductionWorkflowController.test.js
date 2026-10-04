"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    processSentinel2IndexProductionWorkflowRequest
} = require(
    "../controllers/" +
    "sentinel2IndexProductionWorkflowController"
);

function createValidRequest() {
    return {
        contractVersion: "1.0",

        sourceId: "sentinel2",

        temporalContext: {
            startDate: "2026-09-01",
            endDate: "2026-09-15"
        },

        spatialContext: {
            bbox: {
                west: 82.90,
                south: 17.60,
                east: 83.40,
                north: 17.90
            }
        },

        acquisitionParameters: {
            maxCloudCover: 20
        },

        outputDirectory:
            "./data/remote-sensing/acquisitions",

        indexCode: "BSI",

        targetResolution: 10,

        outputNoData: -9999,

        parameters: {}
    };
}

function createResponseMock() {
    return {
        statusCode: null,
        payload: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

test(
    "controller accepts valid Sentinel-2 BSI production request",
    async () => {
        let capturedArguments = null;

        const workflowMock =
            async (args) => {
                capturedArguments = args;

                return {
                    indexCode: "BSI",
                    status: "completed"
                };
            };

        const req = {
            body:
                createValidRequest()
        };

        const res =
            createResponseMock();

        const result =
            await processSentinel2IndexProductionWorkflowRequest(
                req,
                res,
                () => {},
                workflowMock
            );

        assert.equal(
            result,
            res
        );

        assert.equal(
            res.statusCode,
            200
        );

        assert.deepEqual(
            res.payload,
            {
                success: true,
                result: {
                    indexCode: "BSI",
                    status: "completed"
                }
            }
        );

        assert.ok(
            capturedArguments
        );

        assert.equal(
            capturedArguments.request.indexCode,
            "BSI"
        );

        assert.equal(
            capturedArguments.outputDirectory,
            "./data/remote-sensing/acquisitions"
        );

        assert.equal(
            capturedArguments.targetResolution,
            10
        );

        assert.equal(
            capturedArguments.outputNoData,
            -9999
        );
    }
);

test(
    "controller rejects invalid request with HTTP 400",
    async () => {
        const req = {
            body:
                createValidRequest()
        };

        delete req.body.indexCode;

        const res =
            createResponseMock();

        let nextCalled = false;

        await processSentinel2IndexProductionWorkflowRequest(
            req,
            res,
            () => {
                nextCalled = true;
            }
        );

        assert.equal(
            res.statusCode,
            400
        );

        assert.equal(
            res.payload.success,
            false
        );

        assert.ok(
            Array.isArray(
                res.payload.validationErrors
            )
        );

        assert.equal(
            nextCalled,
            false
        );
    }
);

test(
    "controller forwards workflow errors to next",
    async () => {
        const expectedError =
            new Error(
                "Workflow execution failed."
            );

        const workflowMock =
            async () => {
                throw expectedError;
            };

        const req = {
            body:
                createValidRequest()
        };

        const res =
            createResponseMock();

        let forwardedError = null;

        await processSentinel2IndexProductionWorkflowRequest(
            req,
            res,
            (error) => {
                forwardedError = error;
            },
            workflowMock
        );

        assert.equal(
            forwardedError,
            expectedError
        );

        assert.equal(
            res.statusCode,
            null
        );

        assert.equal(
            res.payload,
            null
        );
    }
);
