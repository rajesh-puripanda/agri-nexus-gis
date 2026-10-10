"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const geotiff = require("geotiff");

const {
    ensureRasterRenderCache,
    getRenderCachePath
} = require("../services/remoteSensing/raster/rasterRenderService");

async function createSourceRaster(sourcePath, value = 7) {
    const data = new Float32Array(10000).fill(value);

    const buffer = await geotiff.writeArrayBuffer(data, {
        width: 100,
        height: 100,
        ModelPixelScale: [10, 10, 0],
        ModelTiepoint: [0, 0, 0, 500000, 2000000, 0],
        GTModelTypeGeoKey: 1,
        GTRasterTypeGeoKey: 1,
        ProjectedCSTypeGeoKey: 32644,
        GDAL_NODATA: "-9999"
    });

    await fs.writeFile(sourcePath, Buffer.from(buffer));
}

async function cleanupCache(cachePath) {
    await fs.rm(cachePath, { force: true });
    await fs.rm(`${cachePath}.source.json`, { force: true });
}

test("shared renderer produces a reusable Web Mercator index cache", async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agri-render-"));
    const sourcePath = path.join(dir, "source.tif");
    const cachePath = getRenderCachePath(sourcePath, "NDVI", "index");

    t.after(async () => {
        await cleanupCache(cachePath);
        await fs.rm(dir, { recursive: true, force: true });
    });

    await createSourceRaster(sourcePath);

    const first = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });
    assert.equal(first.reused, false);

    const output = await geotiff.fromFile(cachePath);
    const image = await output.getImage();
    assert.equal(image.getGeoKeys().ProjectedCSTypeGeoKey, 3857);

    const second = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });
    assert.equal(second.reused, true);
});

test("classification caches are created and reused independently", async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agri-render-class-"));
    const sourcePath = path.join(dir, "source.tif");
    const cachePath = getRenderCachePath(
        sourcePath, "SSMI", "classification"
    );

    t.after(async () => {
        await cleanupCache(cachePath);
        await fs.rm(dir, { recursive: true, force: true });
    });

    await createSourceRaster(sourcePath);

    const first = await ensureRasterRenderCache({
        sourcePath, indexCode: "SSMI", type: "classification", maxSize: 64
    });
    assert.equal(first.reused, false);

    const output = await geotiff.fromFile(cachePath);
    const image = await output.getImage();
    assert.equal(image.getGeoKeys().ProjectedCSTypeGeoKey, 3857);

    const second = await ensureRasterRenderCache({
        sourcePath, indexCode: "SSMI", type: "classification", maxSize: 64
    });
    assert.equal(second.reused, true);
});

test("source changes invalidate cache even when source timestamp is older", async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agri-render-stale-"));
    const sourcePath = path.join(dir, "source.tif");
    const cachePath = getRenderCachePath(sourcePath, "NDVI", "index");

    t.after(async () => {
        await cleanupCache(cachePath);
        await fs.rm(dir, { recursive: true, force: true });
    });

    await createSourceRaster(sourcePath, 7);

    const first = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });
    assert.equal(first.reused, false);

    const originalStat = await fs.stat(sourcePath);

    await createSourceRaster(sourcePath, 9);
    await fs.utimes(
        sourcePath,
        originalStat.atime,
        new Date(1000)
    );

    const refreshed = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });

    assert.equal(refreshed.reused, false);

    const next = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });
    assert.equal(next.reused, true);
});

test("changing maxSize invalidates the existing cache", async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agri-render-size-"));
    const sourcePath = path.join(dir, "source.tif");
    const cachePath = getRenderCachePath(sourcePath, "NDVI", "index");

    t.after(async () => {
        await cleanupCache(cachePath);
        await fs.rm(dir, { recursive: true, force: true });
    });

    await createSourceRaster(sourcePath);

    const first = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 64
    });
    assert.equal(first.reused, false);

    const resized = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 32
    });
    assert.equal(resized.reused, false);

    const output = await geotiff.fromFile(cachePath);
    const image = await output.getImage();
    assert.ok(image.getWidth() <= 32);
    assert.ok(image.getHeight() <= 32);

    const next = await ensureRasterRenderCache({
        sourcePath, indexCode: "NDVI", type: "index", maxSize: 32
    });
    assert.equal(next.reused, true);
});
