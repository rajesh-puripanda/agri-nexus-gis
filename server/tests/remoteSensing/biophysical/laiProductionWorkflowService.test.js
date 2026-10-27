
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
    processLaiProductionWorkflow
} = require("../../../services/remoteSensing/biophysical/laiProductionWorkflowService");

const model = {
    id: "ndvi-lai-empirical-v1",
    name: "Configurable NDVI-to-LAI empirical model",
    source: "Unverified placeholder",
    vegetationScope: "Unspecified; provisional only",
    calibrationStatus: "provisional_uncalibrated",
    parameters: {
        ndviBackground: 0.15,
        ndviAsymptote: 0.93,
        extinctionCoefficient: 1.58
    }
};

const raster = {
    width: 2,
    height: 1,
    data: [new Float32Array([0.15, 0.5])],
    noData: -9999,
    origin: [699960, 2000040, 0],
    resolution: [10, -10, 0],
    boundingBox: [699960, 2000030, 699980, 2000040],
    geoKeys: { ProjectedCSTypeGeoKey: 32644 }
};

async function setup(t) {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "lai-workflow-")
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    await fs.writeFile(path.join(directory, "NDVI_index.tif"), "test");
    return directory;
}

test("reuses valid NDVI and writes LAI", async (t) => {
    const directory = await setup(t);
    let written;

    const result = await processLaiProductionWorkflow({
        outputDirectory: directory,
        model,
        readRasterImpl: async () => raster,
        writeRasterImpl: async ({ request, outputPath }) => {
            written = { request, outputPath };
            return { outputPath, format: "GeoTIFF" };
        },
        ndviWorkflowImpl: async () => {
            assert.fail("Should reuse existing NDVI");
        }
    });

    assert.equal(result.ndviSource, "existing");
    assert.equal(result.validPixelCount, 2);
    assert.equal(written.request.productCode, "LAI");
    assert.equal(written.request.raster.bands.LAI.dataType, "Float32");
    assert.equal(path.basename(result.outputPath), "LAI_index.tif");
});

test("regenerates missing NDVI when request is supplied", async (t) => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "lai-workflow-")
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));

    const rasterDirectory = path.join(directory, "production");
    await fs.mkdir(rasterDirectory);

    let regenerationCalled = false;

    const result = await processLaiProductionWorkflow({
        outputDirectory: rasterDirectory,
        model,
        readRasterImpl: async () => raster,
        writeRasterImpl: async ({ outputPath }) => ({ outputPath }),
        ndviWorkflowImpl: async () => {
            regenerationCalled = true;
            await fs.writeFile(
                path.join(rasterDirectory, "NDVI_index.tif"),
                "test"
            );
        },
        regeneration: {
            request: { acquisitionParameters: { sceneId: "scene-test" } },
            acquisitionOutputDirectory: directory,
            preparedOutputFileName: "prepared.tif",
            rasterOutputDirectory: rasterDirectory
        }
    });

    assert.equal(regenerationCalled, true);
    assert.equal(result.ndviSource, "regenerated");
});

test("rejects missing NDVI without regeneration details", async (t) => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "lai-workflow-")
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));

    await assert.rejects(
        processLaiProductionWorkflow({
            outputDirectory: directory,
            model,
            readRasterImpl: async () => raster
        }),
        /NDVI is missing or invalid/
    );
});
