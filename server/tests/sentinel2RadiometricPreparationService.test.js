"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    prepareBandSamples,
    prepareSentinel2Raster
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2RadiometricPreparationService"
);

test(
    "prepareBandSamples applies source scale and offset",
    () => {
        const result =
            prepareBandSamples({
                samples:
                    new Uint16Array([
                        1000,
                        2000,
                        3000
                    ]),
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                outputNoData: -9999
            });

        assert.equal(
            result.constructor.name,
            "Float32Array"
        );

        assert.ok(
            Math.abs(result[0] - 0) < 1e-6
        );

        assert.ok(
            Math.abs(result[1] - 0.1) < 1e-6
        );

        assert.ok(
            Math.abs(result[2] - 0.2) < 1e-6
        );
    }
);

test(
    "source NoData is converted to prepared-raster NoData",
    () => {
        const result =
            prepareBandSamples({
                samples:
                    new Uint16Array([
                        0,
                        1000,
                        0
                    ]),
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                outputNoData: -9999
            });

        assert.deepEqual(
            Array.from(result),
            [
                -9999,
                0,
                -9999
            ]
        );
    }
);

test(
    "negative physical values are preserved",
    () => {
        const result =
            prepareBandSamples({
                samples:
                    new Uint16Array([
                        1,
                        500
                    ]),
                scale: 0.0001,
                offset: -0.1,
                noData: 0,
                outputNoData: -9999
            });

        assert.ok(
            Math.abs(result[0] - (-0.0999)) < 1e-6
        );

        assert.ok(
            Math.abs(result[1] - (-0.05)) < 1e-6
        );
    }
);

test(
    "prepareSentinel2Raster creates Red and NIR Float32 bands",
    () => {
        const result =
            prepareSentinel2Raster({
                sceneId:
                    "S2C_TEST_SCENE",

                acquisitionDate:
                    "2026-09-08T04:47:01Z",

                width: 2,
                height: 1,

                redSamples:
                    new Uint16Array([
                        1000,
                        2000
                    ]),

                nirSamples:
                    new Uint16Array([
                        3000,
                        4000
                    ]),

                scale: 0.0001,
                offset: -0.1,

                sourceNoData: 0,
                outputNoData: -9999,

                spatialReference: {
                    epsg: 32644
                }
            });

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.source.id,
            "sentinel2"
        );

        assert.equal(
            result.raster.bands.Red.dataType,
            "Float32"
        );

        assert.equal(
            result.raster.bands.NIR.dataType,
            "Float32"
        );

        assert.ok(
            Math.abs(
                result.raster.bands.Red.data[0] - 0
            ) < 1e-6
        );

        assert.ok(
            Math.abs(
                result.raster.bands.Red.data[1] - 0.1
            ) < 1e-6
        );

        assert.ok(
            Math.abs(
                result.raster.bands.NIR.data[0] - 0.2
            ) < 1e-6
        );

        assert.ok(
            Math.abs(
                result.raster.bands.NIR.data[1] - 0.3
            ) < 1e-6
        );
    }
);

test(
    "prepared raster preserves radiometric provenance",
    () => {
        const result =
            prepareSentinel2Raster({
                sceneId:
                    "S2C_TEST_SCENE",

                acquisitionDate:
                    "2026-09-08T04:47:01Z",

                width: 1,
                height: 1,

                redSamples:
                    new Uint16Array([2000]),

                nirSamples:
                    new Uint16Array([3000]),

                scale: 0.0001,
                offset: -0.1,

                sourceNoData: 0,
                outputNoData: -9999
            });

        assert.equal(
            result.radiometry.sourceDataType,
            "UINT16"
        );

        assert.equal(
            result.radiometry.scale,
            0.0001
        );

        assert.equal(
            result.radiometry.offset,
            -0.1
        );

        assert.equal(
            result.radiometry.noData,
            0
        );

        assert.equal(
            result.radiometry.formula,
            "physicalValue = DN * scale + offset"
        );
    }
);

test(
    "invalid dimensions are rejected",
    () => {
        assert.throws(
            () =>
                prepareSentinel2Raster({
                    sceneId:
                        "S2C_TEST_SCENE",

                    acquisitionDate:
                        "2026-09-08T04:47:01Z",

                    width: 0,
                    height: 1,

                    redSamples:
                        new Uint16Array([]),

                    nirSamples:
                        new Uint16Array([]),

                    scale: 0.0001,
                    offset: -0.1
                }),
            /width must be a positive integer/
        );
    }
);
