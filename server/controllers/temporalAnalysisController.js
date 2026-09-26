"use strict";

// ============================================================
// server/controllers/temporalAnalysisController.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.7.19
// Temporal Analysis Workflow REST API Controller
//
// HTTP orchestration only.
//
// ============================================================

const {
    validateTemporalAnalysisWorkflowRequest
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowRequestContract"
);

const {
    validateTemporalAnalysisWorkflowResult
} = require(
    "../scientific/remoteSensing/temporal/" +
    "temporalAnalysisWorkflowResultContract"
);

const temporalAnalysisWorkflowService =
    require(
        "../services/remoteSensing/temporal/" +
        "temporalAnalysisWorkflowService"
    );

// ============================================================
// POST TEMPORAL ANALYSIS WORKFLOW
// ============================================================
//
// POST /api/soil-analysis/temporal-analysis
//
// ============================================================

async function processTemporalAnalysisWorkflowRequest(
    req,
    res
) {
    try {
        const requestData =
            req.body &&
            typeof req.body === "object" &&
            !Array.isArray(req.body)
                ? req.body
                : {};

        const validation =
            validateTemporalAnalysisWorkflowRequest(
                requestData
            );

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                code:
                    "INVALID_TEMPORAL_ANALYSIS_WORKFLOW_REQUEST",
                message:
                    "Invalid temporal analysis workflow request.",
                errors:
                    validation.errors
            });
        }

        const result =
            await temporalAnalysisWorkflowService
                .processTemporalAnalysisWorkflow(
                    requestData
                );

        const resultValidation =
            validateTemporalAnalysisWorkflowResult(
                result
            );

        if (!resultValidation.valid) {
            const error = new Error(
                "Temporal analysis workflow returned an invalid result: " +
                resultValidation.errors.join("; ")
            );

            error.statusCode = 500;

            throw error;
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Temporal analysis workflow error:",
            error
        );

        const statusCode =
            Number.isInteger(error.statusCode)
                ? error.statusCode
                : 500;

        return res.status(statusCode).json({
            success: false,
            code:
                "TEMPORAL_ANALYSIS_WORKFLOW_ERROR",
            message:
                error.message ||
                "Failed to process temporal analysis workflow."
        });
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    processTemporalAnalysisWorkflowRequest
};
