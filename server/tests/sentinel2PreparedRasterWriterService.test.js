"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
    writeSentinel2PreparedRaster
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterWriterService"
);

const {
    readGeoTiff
} = require(
    "../services/remoteSensing/raster/" +
    "rasterReaderService"
);

const TEST_OUTPUT =
    path.join(
        __dirname,
        "../../data/remote-sensing/acquisitions/" +
        "sentinel2/_prepared_writer_test.tif"
    );

function createTestPreparedRaster() {
    return {
        contractVersion: "1.0",

        source: {
            id: "sentinel2",
            provider: "Copernicus Data Space"
        },

        sceneId:
            "TEST_SENTINEL2_SCENE",

        acquisitionDate:
            "2026-09-08T04:47:01.025000Z",

        raster: {
            width: 2,
            height: 2,
            pixelCount: 4,

            bands: {
                Red: {
                    data: new Float32Array([
                        0.10,
                        0.20,
                        0.30,
                        0.40
                    ]),
                    dataType: "Float32"
                },

                NIR: {
                    data: new Float32Array([
                        0.50,
                        0.60,
                        0.70,
                        0.80
                    ]),
                    dataType: "Float32"
                }
            },

            spatialReference: {
                origin: [
                    500000,
                    1900000,
                    0
                ],

                resolution: [
                    10,
                    -10,
                    0
                ],

                boundingBox: [
                    500000,
                    1899980,
                    500020,
                    1900000
                ],

                geoKeys: {
                    ProjectedCSTypeGeoKey: 32644,
                    GTModelTypeGeoKey: 1,
                    GTRasterTypeGeoKey: 1
                }
            },

            noData: -9999,

            metadata: {
                sourceType:
                    "Sentinel-2 L2A"
            }
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
}

test.afterEach(
    async () => {
        try {
            await fs.promises.unlink(
                TEST_OUTPUT
            );
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }
);

test(
    "writes a two-band Float32 Sentinel-2 GeoTIFF",
    async () => {
        const preparedRaster =
            createTestPreparedRaster();

        const result =
            await writeSentinel2PreparedRaster({
                preparedRaster,
                outputPath: TEST_OUTPUT
            });

        assert.equal(
            result.width,
            2
        );

        assert.equal(
            result.height,
            2
        );

        assert.equal(
            result.pixelCount,
            4
        );

        assert.equal(
            result.bandCount,
            2
        );

        assert.deepEqual(
            result.bands,
            [
                "Red",
                "NIR"
            ]
        );

        assert.equal(
            result.dataType,
            "Float32"
        );

        assert.ok(
            result.byteLength > 0
        );

        assert.equal(
            await fs.promises
                .access(TEST_OUTPUT)
                .then(() => true)
                .catch(() => false),
            true
        );
    }
);

test(
    "round-trips Red and NIR values through existing GeoTIFF reader",
    async () => {
        const preparedRaster =
            createTestPreparedRaster();

        await writeSentinel2PreparedRaster({
            preparedRaster,
            outputPath: TEST_OUTPUT
        });

        const raster =
            await readGeoTiff(
                TEST_OUTPUT
            );

        assert.equal(
            raster.geoKeys.ProjectedCSTypeGeoKey,
            32644
        );

        assert.deepEqual(
            raster.origin,
            [
                500000,
                1900000,
                0
            ]
        );

        assert.deepEqual(
            raster.resolution,
            [
                10,
                -10,
                0
            ]
        );

        assert.equal(
            raster.width,
            2
        );

        assert.equal(
            raster.height,
            2
        );

        assert.equal(
            raster.samplesPerPixel,
            2
        );

        assert.equal(
            raster.data.length,
            2
        );

        const red =
            raster.data[0];

        const nir =
            raster.data[1];

        assert.equal(
            red.length,
            4
        );

        assert.equal(
            nir.length,
            4
        );

        const expectedRed = [
            0.10,
            0.20,
            0.30,
            0.40
        ];

        const expectedNir = [
            0.50,
            0.60,
            0.70,
            0.80
        ];

        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            assert.ok(
                Math.abs(
                    red[index] -
                    expectedRed[index]
                ) < 1e-6
            );

            assert.ok(
                Math.abs(
                    nir[index] -
                    expectedNir[index]
                ) < 1e-6
            );
        }
    }
);

test(
    "preserves the prepared raster NoData value",
    async () => {
        const preparedRaster =
            createTestPreparedRaster();

        preparedRaster.raster.bands.Red.data =
            new Float32Array([
                0.10,
                -9999,
                0.30,
                0.40
            ]);

        await writeSentinel2PreparedRaster({
            preparedRaster,
            outputPath: TEST_OUTPUT
        });

        const raster =
            await readGeoTiff(
                TEST_OUTPUT
            );

        const red =
            raster.data[0];

        assert.ok(
            Math.abs(
                red[1] - (-9999)
            ) < 1e-6
        );
    }
);

test(
    "rejects a missing output path",
    async () => {
        await assert.rejects(
            () =>
                writeSentinel2PreparedRaster({
                    preparedRaster:
                        createTestPreparedRaster()
                }),
            {
                name: "TypeError"
            }
        );
    }
);

test(
    "rejects an invalid prepared raster",
    async () => {
        const invalidRaster =
            createTestPreparedRaster();

        invalidRaster.raster.bands.Red.data =
            new Float32Array([
                0.10,
                0.20
            ]);

        await assert.rejects(
            () =>
                writeSentinel2PreparedRaster({
                    preparedRaster:
                        invalidRaster,
                    outputPath:
                        TEST_OUTPUT
                }),
            {
                name: "TypeError"
            }
        );
    }
);

test(
    "writes an arbitrary multi-band Sentinel-2 prepared raster",
    async () => {
        const preparedRaster =
            createTestPreparedRaster();

        preparedRaster.raster.bands = {
            Blue: {
                data: new Float32Array([
                    0.01,
                    0.02,
                    0.03,
                    0.04
                ]),
                dataType: "Float32"
            },

            Green: {
                data: new Float32Array([
                    0.05,
                    0.06,
                    0.07,
                    0.08
                ]),
                dataType: "Float32"
            },

            Red: {
                data: new Float32Array([
                    0.10,
                    0.20,
                    0.30,
                    0.40
                ]),
                dataType: "Float32"
            },

            NIR: {
                data: new Float32Array([
                    0.50,
                    0.60,
                    0.70,
                    0.80
                ]),
                dataType: "Float32"
            },

            SWIR1: {
                data: new Float32Array([
                    0.90,
                    1.00,
                    1.10,
                    1.20
                ]),
                dataType: "Float32"
            },

            SWIR2: {
                data: new Float32Array([
                    1.30,
                    1.40,
                    1.50,
                    1.60
                ]),
                dataType: "Float32"
            }
        };

        const result =
            await writeSentinel2PreparedRaster({
                preparedRaster,
                outputPath: TEST_OUTPUT
            });

        assert.equal(
            result.bandCount,
            6
        );

        assert.deepEqual(
            result.bands,
            [
                "Blue",
                "Green",
                "Red",
                "NIR",
                "SWIR1",
                "SWIR2"
            ]
        );

        assert.equal(
            result.dataType,
            "Float32"
        );

        const raster =
            await readGeoTiff(
                TEST_OUTPUT
            );

        assert.equal(
            raster.samplesPerPixel,
            6
        );

        assert.equal(
            raster.data.length,
            6
        );

        assert.equal(
            raster.data[0].length,
            4
        );

        assert.equal(
            raster.data[5].length,
            4
        );
    }
);
