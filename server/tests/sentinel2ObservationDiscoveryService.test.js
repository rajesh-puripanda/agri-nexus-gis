"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildObservation,
    discoverSentinel2Observations
} = require(
    "../services/remoteSensing/acquisition/sentinel2ObservationDiscoveryService"
);

test(
    "buildObservation preserves Sentinel-2 scene identity and metadata",
    () => {
        const observation =
            buildObservation(
                {
                    id: "S2C_TEST_SCENE",
                    properties: {
                        datetime:
                            "2026-09-08T04:47:01.025000Z",
                        "eo:cloud_cover": 6.66,
                        platform: "sentinel-2c"
                    },
                    bbox: [
                        82.8,
                        17.1,
                        83.9,
                        18.1
                    ]
                }
            );

        assert.equal(
            observation.sceneId,
            "S2C_TEST_SCENE"
        );

        assert.equal(
            observation.acquisitionDate,
            "2026-09-08T04:47:01.025000Z"
        );

        assert.equal(
            observation.cloudCover,
            6.66
        );

        assert.equal(
            observation.satellite,
            "sentinel-2c"
        );

        assert.deepEqual(
            observation.spatialCoverage,
            [
                82.8,
                17.1,
                83.9,
                18.1
            ]
        );
    }
);

test(
    "discoverSentinel2Observations discovers scenes without an index",
    async () => {
        const catalogue = {
            features: [
                {
                    id: "SCENE_A",
                    properties: {
                        datetime:
                            "2026-09-28T04:47:01.025000Z",
                        "eo:cloud_cover": 2.57,
                        platform: "sentinel-2c"
                    },
                    bbox: [
                        82.8,
                        17.1,
                        83.9,
                        18.1
                    ]
                },
                {
                    id: "SCENE_B",
                    properties: {
                        datetime:
                            "2026-09-20T04:47:01.025000Z",
                        "eo:cloud_cover": 12.32,
                        platform: "sentinel-2c"
                    },
                    bbox: [
                        82.8,
                        17.1,
                        83.9,
                        18.1
                    ]
                }
            ]
        };

        const result =
            await discoverSentinel2Observations({
                request: {
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
                },

                searchImpl: async (
                    request,
                    options
                ) => {
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

                    assert.equal(
                        options.limit,
                        50
                    );

                    return catalogue;
                }
            });

        assert.equal(
            result.observations.length,
            2
        );

        assert.equal(
            result.observations[0].sceneId,
            "SCENE_A"
        );

        assert.equal(
            result.observations[0].cloudCover,
            2.57
        );

        assert.equal(
            result.observations[1].sceneId,
            "SCENE_B"
        );
    }
);

test(
    "discoverSentinel2Observations rejects missing temporal context",
    async () => {
        await assert.rejects(
            () =>
                discoverSentinel2Observations({
                    request: {
                        spatialContext: {
                            bbox: {
                                west: 82,
                                south: 17,
                                east: 83,
                                north: 18
                            }
                        }
                    }
                }),
            /requires temporalContext/
        );
    }
);

test(
    "discoverSentinel2Observations rejects missing spatial bbox",
    async () => {
        await assert.rejects(
            () =>
                discoverSentinel2Observations({
                    request: {
                        temporalContext: {
                            startDate: "2026-09-01",
                            endDate: "2026-10-01"
                        }
                    }
                }),
            /requires spatialContext\.bbox/
        );
    }
);
