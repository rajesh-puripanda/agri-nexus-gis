"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createSentinel2IndexProductionResponse,
    processSentinel2IndexProductionWorkflowRequest
} = require(
    "../controllers/" +
    "sentinel2IndexProductionWorkflowController"
);

test(
    "createSentinel2IndexProductionResponse removes heavy raster payloads",
    () => {
        const hugeRaster =
            new Float32Array(1000000);

        const result =
            createSentinel2IndexProductionResponse({
                indexCode: "NDVI",

                outputProcessing: {
                    continuousRaster:
                        hugeRaster,

                    classificationResult: {
                        classification: {
                            raster:
                                hugeRaster
                        }
                    },

                    continuousOutputRaster:
                        hugeRaster,

                    classificationOutputRaster:
                        hugeRaster,

                    outputPaths: {
                        continuous:
                            "ndvi_continuous.tif",

                        classification:
                            "ndvi_classified.tif"
                    },

                    continuousOutput: {
                        dataType: "Float32"
                    },

                    classificationOutput: {
                        dataType: "UInt8"
                    }
                }
            });

        assert.equal(
            result.outputProcessing
                .continuousRaster,
            undefined
        );

        assert.equal(
            result.outputProcessing
                .classificationResult,
            undefined
        );

        assert.equal(
            result.outputProcessing
                .continuousOutputRaster,
            undefined
        );

        assert.equal(
            result.outputProcessing
                .classificationOutputRaster,
            undefined
        );

        assert.deepEqual(
            result.outputProcessing.outputPaths,
            {
                continuous:
                    "ndvi_continuous.tif",

                classification:
                    "ndvi_classified.tif"
            }
        );

        assert.deepEqual(
            result.outputProcessing
                .continuousOutput,
            {
                dataType: "Float32"
            }
        );

        assert.deepEqual(
            result.outputProcessing
                .classificationOutput,
            {
                dataType: "UInt8"
            }
        );
    }
);

test(
    "processSentinel2IndexProductionWorkflowRequest returns compact production result",
    async () => {
        const hugeRaster =
            new Float32Array(1000000);

        const workflowResult = {
            workflowVersion: "1.0",
            indexCode: "NDVI",
            indexName: "Normalized Difference Vegetation Index",
            sceneId: "TEST_SCENE",
            acquisitionDate: "2026-09-08",
            targetResolution: 10,

            outputProcessing: {
                continuousRaster:
                    hugeRaster,

                classificationResult: {
                    classification: {
                        raster:
                            hugeRaster
                    }
                },

                continuousOutputRaster:
                    hugeRaster,

                classificationOutputRaster:
                    hugeRaster,

                outputPaths: {
                    continuous:
                        "ndvi_continuous.tif",

                    classification:
                        "ndvi_classified.tif"
                },

                continuousOutput: {
                    dataType: "Float32"
                },

                classificationOutput: {
                    dataType: "UInt8"
                }
            }
        };

        const request = {
            contractVersion: "1.0",
            sourceId: "sentinel-2",
            indexCode: "NDVI",
            sceneId: "TEST_SCENE",

            temporalContext: {
                startDate: "2026-09-01",
                endDate: "2026-09-10"
            },

            spatialContext: {
                bbox: {
                    west: 83.1,
                    south: 17.6,
                    east: 83.5,
                    north: 17.9
                }
            },

            acquisitionParameters: {
                maxCloudCover: 20
            },

            outputDirectory: "test-output",
            outputNoData: -9999,
            parameters: {},
            targetResolution: 10
        };

        const req = {
            body: request
        };

        let responseBody = null;

        const res = {
            statusCode: 200,

            status(code) {
                this.statusCode = code;
                return this;
            },

            json(payload) {
                responseBody = payload;
                return this;
            }
        };

        let nextError = null;

        const next = (error) => {
            nextError = error;
        };

        const workflowImpl =
            async () => workflowResult;

        await processSentinel2IndexProductionWorkflowRequest(
            req,
            res,
            next,
            workflowImpl
        );

        assert.equal(
            nextError,
            null
        );

        assert.equal(
            res.statusCode,
            200
        );

        assert.equal(
            responseBody.success,
            true
        );

        assert.equal(
            responseBody.result
                .outputProcessing
                .continuousRaster,
            undefined
        );

        assert.equal(
            responseBody.result
                .outputProcessing
                .classificationResult,
            undefined
        );

        assert.deepEqual(
            responseBody.result
                .outputProcessing
                .outputPaths,
            {
                continuous:
                    "ndvi_continuous.tif",

                classification:
                    "ndvi_classified.tif"
            }
        );

        assert.doesNotThrow(() => {
            JSON.stringify(
                responseBody
            );
        });
    }
);


test(
    "processSentinel2IndexProductionWorkflowStreamRequest emits progress stages and compact result",
    async () => {
        const {
            processSentinel2IndexProductionWorkflowStreamRequest
        } = require(
            "../controllers/" +
            "sentinel2IndexProductionWorkflowController"
        );

        const request = {
            contractVersion: "1.0",
            sourceId: "sentinel-2",
            indexCode: "NDVI",
            sceneId: "TEST_SCENE",

            temporalContext: {
                startDate: "2026-09-01",
                endDate: "2026-09-10"
            },

            spatialContext: {
                bbox: {
                    west: 83.1,
                    south: 17.6,
                    east: 83.5,
                    north: 17.9
                }
            },

            acquisitionParameters: {
                maxCloudCover: 20
            },

            outputDirectory: "test-output",
            outputNoData: -9999,
            parameters: {},
            targetResolution: 10
        };

        const events = [];
        let responseEnded = false;

        const res = {
            statusCode: 200,
            headers: {},

            status(code) {
                this.statusCode = code;
                return this;
            },

            setHeader(name, value) {
                this.headers[name] = value;
                return this;
            },

            flushHeaders() {},

            write(chunk) {
                events.push(chunk);
                return true;
            },

            end() {
                responseEnded = true;
            }
        };

        const workflowImpl =
            async ({ onProgress }) => {
                onProgress({
                    stage: "preparing",
                    message:
                        "Preparing Sentinel-2 imagery."
                });

                onProgress({
                    stage: "processing",
                    message:
                        "Processing Normalized Difference Vegetation Index."
                });

                onProgress({
                    stage: "writing",
                    message:
                        "Writing Normalized Difference Vegetation Index raster."
                });

                onProgress({
                    stage: "complete",
                    message:
                        "Normalized Difference Vegetation Index processing complete."
                });

                return {
                    workflowVersion: "1.0",
                    indexCode: "NDVI",
                    indexName:
                        "Normalized Difference Vegetation Index",
                    sceneId: "TEST_SCENE",
                    acquisitionDate: "2026-09-08",
                    targetResolution: 10,

                    outputProcessing: {
                        outputPaths: {
                            continuous:
                                "ndvi_continuous.tif"
                        },

                        continuousOutput: {
                            dataType: "Float32"
                        }
                    }
                };
            };

        let nextError = null;

        const next = (error) => {
            nextError = error;
        };

        await processSentinel2IndexProductionWorkflowStreamRequest(
            {
                body: request
            },
            res,
            next,
            workflowImpl
        );

        assert.equal(nextError, null);
        assert.equal(res.statusCode, 200);
        assert.equal(responseEnded, true);

        assert.equal(
            res.headers["Content-Type"],
            "text/event-stream"
        );

        const streamText =
            events.join("");

        const progressEvents =
            [...streamText.matchAll(
                /event: progress\r?\ndata: (.+)\r?\n\r?\n/g
            )].map(
                (match) =>
                    JSON.parse(match[1])
            );

        assert.deepEqual(
            progressEvents.map(
                (event) => event.stage
            ),
            [
                "preparing",
                "processing",
                "writing",
                "complete"
            ]
        );

        assert.match(
            streamText,
            /event: result/
        );

        assert.doesNotMatch(
            streamText,
            /continuousRaster/
        );
    }
);
