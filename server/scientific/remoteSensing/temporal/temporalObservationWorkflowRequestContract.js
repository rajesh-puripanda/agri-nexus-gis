"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalObservationWorkflowRequestContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 5.1.5.3.1
// Temporal Observation Workflow Request Contract
//
// Contract version: 1.0
//
// Purpose:
// Defines the authoritative request boundary for processing
// ONE remote-sensing index observation within a temporal
// workflow.
//
// This contract carries:
//   - temporal observation identity
//   - source raster identity
//   - existing raster/index workflow request
//
// It does NOT:
//   - read rasters
//   - calculate indices
//   - calculate statistics
//   - classify pixels
//   - write raster outputs
//   - compare observations
//   - calculate temporal trends
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const {
    validateTemporalDates
} = require("./temporalDateValidation");

const TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION =
    "1.0";

const REQUIRED_REQUEST_FIELDS = [
    "contractVersion",
    "temporalIdentity",
    "rasterIdentity",
    "workflowRequest"
];

const REQUIRED_TEMPORAL_IDENTITY_FIELDS = [
    "observationDate",
    "acquisitionDate",
    "sensor",
    "sceneId"
];

const REQUIRED_RASTER_IDENTITY_FIELDS = [
    "rasterId"
];

const REQUIRED_WORKFLOW_REQUEST_FIELDS = [
    "inputPath",
    "indexCode",
    "bandMapping",
    "outputDirectory"
];

const OPTIONAL_WORKFLOW_REQUEST_FIELDS = [
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

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function validatePathString(value, name) {
    const errors = [];

    if (!isNonEmptyString(value)) {
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

function validateRequiredFields(
    object,
    fields,
    context
) {
    const errors = [];

    for (const field of fields) {
        if (
            object[field] === undefined ||
            object[field] === null
        ) {
            errors.push(
                `${context} is missing required field: ${field}.`
            );
        }
    }

    return errors;
}

function validateTemporalIdentity(
    temporalIdentity
) {
    const errors = [];

    if (!isPlainObject(temporalIdentity)) {
        return [
            "temporalIdentity must be a plain object."
        ];
    }

    errors.push(
        ...validateRequiredFields(
            temporalIdentity,
            REQUIRED_TEMPORAL_IDENTITY_FIELDS,
            "temporalIdentity"
        )
    );

    if (
        temporalIdentity.observationDate !== undefined
    ) {
        if (
            !isNonEmptyString(
                temporalIdentity.observationDate
            )
        ) {
            errors.push(
                "temporalIdentity.observationDate must be a non-empty string."
            );
        }
    }

    if (
        temporalIdentity.acquisitionDate !== undefined
    ) {
        if (
            !isNonEmptyString(
                temporalIdentity.acquisitionDate
            )
        ) {
            errors.push(
                "temporalIdentity.acquisitionDate must be a non-empty string."
            );
        }
    }

    if (
        isNonEmptyString(
            temporalIdentity.observationDate
        ) &&
        isNonEmptyString(
            temporalIdentity.acquisitionDate
        )
    ) {
        const dateValidation =
            validateTemporalDates({
                observationDate:
                    temporalIdentity.observationDate,
                acquisitionDate:
                    temporalIdentity.acquisitionDate
            });

        if (!dateValidation.valid) {
            errors.push(
                ...dateValidation.errors.map(
                    error =>
                        `temporalIdentity: ${error}`
                )
            );
        }
    }

    for (const field of [
        "sensor",
        "sceneId"
    ]) {
        if (
            temporalIdentity[field] !== undefined &&
            !isNonEmptyString(
                temporalIdentity[field]
            )
        ) {
            errors.push(
                `temporalIdentity.${field} must be a non-empty string.`
            );
        }
    }

    return errors;
}

function validateRasterIdentity(
    rasterIdentity
) {
    const errors = [];

    if (!isPlainObject(rasterIdentity)) {
        return [
            "rasterIdentity must be a plain object."
        ];
    }

    errors.push(
        ...validateRequiredFields(
            rasterIdentity,
            REQUIRED_RASTER_IDENTITY_FIELDS,
            "rasterIdentity"
        )
    );

    if (
        rasterIdentity.rasterId !== undefined &&
        !isNonEmptyString(
            rasterIdentity.rasterId
        )
    ) {
        errors.push(
            "rasterIdentity.rasterId must be a non-empty string."
        );
    }

    return errors;
}

function validateBandMapping(
    bandMapping
) {
    const errors = [];

    if (!isPlainObject(bandMapping)) {
        return [
            "workflowRequest.bandMapping must be an object."
        ];
    }

    if (
        Object.keys(bandMapping).length === 0
    ) {
        errors.push(
            "workflowRequest.bandMapping must contain at least one band."
        );

        return errors;
    }

    for (
        const [bandName, sourceBand] of
        Object.entries(bandMapping)
    ) {
        if (
            typeof bandName !== "string" ||
            bandName.trim().length === 0
        ) {
            errors.push(
                "workflowRequest.bandMapping contains an invalid band name."
            );

            continue;
        }

        if (
            !Number.isInteger(sourceBand) ||
            sourceBand <= 0
        ) {
            errors.push(
                `workflowRequest.bandMapping.${bandName} must be a positive integer.`
            );
        }
    }

    const normalizedBands =
        Object.keys(bandMapping)
            .map(name =>
                name.trim().toLowerCase()
            );

    if (
        new Set(normalizedBands).size !==
        normalizedBands.length
    ) {
        errors.push(
            "workflowRequest.bandMapping must not contain duplicate band names."
        );
    }

    return errors;
}

function validateWorkflowRequest(
    workflowRequest
) {
    const errors = [];

    if (!isPlainObject(workflowRequest)) {
        return {
            errors: [
                "workflowRequest must be a plain object."
            ],
            indexCode: null,
            definition: null
        };
    }

    errors.push(
        ...validateRequiredFields(
            workflowRequest,
            REQUIRED_WORKFLOW_REQUEST_FIELDS,
            "workflowRequest"
        )
    );

    if (
        workflowRequest.inputPath !== undefined
    ) {
        errors.push(
            ...validatePathString(
                workflowRequest.inputPath,
                "workflowRequest.inputPath"
            )
        );
    }

    let normalizedIndexCode = null;
    let definition = null;

    if (
        workflowRequest.indexCode !== undefined
    ) {
        if (
            !isNonEmptyString(
                workflowRequest.indexCode
            )
        ) {
            errors.push(
                "workflowRequest.indexCode must be a non-empty string."
            );
        } else {
            normalizedIndexCode =
                workflowRequest.indexCode
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
        workflowRequest.bandMapping !== undefined
    ) {
        errors.push(
            ...validateBandMapping(
                workflowRequest.bandMapping
            )
        );
    }

    if (
        workflowRequest.outputDirectory !== undefined
    ) {
        errors.push(
            ...validatePathString(
                workflowRequest.outputDirectory,
                "workflowRequest.outputDirectory"
            )
        );
    }

    if (
        workflowRequest.noData !== undefined &&
        workflowRequest.noData !== null &&
        (
            typeof workflowRequest.noData !== "number" ||
            !Number.isFinite(workflowRequest.noData)
        )
    ) {
        errors.push(
            "workflowRequest.noData must be a finite number or null."
        );
    }

    for (const field of [
        "parameters",
        "processingContext",
        "spatialContext"
    ]) {
        if (
            workflowRequest[field] !== undefined &&
            workflowRequest[field] !== null &&
            !isPlainObject(
                workflowRequest[field]
            )
        ) {
            errors.push(
                `workflowRequest.${field} must be an object.`
            );
        }
    }

    return {
        errors,
        indexCode: normalizedIndexCode,
        definition
    };
}

function validateTemporalObservationWorkflowRequest(
    request
) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Temporal observation workflow request must be a plain object."
            ]
        };
    }

    if (
        request.contractVersion !==
        TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION}".`
        );
    }

    errors.push(
        ...validateRequiredFields(
            request,
            REQUIRED_REQUEST_FIELDS,
            "request"
        )
    );

    errors.push(
        ...validateTemporalIdentity(
            request.temporalIdentity
        )
    );

    errors.push(
        ...validateRasterIdentity(
            request.rasterIdentity
        )
    );

    const workflowValidation =
        validateWorkflowRequest(
            request.workflowRequest
        );

    errors.push(
        ...workflowValidation.errors
    );

    return {
        valid: errors.length === 0,
        errors,
        indexCode:
            workflowValidation.indexCode,
        definition:
            workflowValidation.definition
    };
}

function createTemporalObservationWorkflowRequestContract({
    contractVersion =
        TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    temporalIdentity,
    rasterIdentity,
    workflowRequest
}) {
    const request = {
        contractVersion,
        temporalIdentity: {
            ...temporalIdentity
        },
        rasterIdentity: {
            ...rasterIdentity
        },
        workflowRequest: {
            ...workflowRequest
        }
    };

    // Normalize creator input before strict validation.
    // This permits harmless surrounding whitespace while keeping
    // the underlying temporal/date semantics strict.

    if (
        isNonEmptyString(
            request.temporalIdentity.observationDate
        )
    ) {
        request.temporalIdentity.observationDate =
            request.temporalIdentity.observationDate.trim();
    }

    if (
        isNonEmptyString(
            request.temporalIdentity.acquisitionDate
        )
    ) {
        request.temporalIdentity.acquisitionDate =
            request.temporalIdentity.acquisitionDate.trim();
    }

    if (
        isNonEmptyString(
            request.temporalIdentity.sensor
        )
    ) {
        request.temporalIdentity.sensor =
            request.temporalIdentity.sensor.trim();
    }

    if (
        isNonEmptyString(
            request.temporalIdentity.sceneId
        )
    ) {
        request.temporalIdentity.sceneId =
            request.temporalIdentity.sceneId.trim();
    }

    if (
        isNonEmptyString(
            request.rasterIdentity.rasterId
        )
    ) {
        request.rasterIdentity.rasterId =
            request.rasterIdentity.rasterId.trim();
    }

    if (
        isNonEmptyString(
            request.workflowRequest.indexCode
        )
    ) {
        request.workflowRequest.indexCode =
            request.workflowRequest.indexCode
                .trim()
                .toUpperCase();
    }

    const validation =
        validateTemporalObservationWorkflowRequest(
            request
        );

    if (!validation.valid) {
        const error =
            new TypeError(
                "Invalid temporal observation workflow request: " +
                validation.errors.join("; ")
            );

        error.code =
            "INVALID_TEMPORAL_OBSERVATION_WORKFLOW_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return {
        ...request,
        temporalIdentity: {
            ...request.temporalIdentity,
            observationDate:
                request.temporalIdentity
                    .observationDate
                    .trim(),
            acquisitionDate:
                request.temporalIdentity
                    .acquisitionDate
                    .trim(),
            sensor:
                request.temporalIdentity
                    .sensor
                    .trim(),
            sceneId:
                request.temporalIdentity
                    .sceneId
                    .trim()
        },
        rasterIdentity: {
            ...request.rasterIdentity,
            rasterId:
                request.rasterIdentity
                    .rasterId
                    .trim()
        },
        workflowRequest: {
            ...request.workflowRequest,
            indexCode:
                request.workflowRequest
                    .indexCode
                    .trim()
                    .toUpperCase()
        }
    };
}

module.exports = {
    TEMPORAL_OBSERVATION_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    REQUIRED_TEMPORAL_IDENTITY_FIELDS,
    REQUIRED_RASTER_IDENTITY_FIELDS,
    REQUIRED_WORKFLOW_REQUEST_FIELDS,
    OPTIONAL_WORKFLOW_REQUEST_FIELDS,
    validateTemporalObservationWorkflowRequest,
    createTemporalObservationWorkflowRequestContract
};

