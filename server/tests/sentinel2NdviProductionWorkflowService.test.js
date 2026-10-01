"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SENTINEL2_NDVI_PRODUCTION_WORKFLOW_VERSION,
    SENTINEL2_NDVI_BAND_MAPPING,
    processSentinel2NdviProductionWorkflow
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2NdviProductionWorkflowService"
);

test(
    "processSentinel2NdviProductionWorkflow composes Sentinel-2 preparation with NDVI raster workflow",
    async () => {
        const calls = [];

        const preparation =
            {
                workflowVersion: "1.0",
                sceneId:
                    "S2C_TEST_SCENE",
                acquisitionDate:
                    "2026-09-08T04:47:01Z",
                outputPath:
                    "prepared/S2C_TEST_SCENE_NDVI_prepared.tif",
                width: 10980,
                height: 10980,
                pixelCount:
                    10980 * 10980,
                bandCount: 2,
                dataType: "Float32"
            };

        const rasterWorkflow =
            {
                workflowVersion: "1.0",
                indexCode: "NDVI",
                continuousOutput: {
                    outputPath:
                        "outputs/NDVI_index.tif"
                },
                classificationOutput: {
                    outputPath:
                        "outputs/NDVI_classification.tif"
                }
            };

        const preparationImpl =
            async (args) => {
                calls.push({
                    step: "preparation",
                    args
                });

                return preparation;
            };

        const rasterWorkflowImpl =
            async (args) => {
                calls.push({
                    step: "rasterWorkflow",
                    args
                });

                return rasterWorkflow;
            };

        const result =
            await processSentinel2NdviProductionWorkflow({
                request: {
                    collection:
                        "SENTINEL-2",
                    bbox:
                        [82.9, 17.6, 83.4, 17.9]
                },

                acquisitionOutputDirectory:
                    "prepared",

                preparedOutputFileName:
                    "S2C_TEST_SCENE_NDVI_prepared.tif",

                rasterOutputDirectory:
                    "outputs",

                preparationImpl,
                rasterWorkflowImpl
            });

        assert.deepEqual(
            calls.map(
                call => call.step
            ),
            [
                "preparation",
                "rasterWorkflow"
            ]
        );

        assert.deepEqual(
            calls[0].args,
            {
                request: {
                    collection:
                        "SENTINEL-2",
                    bbox:
                        [82.9, 17.6, 83.4, 17.9]
                },
                outputDirectory:
                    "prepared",
                outputFileName:
                    "S2C_TEST_SCENE_NDVI_prepared.tif"
            }
        );

        assert.deepEqual(
            calls[1].args,
            {
                inputPath:
                    preparation.outputPath,
                indexCode:
                    "NDVI",
                bandMapping:
                    SENTINEL2_NDVI_BAND_MAPPING,
                outputDirectory:
                    "outputs"
            }
        );

        assert.equal(
            result.workflowVersion,
            SENTINEL2_NDVI_PRODUCTION_WORKFLOW_VERSION
        );

        assert.equal(
            result.sceneId,
            preparation.sceneId
        );

        assert.equal(
            result.acquisitionDate,
            preparation.acquisitionDate
        );

        assert.deepEqual(
            result.preparation,
            preparation
        );

        assert.deepEqual(
            result.rasterWorkflow,
            rasterWorkflow
        );
    }
);
