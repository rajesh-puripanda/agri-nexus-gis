"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const geotiff = require("geotiff");

const {
    calculateCropConditionTemporalChangeStreaming
} = require("../services/cropIntelligence/cropConditionTemporalChangeStreamingWorkflowService");

const {
    writeCropConditionTemporalChangeRaster
} = require("../services/cropIntelligence/cropConditionTemporalChangeRasterWriter");

const NO_DATA = -9999;

const SPATIAL_REFERENCE = {
    origin: [100, 130, 0],
    resolution: [10, -10, 0],
    geoKeys: {
        GTModelTypeGeoKey: 1,
        GTRasterTypeGeoKey: 1,
        ProjectedCSTypeGeoKey: 32644
    }
};

async function createInputRaster(filePath, width, height, originY, values) {
    async function* rows() {
        for (let y = 0; y < height; y++) {
            yield new Float32Array(
                values.slice(y * width, (y + 1) * width)
            );
        }
    }

    await writeCropConditionTemporalChangeRaster({
        width,
        height,
        rows: rows(),
        outputPath: filePath,
        spatialReference: {
            ...SPATIAL_REFERENCE,
            origin: [100, originY, 0]
        },
        productMetadata: {
            productCode: "NDVI_TEMPORAL_CHANGE",
            units: "NDVI difference",
            calibrationStatus: "not_calibrated",
            method: "comparison_minus_baseline",
            baseline: {
                sceneId: "BASELINE_SCENE",
                date: "2026-09-08",
                indexCode: "NDVI"
            },
            comparison: {
                sceneId: "COMPARISON_SCENE",
                date: "2026-09-28",
                indexCode: "NDVI"
            },
            observationDates: ["2026-09-08", "2026-09-28"]
        }
    });
}

test("calculates pixel-wise NDVI change over an aligned common footprint", async () => {
    const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "agrinexus-crop-condition-")
    );

    const files = {
        baseline: path.join(directory, "baseline", "NDVI_CHANGE.tif"),
        comparison: path.join(directory, "comparison", "NDVI_CHANGE.tif"),
        output: path.join(directory, "condition", "NDVI_CHANGE.tif")
    };

    const baseline = {
        sceneId: "BASELINE_SCENE",
        date: "2026-09-08",
        indexCode: "NDVI"
    };

    const comparison = {
        sceneId: "COMPARISON_SCENE",
        date: "2026-09-28",
        indexCode: "NDVI"
    };

    try {
        // Baseline: 3x3, origin Y=130.
        await createInputRaster(
            files.baseline,
            3,
            3,
            130,
            [
                0.10, 0.20, 0.30,
                0.40, NO_DATA, 0.60,
                0.70, 0.80, 0.90
            ]
        );

        // Comparison: 3x2, origin Y=120.
        await createInputRaster(
            files.comparison,
            3,
            2,
            120,
            [
                0.20, 0.10, 0.50,
                0.50, 0.70, NO_DATA
            ]
        );

        const commonFootprint = {
            width: 3,
            height: 2,
            boundingBox: [100, 100, 130, 120],
            windows: [
                [0, 1, 3, 3],
                [0, 0, 3, 2]
            ]
        };

        const result =
            await calculateCropConditionTemporalChangeStreaming({
                baselinePath: files.baseline,
                comparisonPath: files.comparison,
                commonFootprint,
                outputPath: files.output,
                baseline,
                comparison,
                chunkRows: 1
            });

        assert.equal(result.productCode, "NDVI_TEMPORAL_CHANGE");
        assert.equal(result.width, 3);
        assert.equal(result.height, 2);
        assert.equal(result.noData, NO_DATA);
        assert.deepEqual(result.spatialReference.origin, [100, 120, 0]);
        assert.deepEqual(result.spatialReference.resolution, [10, -10, 0]);
        assert.equal(result.spatialReference.geoKeys.GTModelTypeGeoKey, 1);
        assert.equal(result.spatialReference.geoKeys.GTRasterTypeGeoKey, 1);
        assert.equal(result.spatialReference.geoKeys.ProjectedCSTypeGeoKey, 32644);

        const stats = result.statistics;

        assert.equal(stats.totalPixelCount, 6);
        assert.equal(stats.validPixelCount, 4);
        assert.equal(stats.noDataPixelCount, 2);

        assert.ok(Math.abs(stats.validCoveragePercent - 66.6666667) < 1e-6);
        assert.ok(Math.abs(stats.noDataCoveragePercent - 33.3333333) < 1e-6);
        assert.ok(Math.abs(stats.min - (-0.2)) < 1e-6);
        assert.ok(Math.abs(stats.max - (-0.1)) < 1e-6);
        assert.ok(Math.abs(stats.mean - (-0.15)) < 1e-6);

        assert.equal(result.method, "comparison_minus_baseline");
        assert.equal(result.calibrationStatus, "not_calibrated");

        const tiff = await geotiff.fromFile(files.output);

        try {
            const image = await tiff.getImage();

            assert.equal(image.getWidth(), 3);
            assert.equal(image.getHeight(), 2);
            assert.deepEqual(
                image.getOrigin().slice(0, 2),
                [100, 120]
            );
            assert.deepEqual(
                image.getResolution().slice(0, 2),
                [10, -10]
            );
            assert.equal(image.getGDALNoData(), NO_DATA);

            const actual = Array.from(
                await image.readRasters({ interleave: true })
            );

            const expected = [
                -0.2, NO_DATA, -0.1,
                -0.2, -0.1, NO_DATA
            ];

            actual.forEach((value, index) => {
                if (expected[index] === NO_DATA) {
                    assert.equal(value, NO_DATA);
                } else {
                    assert.ok(
                        Math.abs(value - expected[index]) < 1e-6,
                        `Pixel ${index}: expected ${expected[index]}, received ${value}`
                    );
                }
            });

            const keys = image.getGeoKeys();

            assert.equal(keys.ProjectedCSTypeGeoKey, 32644);
            assert.match(
                keys.GTCitationGeoKey,
                /NDVI_TEMPORAL_CHANGE/
            );
            assert.match(
                keys.GTCitationGeoKey,
                /not_calibrated/
            );
        } finally {
            await tiff.close();
            // Verify regeneration replaces an existing destination on Windows.
            await fs.writeFile(files.output, "previous-output");

            const regenerated =
                await calculateCropConditionTemporalChangeStreaming({
                    baselinePath: files.baseline,
                    comparisonPath: files.comparison,
                    commonFootprint,
                    outputPath: files.output,
                    baseline,
                    comparison,
                    chunkRows: 1
                });

            assert.equal(regenerated.productCode, "NDVI_TEMPORAL_CHANGE");
            assert.equal(regenerated.width, 3);
            assert.equal(regenerated.height, 2);

            const regeneratedTiff = await geotiff.fromFile(files.output);

            try {
                const image = await regeneratedTiff.getImage();

                assert.equal(image.getWidth(), 3);
                assert.equal(image.getHeight(), 2);

                const values = Array.from(
                    await image.readRasters({ interleave: true })
                );

                assert.ok(Math.abs(values[0] - (-0.2)) < 1e-6);
            } finally {
                await regeneratedTiff.close();
            }
        }
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
