"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
    prepareSentinel2Window
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2WindowPreparationService"
);

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const ACQUISITION_DIRECTORY = path.join(
    PROJECT_ROOT,
    "data/remote-sensing/acquisitions/sentinel2"
);

const SCENE_ID =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920";

const RED_PATH = path.join(
    ACQUISITION_DIRECTORY,
    `${SCENE_ID}_B04_10m.jp2`
);

const NIR_PATH = path.join(
    ACQUISITION_DIRECTORY,
    `${SCENE_ID}_B08_10m.jp2`
);

test("real Sentinel-2 B04/B08 window preparation produces Float32 Red and NIR", async () => {
    const result = await prepareSentinel2Window({
        redInputPath: RED_PATH,
        nirInputPath: NIR_PATH,

        x0: 5000,
        y0: 5000,
        x1: 5008,
        y1: 5008,

        scale: 0.0001,
        offset: -0.1,

        sourceNoData: 0,
        outputNoData: -9999
    });

    assert.deepEqual(result.window, {
        x0: 5000,
        y0: 5000,
        x1: 5008,
        y1: 5008,
        width: 8,
        height: 8
    });

    assert.equal(result.pixelCount, 64);

    assert.equal(
        result.bands.Red.dataType,
        "Float32"
    );

    assert.equal(
        result.bands.NIR.dataType,
        "Float32"
    );

    assert.equal(
        result.bands.Red.data.length,
        64
    );

    assert.equal(
        result.bands.NIR.data.length,
        64
    );

    const redValues =
        Array.from(result.bands.Red.data);

    const nirValues =
        Array.from(result.bands.NIR.data);

    assert.ok(
        redValues.some(value => value !== -9999),
        "Red window should contain valid reflectance values."
    );

    assert.ok(
        nirValues.some(value => value !== -9999),
        "NIR window should contain valid reflectance values."
    );

    const redValidValues =
        redValues.filter(value => value !== -9999);

    const nirValidValues =
        nirValues.filter(value => value !== -9999);

    for (const value of redValidValues) {
        assert.ok(
            Number.isFinite(value),
            "Red reflectance must be finite."
        );

        assert.ok(
            value >= -0.1,
            `Unexpected Red reflectance: ${value}`
        );
    }

    for (const value of nirValidValues) {
        assert.ok(
            Number.isFinite(value),
            "NIR reflectance must be finite."
        );

        assert.ok(
            value >= -0.1,
            `Unexpected NIR reflectance: ${value}`
        );
    }

    assert.deepEqual(
        result.radiometry,
        {
            sourceDataType: "UINT16",
            scale: 0.0001,
            offset: -0.1,
            noData: 0,
            formula:
                "physicalValue = DN * scale + offset"
        }
    );
});
