"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const geotiff = require("geotiff");

const {
    createWebMercatorRaster
} = require("../services/remoteSensing/raster/webMercatorRasterService");

test("reprojects a UTM raster into Web Mercator and preserves NoData", async t => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-warp-test-")
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));

    const sourcePath = path.join(directory, "source.tif");
    const width = 100;
    const height = 100;
    const noData = -9999;
    const values = new Float32Array(width * height).fill(7);

    // A sizable NoData area ensures it survives display resampling.
    for (let row = 35; row < 65; row++) {
        for (let col = 35; col < 65; col++) {
            values[row * width + col] = noData;
        }
    }

    const sourceBuffer = await geotiff.writeArrayBuffer(values, {
        width,
        height,
        ModelPixelScale: [10, 10, 0],
        ModelTiepoint: [0, 0, 0, 500000, 2000000, 0],
        GTModelTypeGeoKey: 1,
        GTRasterTypeGeoKey: 1,
        ProjectedCSTypeGeoKey: 32644,
        GDAL_NODATA: String(noData)
    });

    await fs.writeFile(sourcePath, Buffer.from(sourceBuffer));

    const result = await createWebMercatorRaster({
        sourcePath,
        maxSize: 64
    });

    assert.equal(result.targetEpsg, 3857);
    assert.ok(result.width > 0 && result.width <= 64);
    assert.ok(result.height > 0 && result.height <= 64);
    assert.ok(result.boundingBox[0] < result.boundingBox[2]);
    assert.ok(result.boundingBox[1] < result.boundingBox[3]);

    const outputTiff = await geotiff.fromArrayBuffer(result.arrayBuffer);
    const outputImage = await outputTiff.getImage();

    assert.equal(outputImage.getWidth(), result.width);
    assert.equal(outputImage.getHeight(), result.height);
    assert.equal(outputImage.getGeoKeys().ProjectedCSTypeGeoKey, 3857);
    assert.equal(Number(outputImage.getGDALNoData()), noData);

    const outputRaster = await outputImage.readRasters();
    const outputValues = outputRaster[0];

    assert.ok(outputValues.some(value => value === 7),
        "expected valid raster pixels");
    assert.ok(outputValues.some(value => value === noData),
        "expected NoData pixels");
});
