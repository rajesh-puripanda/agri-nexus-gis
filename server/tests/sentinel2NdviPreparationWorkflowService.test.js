"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
    prepareSentinel2NdviRaster
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2NdviPreparationWorkflowService"
);

test(
    "prepareSentinel2NdviRaster orchestrates acquisition, decoding, radiometric preparation and GeoTIFF writing",
    async () => {
        const calls = [];

        const spatialReference = {
            origin: [699960, 2000040, 0],
            resolution: [10, -10, 0],
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
        };

        const acquisition = {
            sceneId:
                "S2C_TEST_SCENE",

            acquisitionDate:
                "2026-09-08T04:47:01Z",

            spatialReference,

            radiometry: {
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                sourceDataType: "UINT16"
            },

            red: {
                assetKey: "B04_10m",
                path: "B04.jp2"
            },

            nir: {
                assetKey: "B08_10m",
                path: "B08.jp2"
            }
        };

        const decoded = {
            width: 2,
            height: 2,
            pixelCount: 4,
            dataType: "UINT16",
            samples: new Uint16Array([
                1000,
                2000,
                3000,
                4000
            ])
        };

        const preparedRaster = {
            contractVersion: "1.0",
            sceneId:
                acquisition.sceneId,
            acquisitionDate:
                acquisition.acquisitionDate,
            raster: {
                width: 2,
                height: 2,
                pixelCount: 4,
                bands: {
                    Red: {
                        data:
                            new Float32Array([
                                0.0,
                                0.1,
                                0.2,
                                0.3
                            ]),
                        dataType: "Float32"
                    },
                    NIR: {
                        data:
                            new Float32Array([
                                0.1,
                                0.2,
                                0.3,
                                0.4
                            ]),
                        dataType: "Float32"
                    }
                },
                spatialReference,
                noData: -9999
            },
            radiometry: {
                sourceDataType: "UINT16",
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                formula:
                    "physicalValue = DN * scale + offset"
            }
        };

        const written = {
            outputPath:
                path.join("outputs", "S2C_TEST_SCENE_NDVI_prepared.tif"),
            width: 2,
            height: 2,
            pixelCount: 4,
            bandCount: 2,
            dataType: "Float32"
        };

        const acquisitionImpl = async (args) => {
            calls.push({
                stage: "acquire",
                args
            });

            return acquisition;
        };

        const decodeImpl = async (filePath) => {
            calls.push({
                stage: "decode",
                filePath
            });

            return decoded;
        };

        const prepareImpl = (args) => {
            calls.push({
                stage: "prepare",
                args
            });

            return preparedRaster;
        };

        const writeImpl = async (args) => {
            calls.push({
                stage: "write",
                args
            });

            return written;
        };

        const result =
            await prepareSentinel2NdviRaster({
                request: {
                    collection:
                        "sentinel-2-l2a",
                    bbox: [
                        82.9,
                        17.6,
                        83.4,
                        17.9
                    ],
                    datetime:
                        "2026-09-01/2026-09-15"
                },

                outputDirectory:
                    "outputs",

                outputFileName:
                    "S2C_TEST_SCENE_NDVI_prepared.tif",

                acquisitionImpl,
                decodeImpl,
                prepareImpl,
                writeImpl
            });

        assert.deepEqual(
            calls.map(
                (call) => call.stage
            ),
            [
                "acquire",
                "decode",
                "decode",
                "prepare",
                "write"
            ]
        );

        assert.equal(
            calls[1].filePath,
            "B04.jp2"
        );

        assert.equal(
            calls[2].filePath,
            "B08.jp2"
        );

        assert.equal(
            calls[3].args.scale,
            0.0001
        );

        assert.equal(
            calls[3].args.offset,
            -0.1
        );

        assert.equal(
            calls[3].args.sourceNoData,
            0
        );

        assert.deepEqual(
            calls[3].args.spatialReference,
            spatialReference
        );

        assert.equal(
            calls[4].args.outputPath,
            path.join("outputs", "S2C_TEST_SCENE_NDVI_prepared.tif")
        );

        assert.equal(
            result.workflowVersion,
            "1.0"
        );

        assert.equal(
            result.sceneId,
            "S2C_TEST_SCENE"
        );

        assert.equal(
            result.spatialReference.geoKeys
                .ProjectedCSTypeGeoKey,
            32644
        );

        assert.deepEqual(
            result.radiometry,
            acquisition.radiometry
        );

        assert.equal(
            result.outputPath,
            written.outputPath
        );

        assert.equal(
            result.bandCount,
            2
        );

        assert.equal(
            result.dataType,
            "Float32"
        );
    }
);
