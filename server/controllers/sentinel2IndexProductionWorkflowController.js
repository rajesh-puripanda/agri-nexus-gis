"use strict";

const {
    validateSentinel2IndexProductionRequest,
    createSentinel2IndexProductionRequestContract
} = require(
    "../scientific/remoteSensing/acquisition/" +
    "sentinel2IndexProductionRequestContract"
);

const {
    processSentinel2IndexProductionWorkflow
} = require(
    "../services/remoteSensing/acquisition/" +
    "sentinel2IndexProductionWorkflowService"
);

function createSentinel2IndexProductionResponse(result) {
    const outputProcessing =
        result &&
        result.outputProcessing &&
        typeof result.outputProcessing === "object"
            ? result.outputProcessing
            : {};

    return {
        workflowVersion:
            result?.workflowVersion || null,

        indexCode:
            result?.indexCode || null,

        indexName:
            result?.indexName || null,

        sceneId:
            result?.sceneId || null,

        acquisitionDate:
            result?.acquisitionDate || null,

        targetResolution:
            result?.targetResolution ?? null,

        requiredBands:
            Array.isArray(result?.requiredBands)
                ? result.requiredBands
                : [],

        preparation:
            result?.preparation || null,

        sources:
            result?.sources || null,

        outputProcessing: {
            outputPaths:
                outputProcessing.outputPaths || null,

            continuousOutput:
                outputProcessing.continuousOutput || null,

            classificationOutput:
                outputProcessing.classificationOutput || null
        }
    };
}

async function processSentinel2IndexProductionWorkflowRequest(
    req,
    res,
    next,
    workflowImpl =
        processSentinel2IndexProductionWorkflow
) {
    try {
        const validation =
            validateSentinel2IndexProductionRequest(
                req.body
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid Sentinel-2 index production request.",
                validationErrors:
                    validation.errors
            });
        }

        const request =
            createSentinel2IndexProductionRequestContract(
                req.body
            );

        const result =
            await workflowImpl({
                request,
                outputDirectory:
                    request.outputDirectory,
                analyticalOutputDirectory:
                    request.analyticalOutputDirectory,
                    productionDirectory:
                    request.productionDirectory,
                targetResolution:
                    request.targetResolution,
                outputNoData:
                    request.outputNoData
            });

        return res.status(200).json({
            success: true,
            result:
                createSentinel2IndexProductionResponse(
                    result
                )
        });
    } catch (error) {
        return next(error);
    }
}


function writeSentinel2IndexProductionSseEvent(
    res,
    eventName,
    payload
) {
    res.write(
        `event: ${eventName}` +
        `\ndata: ${JSON.stringify(payload)}` +
        `\n\n`
    );
}

async function processSentinel2IndexProductionWorkflowStreamRequest(
    req,
    res,
    next,
    workflowImpl =
        processSentinel2IndexProductionWorkflow
) {
    try {
        const validation =
            validateSentinel2IndexProductionRequest(req.body);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid Sentinel-2 index production request.",
                validationErrors:
                    validation.errors
            });
        }

        const request =
            createSentinel2IndexProductionRequestContract(req.body);

        res.status(200);

        res.setHeader(
            "Content-Type",
            "text/event-stream"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        if (
            typeof res.flushHeaders ===
            "function"
        ) {
            res.flushHeaders();
        }

        console.log("=== BEFORE WORKFLOW AWAIT ===");

        if (typeof req.on === "function") {
            req.on("close", () => {
                console.log("=== SSE REQUEST CLOSED ===");
            });
        }

        if (typeof res.on === "function") {
            res.on("close", () => {
                console.log("=== SSE RESPONSE CLOSED ===");
            });

            res.on("error", (error) => {
                console.error("=== SSE RESPONSE ERROR ===", error);
            });
        }

        const result =
            await workflowImpl({
                request,
                outputDirectory:
                    request.outputDirectory,
                analyticalOutputDirectory:
                    request.analyticalOutputDirectory,
                    productionDirectory:
                    request.productionDirectory,
                targetResolution:
                    request.targetResolution,
                outputNoData:
                    request.outputNoData,

                onProgress: (progress) => {
                    writeSentinel2IndexProductionSseEvent(
                        res,
                        "progress",
                        progress
                    );
                }
            });

        writeSentinel2IndexProductionSseEvent(
            res,
            "result",
            {
                success: true,
                result:
                    createSentinel2IndexProductionResponse(
                        result
                    )
            }
        );

        return res.end();
    } catch (error) {
        if (res.headersSent) {
            writeSentinel2IndexProductionSseEvent(
                res,
                "error",
                {
                    success: false,
                    error:
                        error.message ||
                        "Sentinel-2 index production failed."
                }
            );

            return res.end();
        }

        return next(error);
    }
}
 module.exports = {
    createSentinel2IndexProductionResponse,
    processSentinel2IndexProductionWorkflowRequest,
    processSentinel2IndexProductionWorkflowStreamRequest,
    writeSentinel2IndexProductionSseEvent
};
