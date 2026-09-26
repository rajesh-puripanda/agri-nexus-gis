"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalObservationContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.1  Temporal Remote-Sensing Observation Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines a traceable remote-sensing index observation at a
// specific acquisition/observation time.
//
// This module performs structural validation only.
// It does not calculate indices, classify values, compare dates,
// calculate trends, or perform raster processing.
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const TEMPORAL_OBSERVATION_CONTRACT_VERSION =
    "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "observationDate",
    "acquisitionDate",
    "sensor",
    "sceneId",
    "indexCode",
    "spatialContext",
    "rasterContext",
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

function isValidDateValue(value) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return false;
    }

    const timestamp =
        Date.parse(value);

    return Number.isFinite(timestamp);
}

function validateDateField(
    value,
    fieldName,
    errors
) {
    if (!isValidDateValue(value)) {
        errors.push(
            `${fieldName} must be a valid ISO date or date-time string.`
        );
    }
}

function normalizeIndexCode(
    indexCode
) {
    return typeof indexCode === "string"
        ? indexCode.trim().toUpperCase()
        : "";
}

function validateIndexCode(
    indexCode,
    errors
) {
    const normalizedCode =
        normalizeIndexCode(indexCode);

    if (!normalizedCode) {
        errors.push(
            "indexCode must be a non-empty string."
        );

        return normalizedCode;
    }

    const definition =
        getIndexDefinition(
            normalizedCode
        );

    if (!definition) {
        errors.push(
            `indexCode '${normalizedCode}' is not registered.`
        );
    }

    return normalizedCode;
}

function validateRasterContext(
    rasterContext,
    errors
) {
    if (
        !isPlainObject(rasterContext)
    ) {
        errors.push(
            "rasterContext must be a plain object."
        );

        return;
    }

    if (
        !Number.isInteger(
            rasterContext.width
        ) ||
        rasterContext.width <= 0
    ) {
        errors.push(
            "rasterContext.width must be a positive integer."
        );
    }

    if (
        !Number.isInteger(
            rasterContext.height
        ) ||
        rasterContext.height <= 0
    ) {
        errors.push(
            "rasterContext.height must be a positive integer."
        );
    }

    if (
        !Number.isInteger(
            rasterContext.pixelCount
        ) ||
        rasterContext.pixelCount <= 0
    ) {
        errors.push(
            "rasterContext.pixelCount must be a positive integer."
        );
    }

    if (
        Number.isInteger(
            rasterContext.width
        ) &&
        Number.isInteger(
            rasterContext.height
        ) &&
        Number.isInteger(
            rasterContext.pixelCount
        ) &&
        rasterContext.width > 0 &&
        rasterContext.height > 0 &&
        rasterContext.pixelCount !==
            rasterContext.width *
            rasterContext.height
    ) {
        errors.push(
            "rasterContext.pixelCount must equal width * height."
        );
    }
}

function validateContextObject(
    value,
    fieldName,
    errors
) {
    if (!isPlainObject(value)) {
        errors.push(
            `${fieldName} must be a plain object.`
        );
    }
}

function validateTemporalObservation(
    observation
) {
    const errors = [];

    if (
        !isPlainObject(observation)
    ) {
        return {
            valid: false,
            errors: [
                "observation must be a plain object."
            ]
        };
    }

    for (
        const field
        of REQUIRED_FIELDS
    ) {
        if (
            observation[field] ===
                undefined ||
            observation[field] ===
                null
        ) {
            errors.push(
                `${field} is required.`
            );
        }
    }

    if (
        observation.contractVersion !==
        TEMPORAL_OBSERVATION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be '${TEMPORAL_OBSERVATION_CONTRACT_VERSION}'.`
        );
    }

    validateDateField(
        observation.observationDate,
        "observationDate",
        errors
    );

    validateDateField(
        observation.acquisitionDate,
        "acquisitionDate",
        errors
    );

    for (
        const field
        of ["sensor", "sceneId"]
    ) {
        if (
            typeof observation[field] !==
                "string" ||
            observation[field].trim().length ===
                0
        ) {
            errors.push(
                `${field} must be a non-empty string.`
            );
        }
    }

    const normalizedIndexCode =
        validateIndexCode(
            observation.indexCode,
            errors
        );

    validateContextObject(
        observation.spatialContext,
        "spatialContext",
        errors
    );

    validateRasterContext(
        observation.rasterContext,
        errors
    );

    validateContextObject(
        observation.processingContext,
        "processingContext",
        errors
    );

    if (
        observation.metadata !==
            undefined &&
        !isPlainObject(
            observation.metadata
        )
    ) {
        errors.push(
            "metadata must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode: normalizedIndexCode
    };
}

function createTemporalObservationContract({
    observationDate,
    acquisitionDate,
    sensor,
    sceneId,
    indexCode,
    spatialContext,
    rasterContext,
    processingContext,
    metadata
}) {
    const result = {
        contractVersion:
            TEMPORAL_OBSERVATION_CONTRACT_VERSION,
        observationDate,
        acquisitionDate,
        sensor,
        sceneId,
        indexCode:
            normalizeIndexCode(indexCode),
        spatialContext,
        rasterContext,
        processingContext
    };

    if (metadata !== undefined) {
        result.metadata =
            metadata;
    }

    const validation =
        validateTemporalObservation(
            result
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal remote-sensing observation: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_REMOTE_SENSING_OBSERVATION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_OBSERVATION_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateTemporalObservation,
    createTemporalObservationContract
};

