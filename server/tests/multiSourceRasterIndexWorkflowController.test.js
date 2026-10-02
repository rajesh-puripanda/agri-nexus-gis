"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    processMultiSourceRasterIndexWorkflowRequest
} = require(
    "../controllers/multiSourceRasterIndexWorkflowController"
);

test(
    "controller rejects an invalid multi-source request with HTTP 400",
    async () => {
        let responseStatus = null;
        let responseBody = null;

        const req = {
            body: {
                indexCode: "NDMI",
                targetResolution: 20,
                sources: [
                    {
                        band: "NIR",
                        inputPath: "nir.tif"
                    }
                ]
            }
        };

        const res = {
            status(code) {
                responseStatus = code;
                return this;
            },

            json(body) {
                responseBody = body;
                return this;
            }
        };

        let nextCalled = false;

        await processMultiSourceRasterIndexWorkflowRequest(
            req,
            res,
            () => {
                nextCalled = true;
            }
        );

        assert.equal(
            responseStatus,
            400
        );

        assert.equal(
            responseBody.success,
            false
        );

        assert.equal(
            nextCalled,
            false
        );

        assert.ok(
            responseBody.validationErrors.some(
                error =>
                    error.includes("SWIR")
            )
        );
    }
);
