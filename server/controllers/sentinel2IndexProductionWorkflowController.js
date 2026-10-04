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
                targetResolution:
                    request.targetResolution,
                outputNoData:
                    request.outputNoData
            });

        return res.status(200).json({
            success: true,
            result
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    processSentinel2IndexProductionWorkflowRequest
};
