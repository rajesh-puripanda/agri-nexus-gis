"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const geotiff = require("geotiff");
const proj4 = require("proj4");

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
    const values = new Float32Array(width * height);

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            values[row * width + col] = row * width + col;
        }
    }

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
    const outputBBox = outputImage.getBoundingBox();
    const outputOrigin = outputImage.getOrigin();
    const outputResolution = outputImage.getResolution();

        // Verify a valid output pixel against its inverse-projected source pixel.
    const outputRow = 10;
    const outputCol = 10;

    const mercatorX =
        outputBBox[0] +
        (outputCol + 0.5) * outputResolution[0];

    const mercatorY =
        outputBBox[3] +
        (outputRow + 0.5) * outputResolution[1];

    const [sourceX, sourceY] = proj4(
        "EPSG:3857",
        "EPSG:32644",
        [mercatorX, mercatorY]
    );

    const sourceCol = Math.floor((sourceX - 500000) / 10);
    const sourceRow = Math.floor((2000000 - sourceY) / 10);

    const expectedValue =
        values[sourceRow * width + sourceCol];

    const actualValue =
        outputValues[outputRow * result.width + outputCol];

    assert.equal(
        actualValue,
        expectedValue,
        "output pixel should match its inverse-projected source pixel"
    );

    assert.equal(outputImage.getGeoKeys().ProjectedCSTypeGeoKey, 3857);

    const controlPoint = [500500, 1999500];
    const projectedPoint = proj4(
        "EPSG:32644",
        "EPSG:3857",
        controlPoint
    );

    assert.ok(
        projectedPoint[0] >= outputBBox[0] &&
        projectedPoint[0] <= outputBBox[2] &&
        projectedPoint[1] >= outputBBox[1] &&
        projectedPoint[1] <= outputBBox[3],
        "projected control point should fall inside the output raster"
    );

    assert.ok(
        outputValues.some(value =>
            Number.isFinite(value) &&
            value !== noData
        ),
        "expected valid raster pixels"
    );
    assert.ok(outputValues.some(value => value === noData),
        "expected NoData pixels");
});
