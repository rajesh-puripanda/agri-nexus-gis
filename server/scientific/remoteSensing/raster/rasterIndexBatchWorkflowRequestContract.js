"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/
// rasterIndexBatchWorkflowRequestContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.1
// Raster Index Batch Workflow Request Contract
//
// Contract only.
//
// This contract validates the structural API request for a
// batch raster-index workflow.
//
// Scientific band requirements remain authoritative in the
// registered index definitions and the existing single-index
// raster workflow.
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_INDEX_BATCH_WORKFLOW_REQUEST_CONTRACT_VERSION =
    "1.0";

const REQUIRED_REQUEST_FIELDS = [
    "inputPath",
    "indexCodes",
    "bandMapping",
    "outputDirectory"
];

const OPTIONAL_REQUEST_FIELDS = [
    "noData",
    "parameters",
    "processingContext",
    "spatialContext"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validatePathString(value, name) {
    const errors = [];

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        errors.push(
            `${name} must be a non-empty string.`
        );

        return errors;
    }

    if (value.includes("\0")) {
        errors.push(
            `${name} must not contain NUL characters.`
        );
    }

    return errors;
}

function validateIndexCodes(indexCodes) {
    const errors = [];

    if (!Array.isArray(indexCodes)) {
        return {
            errors: [
                "indexCodes must be an array."
            ],
            normalizedCodes: []
        };
    }

    if (indexCodes.length === 0) {
        errors.push(
            "indexCodes must contain at least one index."
        );

        return {
            errors,
            normalizedCodes: []
        };
    }

    const normalizedCodes = [];
    const seen = new Set();

    for (let i = 0; i < indexCodes.length; i++) {
        const indexCode = indexCodes[i];

        if (
            typeof indexCode !== "string" ||
            indexCode.trim().length === 0
        ) {
            errors.push(
                `indexCodes[${i}] must be a non-empty string.`
            );

            continue;
        }

        const normalizedCode =
            indexCode.trim().toUpperCase();

        if (seen.has(normalizedCode)) {
            errors.push(
                `indexCodes contains duplicate index: ${normalizedCode}.`
            );

            continue;
        }

        seen.add(normalizedCode);

        const definition =
            getIndexDefinition(
                normalizedCode
            );

        if (!definition) {
            errors.push(
                `Unknown remote sensing index: ${normalizedCode}.`
            );

            continue;
        }

        normalizedCodes.push(
            normalizedCode
        );
    }

    return {
        errors,
        normalizedCodes
    };
}

function validateBandMapping(bandMapping) {
    const errors = [];

    if (!isPlainObject(bandMapping)) {
        return {
            errors: [
                "bandMapping must be an object."
            ]
        };
    }

    const entries =
        Object.entries(bandMapping);

    if (entries.length === 0) {
        errors.push(
            "bandMapping must contain at least one band."
        );
    }

    const seenBands = new Set();

    for (const [bandName, sourceBand] of entries) {
        const normalizedBand =
            bandName.trim().toUpperCase();

        if (seenBands.has(normalizedBand)) {
            errors.push(
                `bandMapping contains duplicate band: ${bandName}.`
            );

            continue;
        }

        seenBands.add(normalizedBand);

        if (
            !Number.isInteger(sourceBand) ||
            sourceBand <= 0
        ) {
            errors.push(
                `bandMapping.${bandName} must be a positive integer.`
            );
        }
    }

    return {
        errors
    };
}

function validateOptionalObject(value, name) {
    if (value === undefined) {
        return [];
    }

    if (!isPlainObject(value)) {
        return [
            `${name} must be an object when supplied.`
        ];
    }

    return [];
}

function validateRasterIndexBatchWorkflowRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "request must be an object."
            ]
        };
    }

    for (const field of REQUIRED_REQUEST_FIELDS) {
        if (
            request[field] === undefined ||
            request[field] === null
        ) {
            errors.push(
                `request is missing required field: ${field}`
            );
        }
    }

    errors.push(
        ...validatePathString(
            request.inputPath,
            "inputPath"
        )
    );

    const indexValidation =
        validateIndexCodes(
            request.indexCodes
        );

    errors.push(
        ...indexValidation.errors
    );

    const bandValidation =
        validateBandMapping(
            request.bandMapping
        );

    errors.push(
        ...bandValidation.errors
    );

    errors.push(
        ...validatePathString(
            request.outputDirectory,
            "outputDirectory"
        )
    );

    if (
        request.noData !== undefined &&
        request.noData !== null &&
        (
            typeof request.noData !== "number" ||
            !Number.isFinite(request.noData)
        )
    ) {
        errors.push(
            "noData must be a finite number or null."
        );
    }

    errors.push(
        ...validateOptionalObject(
            request.parameters,
            "parameters"
        )
    );

    errors.push(
        ...validateOptionalObject(
            request.processingContext,
            "processingContext"
        )
    );

    errors.push(
        ...validateOptionalObject(
            request.spatialContext,
            "spatialContext"
        )
    );

    return {
        valid: errors.length === 0,
        errors,

        ...(errors.length === 0
            ? {
                indexCodes:
                    indexValidation.normalizedCodes
            }
            : {})
    };
}

function createRasterIndexBatchWorkflowRequestContract(
    request
) {
    const validation =
        validateRasterIndexBatchWorkflowRequest(
            request
        );

    if (!validation.valid) {
        throw new Error(
            validation.errors.join("; ")
        );
    }

    return {
        contractVersion:
            RASTER_INDEX_BATCH_WORKFLOW_REQUEST_CONTRACT_VERSION,

        inputPath:
            request.inputPath.trim(),

        indexCodes:
            validation.indexCodes,

        bandMapping:
            request.bandMapping,

        ...(request.noData !== undefined
            ? {
                noData: request.noData
            }
            : {}),

        ...(request.parameters !== undefined
            ? {
                parameters:
                    request.parameters
            }
            : {}),

        ...(request.processingContext !== undefined
            ? {
                processingContext:
                    request.processingContext
            }
            : {}),

        ...(request.spatialContext !== undefined
            ? {
                spatialContext:
                    request.spatialContext
            }
            : {}),

        outputDirectory:
            request.outputDirectory.trim()
    };
}

module.exports = {
    RASTER_INDEX_BATCH_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    OPTIONAL_REQUEST_FIELDS,
    validateRasterIndexBatchWorkflowRequest,
    createRasterIndexBatchWorkflowRequestContract
};

