"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    acquireNDVIBands
} = require(
    "../services/remoteSensing/acquisition/sentinel2AcquisitionService"
);

test(
    "acquireNDVIBands orchestrates search, authentication and downloads",
    async () => {
        const calls = [];

        const fakeSearch = async (request) => {
            calls.push({
                type: "search",
                request
            });

            return {
                type: "FeatureCollection",

                features: [
                    {
                        id: "S2_TEST_001",

                        properties: {
                            datetime:
                                "2026-09-08T04:47:01Z"
                        },

                        assets: {
                            B04_10m: {
                                href: "https://...",
                                "proj:code": "EPSG:32644",
                                "proj:bbox": [
                                    699960,
                                    1890240,
                                    809760,
                                    2000040
                                ],
                                "proj:transform": [
                                    10,
                                    0,
                                    699960,
                                    0,
                                    -10,
                                    2000040
                                ],
                                "nodata": 0,
                                "data_type": "uint16",
                                "raster:scale": 0.0001,
                                "raster:offset": -0.1
                            },

                            B08_10m: {
                                alternate: {
                                    https: {
                                        href:
                                            "https://example.com/B08.jp2"
                                    }
                                },
                                "proj:code": "EPSG:32644",
                                "proj:bbox": [
                                    699960,
                                    1890240,
                                    809760,
                                    2000040
                                ],
                                "proj:transform": [
                                    10,
                                    0,
                                    699960,
                                    0,
                                    -10,
                                    2000040
                                ],
                                "nodata": 0,
                                "data_type": "uint16",
                                "raster:scale": 0.0001,
                                "raster:offset": -0.1
                            }
                        }
                    }
                ]
            };
        };

        const fakeGetAccessToken = async () => {
            calls.push({
                type: "authentication"
            });

            return "TEST_TOKEN";
        };

        const fakeDownloadAsset = async ({
            asset,
            outputPath,
            accessToken
        }) => {
            calls.push({
                type: "download",
                asset,
                outputPath,
                accessToken
            });

            return {
                outputPath
            };
        };

        const result =
            await acquireNDVIBands({
                request: {
                    temporalContext: {
                        startDate: "2026-09-01",
                        endDate: "2026-09-15"
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

                outputDirectory:
                    "./data/remote-sensing/test-acquisition",

                searchImpl:
                    fakeSearch,

                getAccessTokenImpl:
                    fakeGetAccessToken,

                downloadAssetImpl:
                    fakeDownloadAsset
            });

        assert.equal(
            result.sceneId,
            "S2_TEST_001"
        );

        assert.equal(
            result.red.assetKey,
            "B04_10m"
        );

        assert.equal(
            result.nir.assetKey,
            "B08_10m"
        );

        assert.equal(
            result.acquisitionDate,
            "2026-09-08T04:47:01Z"
        );

        assert.deepEqual(
            result.spatialReference,
            {
                origin: [
                    699960,
                    2000040,
                    0
                ],
                resolution: [
                    10,
                    -10,
                    0
                ],
                boundingBox: [
                    699960,
                    1890240,
                    809760,
                    2000040
                ],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            }
        );

        assert.equal(
            calls.length,
            4
        );

        assert.equal(
            calls[0].type,
            "search"
        );

        assert.equal(
            calls[1].type,
            "authentication"
        );

        assert.equal(
            calls[2].type,
            "download"
        );

        assert.equal(
            calls[3].type,
            "download"
        );

        assert.equal(
            calls[2].accessToken,
            "TEST_TOKEN"
        );

        assert.equal(
            calls[3].accessToken,
            "TEST_TOKEN"
        );

        assert.match(
            calls[2].outputPath,
            /S2_TEST_001_B04_10m\.jp2$/
        );

        assert.match(
            calls[3].outputPath,
            /S2_TEST_001_B08_10m\.jp2$/
        );
    }
);


