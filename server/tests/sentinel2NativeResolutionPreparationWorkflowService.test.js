"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION,
    groupBandsByNativeResolution,
    prepareSentinel2NativeResolutionRasters
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2NativeResolutionPreparationWorkflowService"
);

test(
    "groupBandsByNativeResolution preserves Sentinel-2 native resolution groups",
    () => {
        const groups =
            groupBandsByNativeResolution({
                Blue: {},
                Green: {},
                Red: {},
                NIR: {},

                RedEdge1: {},
                RedEdge2: {},
                RedEdge3: {},
                RedEdge4: {},
                SWIR1: {},
                SWIR2: {},

                CoastalAerosol: {},
                WaterVapor: {}
            });

        assert.deepEqual(
            groups,
            {
                10: [
                    "Blue",
                    "Green",
                    "Red",
                    "NIR"
                ],

                20: [
                    "RedEdge1",
                    "RedEdge2",
                    "RedEdge3",
                    "RedEdge4",
                    "SWIR1",
                    "SWIR2"
                ],

                60: [
                    "CoastalAerosol",
                    "WaterVapor"
                ]
            }
        );
    }
);

test(
    "prepareSentinel2NativeResolutionRasters creates one prepared raster per native resolution",
    async () => {
        const calls = [];

        const spatialReferences = {
            10: {
                origin: [699960, 2000040, 0],
                resolution: [10, -10, 0],
                boundingBox: [
                    699960,
                    2000020,
                    699980,
                    2000040
                ],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            },

            20: {
                origin: [699960, 2000040, 0],
                resolution: [20, -20, 0],
                boundingBox: [
                    699960,
                    2000000,
                    700000,
                    2000040
                ],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            },

            60: {
                origin: [699960, 2000040, 0],
                resolution: [60, -60, 0],
                boundingBox: [
                    699960,
                    1999920,
                    700020,
                    2000040
                ],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            }
        };

        const resolutionByBand = {
            Blue: 10,
            Green: 10,
            Red: 10,
            NIR: 10,

            RedEdge1: 20,
            RedEdge2: 20,
            RedEdge3: 20,
            RedEdge4: 20,
            SWIR1: 20,
            SWIR2: 20,

            CoastalAerosol: 60,
            WaterVapor: 60
        };

        const dimensionsByResolution = {
            10: {
                width: 2,
                height: 2
            },

            20: {
                width: 1,
                height: 2
            },

            60: {
                width: 1,
                height: 1
            }
        };

        const bandNames = Object.keys(
            resolutionByBand
        );

        const acquisitionImpl = async ({
            request,
            outputDirectory,
            bandNames
        }) => {
            calls.push({
                stage: "acquire",
                request,
                outputDirectory,
                bandNames
            });

            const bands = {};

            for (
                const bandName of bandNames
            ) {
                const resolution =
                    resolutionByBand[
                        bandName
                    ];

                bands[bandName] = {
                    assetKey:
                        `${bandName}_${resolution}m`,

                    path:
                        `${bandName}.jp2`,

                    spatialReference:
                        spatialReferences[
                            resolution
                        ],

                    radiometry: {
                        scale: 0.0001,
                        offset: -0.1,
                        noData: 0,
                        sourceDataType:
                            "UINT16"
                    }
                };
            }

            return {
                sceneId:
                    "S2C_TEST_SCENE",

                acquisitionDate:
                    "2026-09-08T04:47:01Z",

                sourceProvider:
                    "copernicus-data-space",

                bands
            };
        };

        const decodeImpl = async ({ inputPath }) => {
            calls.push({
                stage: "decode",
                filePath: inputPath
            });

            const bandName =
                inputPath.replace(
                    ".jp2",
                    ""
                );

            const resolution =
                resolutionByBand[
                    bandName
                ];

            const dimensions =
                dimensionsByResolution[
                    resolution
                ];

            const pixelCount =
                dimensions.width *
                dimensions.height;

            return {
                window: {
                    x0: 0,
                    y0: 0,
                    x1: dimensions.width,
                    y1: dimensions.height,
                    width: dimensions.width,
                    height: dimensions.height
                },

                width:
                    dimensions.width,

                height:
                    dimensions.height,

                pixelCount,

                dataType:
                    "UINT16",

                samples:
                    new Uint16Array(
                        pixelCount
                    )
            };
        };
        const prepareImpl = ({
            bands
        }) => {
            calls.push({
                stage: "prepare",
                bands:
                    Object.keys(bands)
            });

            return Object.fromEntries(
                Object.entries(bands)
                    .map(
                        ([
                            bandName,
                            definition
                        ]) => [
                            bandName,
                            {
                                data:
                                    new Float32Array(
                                        definition
                                            .samples
                                            .length
                                    ),

                                dataType:
                                    "Float32"
                            }
                        ]
                    )
            );
        };

        const writeImpl = async ({
            preparedRaster,
            outputPath
        }) => {
            calls.push({
                stage: "write",
                outputPath,
                bandNames:
                    Object.keys(
                        preparedRaster
                            .raster
                            .bands
                    )
            });

            return {
                outputPath,
                width:
                    preparedRaster
                        .raster
                        .width,

                height:
                    preparedRaster
                        .raster
                        .height,

                pixelCount:
                    preparedRaster
                        .raster
                        .pixelCount,

                bandCount:
                    Object.keys(
                        preparedRaster
                            .raster
                            .bands
                    ).length,

                dataType:
                    "Float32"
            };
        };

        const result =
            await prepareSentinel2NativeResolutionRasters({
                request: {
                    collection:
                        "sentinel-2-l2a",

                    spatialContext: {
            bbox: {
                west: 82.88944,
                south: 18.07964,
                east: 82.88962,
                north: 18.07981
            },
                    },

                    datetime:
                        "2026-09-01/2026-09-15"
                },

                outputDirectory:
                    "outputs",

                bandNames,

                acquisitionImpl,
                decodeImpl,
                prepareImpl,
                writeImpl
            });

        assert.equal(
            result.workflowVersion,
            SENTINEL2_NATIVE_RESOLUTION_PREPARATION_WORKFLOW_VERSION
        );

        assert.equal(
            result.sceneId,
            "S2C_TEST_SCENE"
        );

        assert.deepEqual(
            Object.keys(result.outputs),
            [
                "10",
                "20",
                "60"
            ]
        );

        assert.deepEqual(
            result.outputs[10].bands,
            [
                "Blue",
                "Green",
                "Red",
                "NIR"
            ]
        );

        assert.deepEqual(
            result.outputs[20].bands,
            [
                "RedEdge1",
                "RedEdge2",
                "RedEdge3",
                "RedEdge4",
                "SWIR1",
                "SWIR2"
            ]
        );

        assert.deepEqual(
            result.outputs[60].bands,
            [
                "CoastalAerosol",
                "WaterVapor"
            ]
        );

        assert.equal(
            result.outputs[10].bands.length, 4
        );

        assert.equal(
            result.outputs[20].bands.length, 6
        );

        assert.equal(
            result.outputs[60].bands.length, 2
        );

        const prepareCalls =
            calls.filter(
                (call) =>
                    call.stage ===
                    "prepare"
            );

        assert.deepEqual(
            prepareCalls.map(
                (call) =>
                    call.bands
            ),
            [
                [
                    "Blue",
                    "Green",
                    "Red",
                    "NIR"
                ],
                [
                    "RedEdge1",
                    "RedEdge2",
                    "RedEdge3",
                    "RedEdge4",
                    "SWIR1",
                    "SWIR2"
                ],
                [
                    "CoastalAerosol",
                    "WaterVapor"
                ]
            ]
        );

        const writeCalls =
            calls.filter(
                (call) =>
                    call.stage ===
                    "write"
            );

        assert.deepEqual(
            writeCalls.map(
                (call) =>
                    call.outputPath
            ),
            [
                "outputs\\S2C_TEST_SCENE_10m_prepared.tif",
                "outputs\\S2C_TEST_SCENE_20m_prepared.tif",
                "outputs\\S2C_TEST_SCENE_60m_prepared.tif"
            ]
        );

        assert.equal(
            calls.filter(
                (call) =>
                    call.stage ===
                    "decode"
            ).length,
            12
        );
    }
);

test(
    "native-resolution workflow rejects mismatched spatial grids within a resolution group",
    async () => {
        const spatialReference10m =
            {
                origin: [699960, 2000040, 0],
                resolution: [10, -10, 0],
                boundingBox: [
                    699960,
                    2000020,
                    699980,
                    2000040
                ],
                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            };

        const mismatchedSpatialReference =
            {
                ...spatialReference10m,

                origin: [
                    699970,
                    2000040,
                    0
                ]
            };

        const acquisitionImpl = async () => ({
            sceneId:
                "S2C_TEST_SCENE",

            acquisitionDate:
                "2026-09-08T04:47:01Z",

            sourceProvider:
                "copernicus-data-space",

            bands: {
                Red: {
                    assetKey:
                        "B04_10m",

                    path:
                        "Red.jp2",

                    spatialReference:
                        spatialReference10m,

                    radiometry: {
                        scale: 0.0001,
                        offset: -0.1,
                        noData: 0,
                        sourceDataType:
                            "UINT16"
                    }
                },

                NIR: {
                    assetKey:
                        "B08_10m",

                    path:
                        "NIR.jp2",

                    spatialReference:
                        mismatchedSpatialReference,

                    radiometry: {
                        scale: 0.0001,
                        offset: -0.1,
                        noData: 0,
                        sourceDataType:
                            "UINT16"
                    }
                }
            }
        });

        const decodeImpl = async () => ({
            window: {
                x0: 0,
                y0: 0,
                x1: 2,
                y1: 2,
                width: 2,
                height: 2
            },

            width: 2,
            height: 2,
            pixelCount: 4,
            dataType: "UINT16",

            samples:
                new Uint16Array(4)
        });

        await assert.rejects(
            () =>
                prepareSentinel2NativeResolutionRasters({
                    request: {
                        collection:
                            "sentinel-2-l2a",

                        spatialContext: {
                bbox: {
                    west: 82.88944,
                    south: 18.07964,
                    east: 82.88962,
                    north: 18.07981
                }
                        }
                    },

                    outputDirectory:
                        "outputs",

                    bandNames: [
                        "Red",
                        "NIR"
                    ],

                    acquisitionImpl,
                    decodeImpl,

                    prepareImpl: () => ({
                        Red: {
                            data:
                                new Float32Array(4),
                            dataType:
                                "Float32"
                        },

                        NIR: {
                            data:
                                new Float32Array(4),
                            dataType:
                                "Float32"
                        }
                    }),

                    writeImpl:
                        async () => {
                            throw new Error(
                                "writeImpl should not be called."
                            );
                        }
                }),
            /does not match the native-resolution spatial grid/
        );
    }
);
