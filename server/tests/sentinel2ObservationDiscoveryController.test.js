"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    discoverSentinel2ObservationsRequest
} = require(
    "../controllers/sentinel2ObservationDiscoveryController"
);

function createResponse() {
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

test(
    "discovery controller returns successful observation discovery result",
    async () => {
        const req = {
            body: {
                contractVersion: "1.0",
                sourceId: "sentinel2",

                temporalContext: {
                    startDate: "2026-09-01",
                    endDate: "2026-10-01"
                },

                spatialContext: {
                    bbox: {
                        west: 82.9,
                        south: 17.6,
                        east: 83.4,
                        north: 17.9
                    }
                },

                acquisitionParameters: {
                    maxCloudCover: 20
                }
            }
        };

        const res = createResponse();

        let nextCalled = false;

        await discoverSentinel2ObservationsRequest(
            req,
            res,
            () => {
                nextCalled = true;
            },
            async ({ request }) => {
                assert.equal(
                    request.temporalContext.startDate,
                    "2026-09-01"
                );

                assert.equal(
                    request.temporalContext.endDate,
                    "2026-10-01"
                );

                assert.equal(
                    request.acquisitionParameters.maxCloudCover,
                    20
                );

                return {
                    observations: [
                        {
                            sceneId: "SCENE_A",
                            cloudCover: 2.57
                        }
                    ]
                };
            }
        );

        assert.equal(
            res.statusCode,
            200
        );

        assert.deepEqual(
            res.body,
            {
                success: true,
                result: {
                    observations: [
                        {
                            sceneId: "SCENE_A",
                            cloudCover: 2.57
                        }
                    ]
                }
            }
        );

        assert.equal(
            nextCalled,
            false
        );
    }
);

test(
    "discovery controller rejects a non-object request body",
    async () => {
        const req = {
            body: null
        };

        const res = createResponse();

        await discoverSentinel2ObservationsRequest(
            req,
            res,
            () => {}
        );

        assert.equal(
            res.statusCode,
            400
        );

        assert.deepEqual(
            res.body,
            {
                success: false,
                error:
                    "Invalid Sentinel-2 observation discovery request."
            }
        );
    }
);

test(
    "discovery controller forwards discovery errors to next",
    async () => {
        const req = {
            body: {
                temporalContext: {
                    startDate: "2026-09-01",
                    endDate: "2026-10-01"
                }
            }
        };

        const res = createResponse();

        const expectedError =
            new Error("Discovery failed.");

        let receivedError = null;

        await discoverSentinel2ObservationsRequest(
            req,
            res,
            (error) => {
                receivedError = error;
            },
            async () => {
                throw expectedError;
            }
        );

        assert.equal(
            receivedError,
            expectedError
        );

        assert.equal(
            res.statusCode,
            null
        );
    }
);
