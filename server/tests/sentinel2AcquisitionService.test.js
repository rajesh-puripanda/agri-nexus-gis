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



test(
    "acquireSentinel2Bands downloads requested native-resolution L2A bands",
    async () => {
        const {
            acquireSentinel2Bands
        } = require(
            "../services/remoteSensing/acquisition/sentinel2AcquisitionService"
        );

        const calls = [];

        const asset = (
            code,
            bbox,
            transform
        ) => ({
            "proj:code": code,
            "proj:bbox": bbox,
            "proj:transform": transform,
            nodata: 0,
            data_type: "uint16",
            "raster:scale": 0.0001,
            "raster:offset": -0.1
        });

        const assets = {
            B01_60m: asset(
                "EPSG:32644",
                [699960, 1890000, 810000, 2000040],
                [60, 0, 699960, 0, -60, 2000040]
            ),

            B02_10m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [10, 0, 699960, 0, -10, 2000040]
            ),

            B03_10m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [10, 0, 699960, 0, -10, 2000040]
            ),

            B04_10m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [10, 0, 699960, 0, -10, 2000040]
            ),

            B05_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            ),

            B06_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            ),

            B07_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            ),

            B08_10m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [10, 0, 699960, 0, -10, 2000040]
            ),

            B8A_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            ),

            B09_60m: asset(
                "EPSG:32644",
                [699960, 1890000, 810000, 2000040],
                [60, 0, 699960, 0, -60, 2000040]
            ),

            B11_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            ),

            B12_20m: asset(
                "EPSG:32644",
                [699960, 1890240, 809760, 2000040],
                [20, 0, 699960, 0, -20, 2000040]
            )
        };

        const fakeSearch = async () => {
            calls.push({
                type: "search"
            });

            return {
                type: "FeatureCollection",

                features: [
                    {
                        id: "S2_TEST_ALL_BANDS",

                        properties: {
                            datetime:
                                "2026-09-08T04:47:01Z"
                        },

                        assets
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
            await acquireSentinel2Bands({
                request: {},

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
            "S2_TEST_ALL_BANDS"
        );

        assert.equal(
            Object.keys(result.bands).length,
            12
        );

        assert.equal(
            result.bands.Blue.assetKey,
            "B02_10m"
        );

        assert.equal(
            result.bands.Red.assetKey,
            "B04_10m"
        );

        assert.equal(
            result.bands.NIR.assetKey,
            "B08_10m"
        );

        assert.equal(
            result.bands.RedEdge1.assetKey,
            "B05_20m"
        );

        assert.equal(
            result.bands.SWIR1.assetKey,
            "B11_20m"
        );

        assert.equal(
            result.bands.SWIR2.assetKey,
            "B12_20m"
        );

        assert.equal(
            result.bands.Blue.spatialReference.resolution[0],
            10
        );

        assert.equal(
            result.bands.RedEdge1.spatialReference.resolution[0],
            20
        );

        assert.equal(
            result.bands.CoastalAerosol.spatialReference.resolution[0],
            60
        );

        assert.equal(
            result.bands.Blue.radiometry.scale,
            0.0001
        );

        assert.equal(
            result.bands.Blue.radiometry.offset,
            -0.1
        );

        assert.equal(
            result.bands.Blue.radiometry.noData,
            0
        );

        assert.equal(
            calls.length,
            14
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
            calls.slice(2).every(
                call =>
                    call.type === "download" &&
                    call.accessToken === "TEST_TOKEN"
            ),
            true
        );
    }
);


test(
    "acquireSentinel2Bands selects the explicitly requested scene",
    async () => {
        const {
            acquireSentinel2Bands
        } = require(
            "../services/remoteSensing/acquisition/sentinel2AcquisitionService"
        );

        const requestedSceneId =
            "S2_REQUESTED_SCENE";

        const calls = [];

        const makeAsset = (href) => ({
            href,
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
            nodata: 0,
            data_type: "uint16",
            "raster:scale": 0.0001,
            "raster:offset": -0.1
        });

        const fakeSearch = async () => ({
            type: "FeatureCollection",

            features: [
                {
                    id: "S2_OTHER_SCENE",

                    properties: {
                        datetime:
                            "2026-09-06T04:56:59Z"
                    },

                    assets: {
                        B04_10m:
                            makeAsset("https://example.com/other-red.jp2")
                    }
                },

                {
                    id: requestedSceneId,

                    properties: {
                        datetime:
                            "2026-09-08T04:47:01Z"
                    },

                    assets: {
                        B04_10m:
                            makeAsset("https://example.com/requested-red.jp2")
                    }
                }
            ]
        });

        const fakeGetAccessToken = async () =>
            "TEST_TOKEN";

        const fakeDownloadAsset = async ({
            asset,
            outputPath
        }) => {
            calls.push({
                asset,
                outputPath
            });

            return {
                outputPath
            };
        };

        const result =
            await acquireSentinel2Bands({
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
                        maxCloudCover: 20,
                        sceneId: requestedSceneId
                    }
                },

                outputDirectory:
                    "./data/remote-sensing/test-acquisition",

                bandNames: [
                    "Red"
                ],

                searchImpl:
                    fakeSearch,

                getAccessTokenImpl:
                    fakeGetAccessToken,

                downloadAssetImpl:
                    fakeDownloadAsset
            });

        assert.equal(
            result.sceneId,
            requestedSceneId
        );

        assert.equal(
            result.acquisitionDate,
            "2026-09-08T04:47:01Z"
        );

        assert.equal(
            calls.length,
            1
        );

        assert.match(
            calls[0].outputPath,
            /S2_REQUESTED_SCENE_B04_10m\.jp2$/
        );
    }
);

