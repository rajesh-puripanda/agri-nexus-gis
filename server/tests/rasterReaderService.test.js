"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");

const geotiff = require("geotiff");

const {
    readGeoTiff
} = require("../services/remoteSensing/raster/rasterReaderService");

const FIXTURE_DIR = path.join(__dirname, "fixtures", "raster");
const FIXTURE_PATH = path.join(FIXTURE_DIR, "reader-fixture.tif");

async function createFixture() {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });

    const values = new Float32Array([
        1, 2,
        3, 4
    ]);

    const metadata = {
        width: 2,
        height: 2,
        ModelPixelScale: [10, 10, 0],
        ModelTiepoint: [0, 0, 0, 100, 200, 0],
        GeographicTypeGeoKey: 4326,
        GDAL_NODATA: "-9999"
    };

    const arrayBuffer = await geotiff.writeArrayBuffer(
        values,
        metadata
    );

    await fs.writeFile(
        FIXTURE_PATH,
        Buffer.from(arrayBuffer)
    );
}

test.before(async () => {
    await createFixture();
});

test.after(async () => {
    await fs.rm(FIXTURE_PATH, {
        force: true
    });
});

test("GeoTIFF reader returns raster dimensions", async () => {
    const raster = await readGeoTiff(FIXTURE_PATH);

    assert.equal(raster.width, 2);
    assert.equal(raster.height, 2);
    assert.equal(raster.samplesPerPixel, 1);
});

test("GeoTIFF reader returns raster pixel data", async () => {
    const raster = await readGeoTiff(FIXTURE_PATH);

    assert.equal(raster.data.length, 1);
    assert.deepEqual(
        Array.from(raster.data[0]),
        [1, 2, 3, 4]
    );
});

test("GeoTIFF reader returns geospatial metadata", async () => {
    const raster = await readGeoTiff(FIXTURE_PATH);

    assert.deepEqual(
        raster.origin,
        [100, 200, 0]
    );

    assert.deepEqual(
        raster.resolution,
        [10, -10, 0]
    );

    assert.deepEqual(
        raster.boundingBox,
        [100, 180, 120, 200]
    );

    assert.equal(
        raster.geoKeys.GeographicTypeGeoKey,
        4326
    );
});

test("GeoTIFF reader returns file metadata", async () => {
    const raster = await readGeoTiff(FIXTURE_PATH);

    assert.equal(
        raster.metadata.fileName,
        "reader-fixture.tif"
    );

    assert.equal(
        raster.metadata.imageCount,
        1
    );
});

test("GeoTIFF reader rejects a non-GeoTIFF extension", async () => {
    await assert.rejects(
        () => readGeoTiff("example.txt"),
        {
            name: "Error"
        }
    );
});

test("GeoTIFF reader rejects an empty path", async () => {
    await assert.rejects(
        () => readGeoTiff(""),
        {
            name: "TypeError"
        }
    );
});




