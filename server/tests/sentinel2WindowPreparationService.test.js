"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    prepareSentinel2Window,
    assertSameWindow
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2WindowPreparationService"
);

test("prepareSentinel2Window converts Red and NIR DN windows to Float32 reflectance", async () => {
    const redSamples = new Uint16Array([
        1000, 2000, 0, 5000
    ]);

    const nirSamples = new Uint16Array([
        4000, 3000, 0, 8000
    ]);

    const decodeWindowImpl = async ({ inputPath, x0, y0, x1, y1 }) => ({
        inputPath,
        window: {
            x0,
            y0,
            x1,
            y1,
            width: 2,
            height: 2
        },
        dataType: "UINT16",
        samples:
            inputPath === "red.jp2"
                ? redSamples
                : nirSamples
    });

    const result = await prepareSentinel2Window({
        redInputPath: "red.jp2",
        nirInputPath: "nir.jp2",
        x0: 5000,
        y0: 5000,
        x1: 5002,
        y1: 5002,
        scale: 0.0001,
        offset: -0.1,
        sourceNoData: 0,
        outputNoData: -9999,
        decodeWindowImpl
    });

    assert.deepEqual(result.window, {
        x0: 5000,
        y0: 5000,
        x1: 5002,
        y1: 5002,
        width: 2,
        height: 2
    });

    assert.equal(result.pixelCount, 4);

    assert.equal(result.bands.Red.dataType, "Float32");
    assert.equal(result.bands.NIR.dataType, "Float32");

    assert.deepEqual(
        Array.from(result.bands.Red.data).map(value =>
            Number(value.toFixed(6))
        ),
        [0, 0.1, -9999, 0.4]
    );

    assert.deepEqual(
        Array.from(result.bands.NIR.data).map(value =>
            Number(value.toFixed(6))
        ),
        [0.3, 0.2, -9999, 0.7]
    );

    assert.deepEqual(result.radiometry, {
        sourceDataType: "UINT16",
        scale: 0.0001,
        offset: -0.1,
        noData: 0,
        formula: "physicalValue = DN * scale + offset"
    });
});

test("prepareSentinel2Window preserves NoData as output NoData", async () => {
    const decodeWindowImpl = async ({ inputPath }) => ({
        inputPath,
        window: {
            x0: 0,
            y0: 0,
            x1: 2,
            y1: 2,
            width: 2,
            height: 2
        },
        dataType: "UINT16",
        samples: new Uint16Array([0, 1000, 0, 2000])
    });

    const result = await prepareSentinel2Window({
        redInputPath: "red.jp2",
        nirInputPath: "nir.jp2",
        x0: 0,
        y0: 0,
        x1: 2,
        y1: 2,
        scale: 0.0001,
        offset: -0.1,
        sourceNoData: 0,
        outputNoData: -9999,
        decodeWindowImpl
    });

    assert.equal(result.bands.Red.data[0], -9999);
    assert.equal(result.bands.Red.data[2], -9999);
    assert.equal(result.bands.NIR.data[0], -9999);
    assert.equal(result.bands.NIR.data[2], -9999);
});

test("prepareSentinel2Window rejects mismatched Red and NIR windows", async () => {
    const decodeWindowImpl = async ({ inputPath }) => ({
        inputPath,
        window:
            inputPath === "red.jp2"
                ? {
                    x0: 0,
                    y0: 0,
                    x1: 2,
                    y1: 2,
                    width: 2,
                    height: 2
                }
                : {
                    x0: 1,
                    y0: 0,
                    x1: 3,
                    y1: 2,
                    width: 2,
                    height: 2
                },
        dataType: "UINT16",
        samples: new Uint16Array([1, 2, 3, 4])
    });

    await assert.rejects(
        () =>
            prepareSentinel2Window({
                redInputPath: "red.jp2",
                nirInputPath: "nir.jp2",
                x0: 0,
                y0: 0,
                x1: 2,
                y1: 2,
                scale: 0.0001,
                offset: -0.1,
                decodeWindowImpl
            }),
        /Red and NIR decode windows do not match: x0/
    );
});

test("assertSameWindow rejects mismatched dimensions", () => {
    assert.throws(
        () =>
            assertSameWindow(
                {
                    window: {
                        x0: 0,
                        y0: 0,
                        x1: 2,
                        y1: 2,
                        width: 2,
                        height: 2
                    }
                },
                {
                    window: {
                        x0: 0,
                        y0: 0,
                        x1: 2,
                        y1: 2,
                        width: 1,
                        height: 4
                    }
                }
            ),
        /dimensions do not match/
    );
});

test("prepareSentinel2Window requires valid radiometric parameters", async () => {
    await assert.rejects(
        () =>
            prepareSentinel2Window({
                redInputPath: "red.jp2",
                nirInputPath: "nir.jp2",
                x0: 0,
                y0: 0,
                x1: 2,
                y1: 2,
                scale: "0.0001",
                offset: -0.1
            }),
        /scale must be a finite number/
    );
});
