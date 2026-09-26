"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalCompositionWorkflowRequestContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.4
// Temporal Composition Workflow Request Contract
//
// Contract version: 1.0
//
// This contract defines the structural request supplied to the
// temporal composition workflow.
//
// The request contains already validated temporal index
// observations and the context required to assemble them into
// one chronological temporal composition.
//
// Scientific composition rules remain authoritative in:
//   temporalCompositionContract.js
//
// This contract does NOT:
//   - calculate indices
//   - modify raster values
//   - read or write GeoTIFF files
//   - calculate trends
//   - detect change
//   - perform seasonal analysis
//   - interpolate
//   - reproject or resample
//   - perform temporal scientific analysis
// ============================================================

const {
    validateTemporalComposition
} = require("./temporalCompositionContract");

const TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "compositionId",
    "indexCode",
    "observations",
    "temporalContext",
    "spatialContext",
    "processingContext"
];

const OPTIONAL_FIELDS = [
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeIndexCode(indexCode) {
    return typeof indexCode === "string"
        ? indexCode.trim().toUpperCase()
        : indexCode;
}

function validateTemporalCompositionWorkflowRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Temporal composition workflow request must be a plain object."
            ]
        };
    }

    REQUIRED_FIELDS.forEach(
        field => {
            if (
                !Object.prototype.hasOwnProperty.call(
                    request,
                    field
                )
            ) {
                errors.push(
                    `Missing required field: ${field}.`
                );
            }
        }
    );

    if (
        request.contractVersion !==
        TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be '${TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION}'.`
        );
    }

    const normalizedIndexCode =
        normalizeIndexCode(
            request.indexCode
        );

    /*
     * Validate the scientific composition using the
     * authoritative frozen Temporal Composition Contract.
     *
     * The request and composition contracts intentionally
     * share version 1.0, so the composition validator can
     * validate the complete scientific payload directly.
     */
    const compositionCandidate = {
        contractVersion:
            request.contractVersion,

        compositionId:
            request.compositionId,

        indexCode:
            normalizedIndexCode,

        observations:
            request.observations,

        temporalContext:
            request.temporalContext,

        spatialContext:
            request.spatialContext,

        processingContext:
            request.processingContext
    };

    if (request.metadata !== undefined) {
        compositionCandidate.metadata =
            request.metadata;
    }

    const compositionValidation =
        validateTemporalComposition(
            compositionCandidate
        );

    if (!compositionValidation.valid) {
        compositionValidation.errors.forEach(
            error => {
                errors.push(error);
            }
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode:
            compositionValidation.indexCode ||
            normalizedIndexCode
    };
}

function createTemporalCompositionWorkflowRequest({
    contractVersion =
        TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    compositionId,
    indexCode,
    observations,
    temporalContext,
    spatialContext,
    processingContext,
    metadata
}) {
    const result = {
        contractVersion,

        compositionId,

        indexCode:
            normalizeIndexCode(indexCode),

        observations,

        temporalContext,

        spatialContext,

        processingContext
    };

    if (metadata !== undefined) {
        result.metadata = metadata;
    }

    const validation =
        validateTemporalCompositionWorkflowRequest(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal composition workflow request: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_COMPOSITION_WORKFLOW_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_COMPOSITION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalCompositionWorkflowRequest,
    createTemporalCompositionWorkflowRequest
};
