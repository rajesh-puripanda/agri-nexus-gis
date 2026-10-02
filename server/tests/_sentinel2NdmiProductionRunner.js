"use strict";

const path = require("node:path");

const {
    processSentinel2IndexProductionWorkflow,
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2IndexProductionWorkflowService"
);

const preparedOutputDirectory =
    path.resolve("./test-output");

const rasterOutputDirectory =
    path.resolve(
        "./data/remote-sensing/outputs"
    );

const sceneId =
    "S2C_MSIL2A_20260908T044701_N0512_R076_T44QQE_20260908T094920";

const prepared10m =
    path.join(
        preparedOutputDirectory,
        `${sceneId}_10m_prepared.tif`
    );

const prepared20m =
    path.join(
        preparedOutputDirectory,
        `${sceneId}_20m_prepared.tif`
    );

(async () => {
    const result =
        await processSentinel2IndexProductionWorkflow({
            request: {
                indexCode: "NDMI",
                parameters: {},
            },

            outputDirectory:
                rasterOutputDirectory,

            targetResolution: 20,

            preparationImpl: async () => ({
                workflowVersion: "1.0",
                sceneId,
                acquisitionDate: "2026-09-08",

                outputDirectory:
                    preparedOutputDirectory,

                outputs: {
                    10: {
                        resolution: 10,
                        bands: [
                            "Blue",
                            "Green",
                            "Red",
                            "NIR",
                        ],
                        outputPath: prepared10m,
                    },

                    20: {
                        resolution: 20,
                        bands: [
                            "RedEdge1",
                            "RedEdge2",
                            "RedEdge3",
                            "RedEdge4",
                            "SWIR1",
                            "SWIR2",
                        ],
                        outputPath: prepared20m,
                    },
                },
            }),
        });

    console.log(
        JSON.stringify(
            {
                indexCode:
                    result.indexCode,

                targetResolution:
                    result.targetResolution,

                requiredBands:
                    result.requiredBands,

                continuousOutput:
                    result.outputProcessing
                        .continuousOutput,

                classificationOutput:
                    result.outputProcessing
                        .classificationOutput,

                outputPaths:
                    result.outputProcessing
                        .outputPaths,
            },
            null,
            2
        )
    );
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});