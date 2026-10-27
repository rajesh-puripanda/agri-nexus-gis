
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
    origin: [700000, 2000000, 0],
    resolution: [10, -10, 0],
    boundingBox: [700000, 1999980, 700020, 2000000],
    geoKeys: {
        ProjectedCSTypeGeoKey: 32644,
        GTModelTypeGeoKey: 1,
        GTRasterTypeGeoKey: 1
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
        assert.ok(result.width > 0);
        assert.ok(result.height > 0);
        assert.equal(result.pixelCount, result.width * result.height);
        assert.equal(result.noData, 0);

        assert.equal(
            result.metadata.method,
            "provisional_ndvi_bsi_evidence_rules"
        );
        assert.equal(
            result.metadata.calibrationStatus,
            "provisional_uncalibrated"
        );

        // Statistics describe the source classification, before reprojection.
        assert.equal(result.statistics.validPixelCount, 3);
        assert.equal(result.statistics.noDataPixelCount, 1);

        const raster = await readGeoTiff(outputPath);

        assert.ok(raster.width > 0);
        assert.ok(raster.height > 0);
        assert.equal(raster.width, result.width);
        assert.equal(raster.height, result.height);
        assert.equal(raster.pixelCount, undefined);
        assert.equal(raster.samplesPerPixel, 1);
        assert.equal(raster.data[0].length, raster.width * raster.height);
        assert.equal(raster.noData, 0);

        assert.equal(raster.geoKeys.ProjectedCSTypeGeoKey, 3857);
        assert.ok(raster.resolution[0] > 0);
        assert.ok(raster.resolution[1] < 0);

        const outputClasses = new Set(Array.from(raster.data[0]));
        for (const value of outputClasses) {
            assert.ok(
                [0, 1, 2, 3].includes(value),
                `Unexpected classification value: ${value}`
            );
        }

        assert.ok(outputClasses.has(0), "Expected NoData class 0");

        console.log(
            "PASS: soil/vegetation classification is written in EPSG:3857"
        );
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
