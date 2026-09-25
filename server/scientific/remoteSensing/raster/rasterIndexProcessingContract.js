"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/rasterIndexProcessingContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.1
// Raster Index Processing Contract
//
// Defines the contract for applying an existing remote-sensing
// index definition to a normalized raster.
//
// Scientific formulas remain authoritative in the existing
// scalar remote-sensing index calculation service.
//
// This contract defines structure only.
// ============================================================

const {
    CANONICAL_BAND_NAMES,
    validateNormalizedRaster
} = require("./normalizedRasterContract");

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_INDEX_PROCESSING_CONTRACT_VERSION = "1.0";

const REQUIRED_REQUEST_FIELDS = [
    "indexCode",
    "raster"
];

const OPTIONAL_REQUEST_FIELDS = [
    "parameters",
    "processingContext",
    "spatialContext"
];

const RESULT_REQUIRED_FIELDS = [
    "analysisType",
    "analysisVersion",
    "timestamp",
    "inputContext",
    "spatialContext",
    "parameters",
    "results",
    "classification",
    "statistics",
    "metadata"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function assertObject(value, name) {
    if (!isPlainObject(value)) {
        throw new Error(`${name} must be an object`);
    }
}

function normalizeIndexCode(indexCode) {
    if (typeof indexCode !== "string" || !indexCode.trim()) {
        throw new Error("indexCode must be a non-empty string");
    }

    return indexCode.trim().toUpperCase();
}

function validateRequiredFields(object, fields, context) {
    const errors = [];

    for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(object, field)) {
            errors.push(`${context} is missing required field: ${field}`);
        }
    }

    return errors;
}

function validateParameters(parameters) {
    if (parameters === undefined) {
        return [];
    }

    if (!isPlainObject(parameters)) {
        return ["parameters must be an object when provided"];
    }

    for (const [key, value] of Object.entries(parameters)) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            return [
                `parameters.${key} must be a finite number`
            ];
        }
    }

    return [];
}

function validateProcessingContext(processingContext) {
    if (processingContext === undefined) {
        return [];
    }

    if (!isPlainObject(processingContext)) {
        return ["processingContext must be an object when provided"];
    }

    return [];
}

function validateSpatialContext(spatialContext) {
    if (spatialContext === undefined) {
        return [];
    }

    if (!isPlainObject(spatialContext)) {
        return ["spatialContext must be an object when provided"];
    }

    return [];
}

function validateRasterIndexProcessingRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: ["request must be an object"]
        };
    }

    errors.push(
        ...validateRequiredFields(
            request,
            REQUIRED_REQUEST_FIELDS,
            "request"
        )
    );

    let indexCode = null;
    let definition = null;

    if (
        Object.prototype.hasOwnProperty.call(request, "indexCode")
    ) {
        try {
            indexCode = normalizeIndexCode(request.indexCode);
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (indexCode) {
        definition = getIndexDefinition(indexCode);

        if (!definition) {
            errors.push(`Unknown remote sensing index: ${indexCode}`);
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(request, "raster")
    ) {
        try {
            const rasterValidation = validateNormalizedRaster(
                request.raster
            );

            if (!rasterValidation.valid) {
                errors.push(
                    ...rasterValidation.errors.map(
                        error => `raster: ${error}`
                    )
                );
            }
        } catch (error) {
            errors.push(`raster: ${error.message}`);
        }
    }

    errors.push(
        ...validateParameters(request.parameters)
    );

    errors.push(
        ...validateProcessingContext(request.processingContext)
    );

    errors.push(
        ...validateSpatialContext(request.spatialContext)
    );

    if (definition) {
        for (const requiredBand of definition.requiredBands) {
            if (
                !request.raster ||
                !request.raster.bands ||
                !Object.prototype.hasOwnProperty.call(
                    request.raster.bands,
                    requiredBand
                )
            ) {
                errors.push(
                    `raster is missing required band for ${indexCode}: ${requiredBand}`
                );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode,
        definition
    };
}

function createRasterIndexProcessingResultContract({
    indexCode,
    timestamp = new Date().toISOString(),
    inputContext = {},
    spatialContext = {},
    parameters = {},
    results = {},
    classification = {},
    statistics = {},
    metadata = {}
}) {
    const normalizedIndexCode = normalizeIndexCode(indexCode);

    if (!getIndexDefinition(normalizedIndexCode)) {
        throw new Error(
            `Unknown remote sensing index: ${normalizedIndexCode}`
        );
    }

    assertObject(inputContext, "inputContext");
    assertObject(spatialContext, "spatialContext");
    assertObject(parameters, "parameters");
    assertObject(results, "results");
    assertObject(classification, "classification");
    assertObject(statistics, "statistics");
    assertObject(metadata, "metadata");

    return {
        analysisType: "remote_sensing_raster_index",
        analysisVersion: RASTER_INDEX_PROCESSING_CONTRACT_VERSION,
        timestamp,
        inputContext,
        spatialContext,
        parameters,
        results,
        classification,
        statistics,
        metadata
    };
}

function validateRasterIndexProcessingResult(result) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: ["result must be an object"]
        };
    }

    for (const field of RESULT_REQUIRED_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(result, field)) {
            errors.push(`result is missing required field: ${field}`);
        }
    }

    if (
        result.analysisType !== undefined &&
        result.analysisType !== "remote_sensing_raster_index"
    ) {
        errors.push(
            "result.analysisType must be remote_sensing_raster_index"
        );
    }

    if (
        result.analysisVersion !== undefined &&
        result.analysisVersion !== RASTER_INDEX_PROCESSING_CONTRACT_VERSION
    ) {
        errors.push(
            `result.analysisVersion must be ${RASTER_INDEX_PROCESSING_CONTRACT_VERSION}`
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    RASTER_INDEX_PROCESSING_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    OPTIONAL_REQUEST_FIELDS,
    CANONICAL_BAND_NAMES,
    validateRasterIndexProcessingRequest,
    createRasterIndexProcessingResultContract,
    validateRasterIndexProcessingResult
};
