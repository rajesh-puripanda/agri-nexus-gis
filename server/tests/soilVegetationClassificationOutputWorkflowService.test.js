"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { readGeoTiff } =
    require("../services/remoteSensing/raster/rasterReaderService");

const {
    processAndWriteSoilVegetationClassification
} = require("../services/remoteSensing/soilVegetation/soilVegetationClassificationOutputWorkflowService");

const spatialReference = {
    origin: [0, 0, 0],
    resolution: [10, -10, 0],
    boundingBox: [0, -20, 20, 0],
    geoKeys: {
        ProjectedCSTypeGeoKey: 32644
    }
};

function createRaster(code, values) {
    return {
        contractVersion: "1.0",
        width: 2,
        height: 2,
        pixelCount: 4,
        bands: {
            [code]: {
                data: new Float32Array(values),
                sourceBand: 1
            }
        },
        noData: -9999,
        spatialReference,
        metadata: {}
    };
}

function createRequest() {
    return {
        contractVersion: "1.0",
        analysisType: "remote_sensing_soil_vegetation_separation",
        method: "evidence_comparison",
        interpretationMode: "context_dependent",
        inputs: {
            ndvi: {
                raster: createRaster("NDVI", [0.6, 0.1, 0.3, -9999])
            },
            bsi: {
                raster: createRaster("BSI", [0.1, 0.3, 0.2, 0.5])
            }
        },
        spatialContext: {},
        parameters: {}
    };
}

test("classifies paired NDVI/BSI and writes a georeferenced GeoTIFF", async () => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-soil-vegetation-workflow-")
    );
    const outputPath = path.join(
        directory,
        "soil_vegetation_classification.tif"
    );

    try {
        const result = await processAndWriteSoilVegetationClassification({
            request: createRequest(),
            outputPath
        });

        assert.equal(result.format, "GeoTIFF");
        assert.equal(result.width, 2);
        assert.equal(result.height, 2);
        assert.equal(result.pixelCount, 4);
        assert.equal(result.noData, 0);
        assert.equal(
            result.metadata.method,
            "provisional_ndvi_bsi_evidence_rules"
        );
        assert.equal(
            result.metadata.calibrationStatus,
            "provisional_uncalibrated"
        );

        assert.equal(result.statistics.validPixelCount, 3);
        assert.equal(result.statistics.noDataPixelCount, 1);

        const raster = await readGeoTiff(outputPath);

        assert.equal(raster.width, 2);
        assert.equal(raster.height, 2);
        assert.equal(raster.samplesPerPixel, 1);
        assert.deepEqual(Array.from(raster.data[0]), [1, 2, 3, 0]);
        assert.equal(raster.noData, 0);
        assert.deepEqual(raster.origin, [0, 0, 0]);
        assert.deepEqual(raster.resolution, [10, -10, 0]);
        assert.equal(raster.geoKeys.ProjectedCSTypeGeoKey, 32644);

        console.log("PASS: end-to-end soil/vegetation classification output");
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
