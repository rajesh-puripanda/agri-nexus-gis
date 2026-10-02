"use strict";

const {
    validateMultiSourceRasterIndexWorkflowRequest,
    createMultiSourceRasterIndexWorkflowRequestContract
} = require(
    "../scientific/remoteSensing/raster/" +
    "multiSourceRasterIndexWorkflowRequestContract"
);

const {
    processMultiSourceRasterIndex
} = require(
    "../services/remoteSensing/raster/" +
    "multiSourceRasterIndexWorkflowService"
);

async function processMultiSourceRasterIndexWorkflowRequest(
    req,
    res,
    next
) {
    try {
        const validation =
            validateMultiSourceRasterIndexWorkflowRequest(
                req.body
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error:
                    "Invalid multi-source raster index workflow request.",
                validationErrors:
                    validation.errors
            });
        }

        const request =
            createMultiSourceRasterIndexWorkflowRequestContract(
                req.body
            );

        const result =
            await processMultiSourceRasterIndex(
                request
            );

        return res.status(200).json({
            success: true,
            result
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    processMultiSourceRasterIndexWorkflowRequest
};
