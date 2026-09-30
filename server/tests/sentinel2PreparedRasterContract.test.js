"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION,
    PREPARED_BANDS,
    DATA_TYPE,
    validateSentinel2PreparedRaster,
    createSentinel2PreparedRaster
} = require(
    "../scientific/remoteSensing/acquisition/" +
    "sentinel2PreparedRasterContract"
);

function createValidRaster() {
    return {
        contractVersion:
            SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION,

        source: {
            id: "sentinel2",
            provider: "Copernicus Data Space"
        },

        sceneId:
            "S2C_MSIL2A_20260908T044701_" +
            "N0512_R076_T44QQE_20260908T094920",

        acquisitionDate:
            "2026-09-08T04:47:01.025000Z",

        raster: {
            width: 2,
            height: 1,
            pixelCount: 2,

            bands: {
                Red: {
                    data: new Float32Array([
                        0.1,
                        0.2
                    ]),
                    dataType: "Float32"
                },

                NIR: {
                    data: new Float32Array([
                        0.3,
                        0.4
                    ]),
                    dataType: "Float32"
                }
            },

            spatialReference: {
                epsg: 32644
            },

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
}

test(
    "Sentinel-2 prepared raster contract exposes the expected version and bands",
    () => {
        assert.equal(
            SENTINEL2_PREPARED_RASTER_CONTRACT_VERSION,
            "1.0"
        );

        assert.deepEqual(
            PREPARED_BANDS,
            ["Red", "NIR"]
        );

        assert.equal(
            DATA_TYPE,
            "Float32"
        );
    }
);

test(
    "valid Sentinel-2 prepared raster passes validation",
    () => {
        const result =
            validateSentinel2PreparedRaster(
                createValidRaster()
            );

        assert.deepEqual(
            result,
            {
                valid: true,
                errors: []
            }
        );
    }
);

test(
    "prepared raster factory creates a valid contract",
    () => {
        const result =
            createSentinel2PreparedRaster(
                createValidRaster()
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.source.id,
            "sentinel2"
        );

        assert.deepEqual(
            Object.keys(result.raster.bands),
            ["Red", "NIR"]
        );
    }
);

test(
    "invalid band data type is rejected",
    () => {
        const raster =
            createValidRaster();

        raster.raster.bands.Red.dataType =
            "Uint16";

        const result =
            validateSentinel2PreparedRaster(
                raster
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "dataType must be Float32"
                    )
            )
        );
    }
);

test(
    "invalid radiometric transformation formula is rejected",
    () => {
        const raster =
            createValidRaster();

        raster.radiometry.formula =
            "DN / 10000";

        const result =
            validateSentinel2PreparedRaster(
                raster
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "radiometry.formula"
                    )
            )
        );
    }
);

test(
    "factory throws the expected error code for invalid input",
    () => {
        assert.throws(
            () =>
                createSentinel2PreparedRaster({
                    contractVersion: "1.0"
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_SENTINEL2_PREPARED_RASTER"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                return true;
            }
        );
    }
);
