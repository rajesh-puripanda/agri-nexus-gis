"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
    prepareSentinel2Window
} = require("../services/remoteSensing/acquisition/sentinel2WindowPreparationService");

const {
    calculateSentinel2NdviWindow
} = require("../services/remoteSensing/sentinel2WindowIndexService");

const SCENE_ID =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920";

const ACQUISITION_DIRECTORY =
    path.resolve(
        __dirname,
        "../../data/remote-sensing/acquisitions/sentinel2"
    );

const RED_INPUT_PATH =
    path.join(
        ACQUISITION_DIRECTORY,
        `${SCENE_ID}_B04_10m.jp2`
    );

const NIR_INPUT_PATH =
    path.join(
        ACQUISITION_DIRECTORY,
        `${SCENE_ID}_B08_10m.jp2`
    );

test(
    "real Sentinel-2 B04/B08 window produces bounded Float32 NDVI",
    async () => {
        const prepared =
            await prepareSentinel2Window({
                redInputPath: RED_INPUT_PATH,
                nirInputPath: NIR_INPUT_PATH,

                x0: 5000,
                y0: 5000,
                x1: 5008,
                y1: 5008,

                scale: 0.0001,
                offset: -0.1,

                sourceNoData: 0,
                outputNoData: -9999
            });

        assert.equal(
            prepared.window.width,
            8
        );

        assert.equal(
            prepared.window.height,
            8
        );

        assert.equal(
            prepared.pixelCount,
            64
        );

        assert.equal(
            prepared.bands.Red.dataType,
            "Float32"
        );

        assert.equal(
            prepared.bands.NIR.dataType,
            "Float32"
        );

        const ndvi =
            calculateSentinel2NdviWindow({
                red: prepared.bands.Red,
                nir: prepared.bands.NIR,
                pixelCount: prepared.pixelCount,
                noData: prepared.radiometry.noData
            });

        assert.equal(
            ndvi.indexCode,
            "NDVI"
        );

        assert.equal(
            ndvi.dataType,
            "Float32"
        );

        assert.equal(
            ndvi.pixelCount,
            64
        );

        assert.equal(
            ndvi.validPixelCount +
                ndvi.noDataPixelCount,
            64
        );

        assert.ok(
            ndvi.validPixelCount > 0,
            "Expected at least one valid NDVI pixel."
        );

        assert.ok(
            ndvi.data instanceof Float32Array
        );

        for (const value of ndvi.data) {
            if (value === -9999) {
                continue;
            }

            assert.ok(
                Number.isFinite(value),
                "NDVI must contain only finite values or NoData."
            );

            assert.ok(
                value >= -1 &&
                    value <= 1,
                `NDVI value ${value} is outside [-1, 1].`
            );
        }

        console.log("\n=== REAL SENTINEL-2 NDVI WINDOW ===");
        console.log("Scene:", SCENE_ID);
        console.log("Window:", prepared.window);
        console.log("Pixel count:", ndvi.pixelCount);
        console.log("Valid pixels:", ndvi.validPixelCount);
        console.log("NoData pixels:", ndvi.noDataPixelCount);

        const validNdvi =
            Array.from(ndvi.data)
                .filter(value => value !== -9999);

        console.log(
            "NDVI min:",
            Math.min(...validNdvi)
        );

        console.log(
            "NDVI max:",
            Math.max(...validNdvi)
        );

        console.log(
            "First 16 NDVI values:",
            Array.from(ndvi.data.slice(0, 16))
                .map(value =>
                    Number(value.toFixed(6))
                )
        );
    }
);

