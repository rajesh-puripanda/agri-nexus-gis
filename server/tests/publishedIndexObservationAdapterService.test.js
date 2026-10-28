"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const geotiff = require("geotiff");

const {
    createPublishedIndexObservation
} = require("../services/remoteSensing/temporal/publishedIndexObservationAdapterService");

async function fixture(values = [0.2, 0.4, -9999, 0.8]) {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-published-index-")
    );

    const sceneId = "TEST_SCENE";
    const acquisitionDate = "2026-09-08";

    await fs.writeFile(
        path.join(directory, "NDVI_index.tif"),
        Buffer.from(geotiff.writeArrayBuffer(
            new Float32Array(values),
            {
                width: 2,
                height: 2,
                BitsPerSample: [32],
                SampleFormat: [3],
                SamplesPerPixel: 1,
                PhotometricInterpretation: 1,
                PlanarConfiguration: 1,
                GDAL_NODATA: "-9999",
                ModelPixelScale: [10, 10, 0],
                ModelTiepoint: [0, 0, 0, 700000, 2000000, 0],
                ProjectedCSTypeGeoKey: 32644,
                GTRasterTypeGeoKey: 1
            }
        ))
    );

    await fs.writeFile(
        path.join(directory, "production_metadata.json"),
        JSON.stringify({
            observation: { sceneId, acquisitionDate },
            products: [{
                indexCode: "NDVI",
                indexName: "Normalized Difference Vegetation Index",
                sceneId,
                acquisitionDate,
                workflowVersion: "1.0",
                outputs: {
                    continuous: "NDVI_index.tif",
                    classification: "NDVI_classification.tif"
                },
                availability: { continuous: true, classification: false }
            }]
        })
    );

    return directory;
}

test("creates an observation with correct streamed raster statistics", async () => {
    const directory = await fixture();

    try {
        const result = await createPublishedIndexObservation({
            sceneDirectory: directory,
            indexCode: "NDVI",
            chunkRows: 1
        });

        assert.equal(result.raster.width, 2);
        assert.equal(result.raster.height, 2);
        assert.equal(result.raster.pixelCount, 4);
        assert.equal(result.statistics.validPixelCount, 3);
        assert.equal(result.statistics.noDataPixelCount, 1);
        assert.ok(Math.abs(result.statistics.minimum - 0.2) < 1e-6);
        assert.ok(Math.abs(result.statistics.maximum - 0.8) < 1e-6);
        assert.ok(Math.abs(result.statistics.mean - (1.4 / 3)) < 1e-6);
        assert.equal(result.spatialContext.projectedCrsCode, 32644);
        assert.equal(result.processingContext.outOfRangePixelCount, 0);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("rejects a missing production manifest", async () => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-missing-manifest-")
    );

    try {
        await assert.rejects(
            () => createPublishedIndexObservation({
                sceneDirectory: directory,
                indexCode: "NDVI"
            }),
            /Missing production_metadata\.json/
        );
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});



test("rejects an unknown index code", async () => {
    await assert.rejects(
        () => createPublishedIndexObservation({
            sceneDirectory: ".",
            indexCode: "UNKNOWN"
        }),
        /Unregistered index: UNKNOWN/
    );
});

test("reports NDVI pixels outside the registered range without clamping", async () => {
    const directory = await fixture([0.2, 1.2, -9999, 0.8]);

    try {
        const result = await createPublishedIndexObservation({
            sceneDirectory: directory,
            indexCode: "NDVI",
            chunkRows: 1
        });

        assert.equal(result.processingContext.outOfRangePixelCount, 1);
        assert.ok(Math.abs(result.statistics.maximum - 1.2) < 1e-6);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
