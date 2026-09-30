"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const {
    DEFAULT_OPENJPEG_EXECUTABLE,
    decodeSentinel2Jp2Window,
    validateWindow
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2Jp2WindowDecoderService"
);

const PROJECT_ROOT = path.resolve(__dirname, "../..");

const B04_PATH = path.join(
    PROJECT_ROOT,
    "data/remote-sensing/acquisitions/sentinel2",
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920_B04_10m.jp2"
);

test("decodeSentinel2Jp2Window decodes the real Sentinel-2 B04 8x8 window", async () => {
    const result = await decodeSentinel2Jp2Window({
        inputPath: B04_PATH,
        x0: 5000,
        y0: 5000,
        x1: 5008,
        y1: 5008
    });

    assert.deepEqual(result.window, {
        x0: 5000,
        y0: 5000,
        x1: 5008,
        y1: 5008,
        width: 8,
        height: 8
    });

    assert.equal(result.dataType, "UINT16");
    assert.equal(result.samples.length, 64);

    assert.equal(result.bitsPerSample, 15);
    assert.equal(result.samples[0], 1272);
    assert.equal(Math.min(...result.samples), 1238);
    assert.equal(Math.max(...result.samples), 1344);

    assert.deepEqual(
        Array.from(result.samples),
        [
            1272, 1295, 1320, 1334, 1326, 1340, 1284,
            1310, 1286, 1322, 1332, 1318, 1302, 1268,
            1252, 1294, 1322, 1327, 1294, 1278, 1298,
            1314, 1292, 1288, 1336, 1292, 1261, 1281,
            1332, 1344, 1310, 1304, 1292, 1261, 1270,
            1265, 1261, 1274, 1288, 1302, 1238, 1277,
            1297, 1247, 1303, 1259, 1287, 1302, 1287,
            1313, 1344, 1305, 1271, 1327, 1325, 1314,
            1315, 1288, 1285, 1289, 1299, 1313, 1311,
            1303
        ]
    );
});

test("decodeSentinel2Jp2Window uses the application-managed OpenJPEG executable", () => {
    assert.equal(
        path.basename(DEFAULT_OPENJPEG_EXECUTABLE),
        "opj_decompress.exe"
    );

    assert.equal(
        fs.existsSync(DEFAULT_OPENJPEG_EXECUTABLE),
        true
    );
});

test("validateWindow accepts a valid decode window", () => {
    assert.doesNotThrow(() => {
        validateWindow({
            x0: 5000,
            y0: 5000,
            x1: 5008,
            y1: 5008
        });
    });
});

test("validateWindow rejects a reversed horizontal window", () => {
    assert.throws(
        () => validateWindow({
            x0: 5008,
            y0: 5000,
            x1: 5000,
            y1: 5008
        }),
        /x1 must be greater than x0/
    );
});

test("validateWindow rejects a reversed vertical window", () => {
    assert.throws(
        () => validateWindow({
            x0: 5000,
            y0: 5008,
            x1: 5008,
            y1: 5000
        }),
        /y1 must be greater than y0/
    );
});

test("decodeSentinel2Jp2Window rejects a missing JP2 file", async () => {
    await assert.rejects(
        () => decodeSentinel2Jp2Window({
            inputPath: path.join(
                PROJECT_ROOT,
                "data/remote-sensing/acquisitions/sentinel2",
                "missing-sentinel2-file.jp2"
            ),
            x0: 5000,
            y0: 5000,
            x1: 5008,
            y1: 5008
        }),
        /does not exist|not found|ENOENT/i
    );
});
