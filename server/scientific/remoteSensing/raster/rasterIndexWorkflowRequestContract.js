"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/
// rasterIndexWorkflowRequestContract.js
// ============================================================
//
// AgriNexus GIS
// Phase 13.6.2.3.6.2
// Raster Index Workflow API Request Contract
//
// API-boundary validation only.
// Scientific raster validation and workflow execution remain in
// rasterIndexWorkflowService.js.
//
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION = "1.0";

const REQUIRED_REQUEST_FIELDS = [
    "inputPath",
    "indexCode",
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

function validateRasterIndexWorkflowRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Raster index workflow request must be an object."
            ]
        };
    }

    for (const field of REQUIRED_REQUEST_FIELDS) {
        if (
            request[field] === undefined ||
            request[field] === null
        ) {
            errors.push(
                `Missing required field: ${field}.`
            );
        }
    }

    if (request.inputPath !== undefined) {
        errors.push(
            ...validatePathString(
                request.inputPath,
                "inputPath"
            )
        );
    }

    let definition = null;
    let normalizedIndexCode = null;

    if (request.indexCode !== undefined) {
        if (
            typeof request.indexCode !== "string" ||
            request.indexCode.trim().length === 0
        ) {
            errors.push(
                "indexCode must be a non-empty string."
            );
        } else {
            normalizedIndexCode =
                request.indexCode
                    .trim()
                    .toUpperCase();

            definition =
                getIndexDefinition(
                    normalizedIndexCode
                );

            if (!definition) {
                errors.push(
                    `Unknown remote sensing index: ${normalizedIndexCode}.`
                );
            }
        }
    }

    if (
        request.bandMapping !== undefined
    ) {
        if (!isPlainObject(request.bandMapping)) {
            errors.push(
                "bandMapping must be an object."
            );
        } else if (
            Object.keys(request.bandMapping).length === 0
        ) {
            errors.push(
                "bandMapping must contain at least one band."
            );
        } else {
            for (
                const [bandName, sourceBand] of
                Object.entries(request.bandMapping)
            ) {
                if (
                    typeof bandName !== "string" ||
                    bandName.trim().length === 0
                ) {
                    errors.push(
                        "bandMapping contains an invalid band name."
                    );
                    continue;
                }

                if (
                    !Number.isInteger(sourceBand) ||
                    sourceBand <= 0
                ) {
                    errors.push(
                        `bandMapping.${bandName} must be a positive integer.`
                    );
                }
            }

            const normalizedBands =
                Object.keys(request.bandMapping)
                    .map((name) =>
                        name.trim().toLowerCase()
                    );

            if (
                new Set(normalizedBands).size !==
                normalizedBands.length
            ) {
                errors.push(
                    "bandMapping must not contain duplicate band names."
                );
            }
        }
    }

    if (request.outputDirectory !== undefined) {
        errors.push(
            ...validatePathString(
                request.outputDirectory,
                "outputDirectory"
            )
        );
    }

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

    for (
        const field of [
            "parameters",
            "processingContext",
            "spatialContext"
        ]
    ) {
        if (
            request[field] !== undefined &&
            request[field] !== null &&
            !isPlainObject(request[field])
        ) {
            errors.push(
                `${field} must be an object.`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        indexCode: normalizedIndexCode,
        definition
    };
}

function createRasterIndexWorkflowRequestContract({
    inputPath,
    indexCode,
    bandMapping,
    outputDirectory,
    noData,
    parameters,
    processingContext,
    spatialContext
}) {
    const request = {
        inputPath,
        indexCode,
        bandMapping,
        outputDirectory
    };

    if (noData !== undefined) {
        request.noData = noData;
    }

    if (parameters !== undefined) {
        request.parameters = parameters;
    }

    if (processingContext !== undefined) {
        request.processingContext =
            processingContext;
    }

    if (spatialContext !== undefined) {
        request.spatialContext =
            spatialContext;
    }

    return request;
}

module.exports = {
    RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    OPTIONAL_REQUEST_FIELDS,
    validateRasterIndexWorkflowRequest,
    createRasterIndexWorkflowRequestContract
};
