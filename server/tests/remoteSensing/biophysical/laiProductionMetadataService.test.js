"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
    writeProductionMetadata,
    readProductionMetadata
} = require("../../../services/remoteSensing/catalog/sentinel2IndexProductionMetadataService");

async function setup(t) {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "lai-metadata-")
    );
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return directory;
}

test("registers LAI without replacing an existing NDVI entry", async (t) => {
    const outputDirectory = await setup(t);

    const common = {
        sceneId: "scene-test",
        acquisitionDate: "2026-09-08",
        targetResolution: 10,
        workflowVersion: "1.0"
    };

    await writeProductionMetadata({
        outputDirectory,
        workflowResult: {
            ...common,
            indexCode: "NDVI",
            indexName: "Normalized Difference Vegetation Index",
            requiredBands: ["B04", "B08"],
            outputProcessing: {
                outputPaths: {
                    continuous: path.join(outputDirectory, "NDVI_index.tif"),
                    classification: path.join(outputDirectory, "NDVI_classification.tif")
                }
            }
        }
    });

    await writeProductionMetadata({
        outputDirectory,
        workflowResult: {
            ...common,
            productCode: "LAI",
            productName: "Leaf Area Index",
            inputProduct: "NDVI",
            model: {
                id: "ndvi-lai-empirical-v1",
                calibrationStatus: "provisional_uncalibrated"
            },
            outputPath: path.join(outputDirectory, "LAI_index.tif")
        }
    });

    const metadata = await readProductionMetadata(outputDirectory);

    assert.equal(metadata.products.length, 2);

    const ndvi = metadata.products.find((item) => item.indexCode === "NDVI");
    const lai = metadata.products.find((item) => item.productCode === "LAI");

    assert.ok(ndvi, "NDVI entry should remain in the manifest");
    assert.ok(lai, "LAI entry should be registered");
    assert.equal(lai.productType, "biophysical");
    assert.equal(lai.outputs.continuous, "LAI_index.tif");
    assert.equal(lai.availability.continuous, true);
    assert.equal(lai.availability.classification, false);
    assert.equal(lai.model.calibrationStatus, "provisional_uncalibrated");
});

test("rejects invalid LAI target resolution", async (t) => {
    const outputDirectory = await setup(t);

    await assert.rejects(
        writeProductionMetadata({
            outputDirectory,
            workflowResult: {
                productCode: "LAI",
                sceneId: "scene-test",
                acquisitionDate: "2026-09-08",
                targetResolution: "10",
                workflowVersion: "1.0",
                outputPath: path.join(outputDirectory, "LAI_index.tif")
            }
        }),
        /targetResolution must be a positive finite number/
    );
});