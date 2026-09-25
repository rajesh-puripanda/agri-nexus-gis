"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/rasterIndexWorkflowContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.6.1
// Raster Index Workflow Result Contract
//
// Defines the structural contract for the integrated raster
// index workflow result.
//
// This contract does not:
//   - calculate indices
//   - classify pixels
//   - read GeoTIFF files
//   - write GeoTIFF files
//   - reproject rasters
//   - resample rasters
//   - modify raster values
//
// Those responsibilities remain in their authoritative
// services.
// ============================================================

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const RASTER_INDEX_WORKFLOW_CONTRACT_VERSION = "1.0";

const REQUIRED_WORKFLOW_FIELDS = [
    "workflowVersion",
    "indexCode",
    "input",
    "processing",
    "continuousOutput",
    "classificationOutput"
];

const REQUIRED_INPUT_FIELDS = [
    "filePath",
    "width",
    "height",
    "pixelCount"
];

const REQUIRED_PROCESSING_FIELDS = [
    "indexCode",
    "indexName",
    "classificationMethod"
];

const REQUIRED_OUTPUT_FIELDS = [
    "outputPath",
    "outputType",
    "indexCode",
    "dataType",
    "width",
    "height",
    "pixelCount"
];

const OUTPUT_TYPES = [
    "continuous_index",
    "classification"
];

const DATA_TYPES = [
    "Float32",
    "Uint8"
];

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function normalizeIndexCode(indexCode) {
    if (
        typeof indexCode !== "string" ||
        !indexCode.trim()
    ) {
        throw new Error(
            "indexCode must be a non-empty string"
        );
    }

    return indexCode.trim().toUpperCase();
}

function validateRequiredFields(
    object,
    fields,
    context
) {
    const errors = [];

    if (!isPlainObject(object)) {
        return [
            `${context} must be an object`
        ];
    }

    for (const field of fields) {
        if (
            !Object.prototype.hasOwnProperty.call(
                object,
                field
            )
        ) {
            errors.push(
                `${context} is missing required field: ${field}`
            );
        }
    }

    return errors;
}

function validateNonEmptyString(
    value,
    name
) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return [
            `${name} must be a non-empty string`
        ];
    }

    return [];
}

function validatePositiveInteger(
    value,
    name
) {
    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {
        return [
            `${name} must be a positive integer`
        ];
    }

    return [];
}

function validatePixelCount(
    width,
    height,
    pixelCount,
    context
) {
    const errors = [];

    if (
        Number.isInteger(width) &&
        width > 0 &&
        Number.isInteger(height) &&
        height > 0 &&
        Number.isInteger(pixelCount) &&
        pixelCount > 0 &&
        pixelCount !== width * height
    ) {
        errors.push(
            `${context}.pixelCount ${pixelCount} does not match width * height ${width * height}`
        );
    }

    return errors;
}

function validateInput(input) {
    const errors = [];

    errors.push(
        ...validateRequiredFields(
            input,
            REQUIRED_INPUT_FIELDS,
            "input"
        )
    );

    if (!isPlainObject(input)) {
        return errors;
    }

    errors.push(
        ...validateNonEmptyString(
            input.filePath,
            "input.filePath"
        )
    );

    errors.push(
        ...validatePositiveInteger(
            input.width,
            "input.width"
        )
    );

    errors.push(
        ...validatePositiveInteger(
            input.height,
            "input.height"
        )
    );

    errors.push(
        ...validatePositiveInteger(
            input.pixelCount,
            "input.pixelCount"
        )
    );

    errors.push(
        ...validatePixelCount(
            input.width,
            input.height,
            input.pixelCount,
            "input"
        )
    );

    return errors;
}

function validateProcessing(
    processing,
    indexCode,
    definition
) {
    const errors = [];

    errors.push(
        ...validateRequiredFields(
            processing,
            REQUIRED_PROCESSING_FIELDS,
            "processing"
        )
    );

    if (!isPlainObject(processing)) {
        return errors;
    }

    if (
        typeof processing.indexCode !== "string" ||
        !processing.indexCode.trim()
    ) {
        errors.push(
            "processing.indexCode must be a non-empty string"
        );
    } else if (
        processing.indexCode.trim().toUpperCase() !==
        indexCode
    ) {
        errors.push(
            `processing.indexCode must match indexCode ${indexCode}`
        );
    }

    if (
        typeof processing.indexName !== "string" ||
        !processing.indexName.trim()
    ) {
        errors.push(
            "processing.indexName must be a non-empty string"
        );
    } else if (
        definition &&
        processing.indexName !== definition.name
    ) {
        errors.push(
            `processing.indexName must match registered definition for ${indexCode}`
        );
    }

    if (
        typeof processing.classificationMethod !==
            "string" ||
        !processing.classificationMethod.trim()
    ) {
        errors.push(
            "processing.classificationMethod must be a non-empty string"
        );
    }

    return errors;
}

function validateOutput({
    output,
    expectedOutputType,
    expectedDataType,
    indexCode,
    context
}) {
    const errors = [];

    errors.push(
        ...validateRequiredFields(
            output,
            REQUIRED_OUTPUT_FIELDS,
            context
        )
    );

    if (!isPlainObject(output)) {
        return errors;
    }

    errors.push(
        ...validateNonEmptyString(
            output.outputPath,
            `${context}.outputPath`
        )
    );

    if (
        typeof output.outputType !== "string" ||
        !output.outputType.trim()
    ) {
        errors.push(
            `${context}.outputType must be a non-empty string`
        );
    } else if (
        !OUTPUT_TYPES.includes(
            output.outputType
        )
    ) {
        errors.push(
            `${context}.outputType must be one of: ${OUTPUT_TYPES.join(", ")}`
        );
    } else if (
        output.outputType !== expectedOutputType
    ) {
        errors.push(
            `${context}.outputType must be ${expectedOutputType}`
        );
    }

    if (
        typeof output.indexCode !== "string" ||
        !output.indexCode.trim()
    ) {
        errors.push(
            `${context}.indexCode must be a non-empty string`
        );
    } else if (
        output.indexCode.trim().toUpperCase() !==
        indexCode
    ) {
        errors.push(
            `${context}.indexCode must match indexCode ${indexCode}`
        );
    }

    if (
        typeof output.dataType !== "string" ||
        !DATA_TYPES.includes(
            output.dataType
        )
    ) {
        errors.push(
            `${context}.dataType must be one of: ${DATA_TYPES.join(", ")}`
        );
    } else if (
        output.dataType !== expectedDataType
    ) {
        errors.push(
            `${context}.dataType must be ${expectedDataType}`
        );
    }

    errors.push(
        ...validatePositiveInteger(
            output.width,
            `${context}.width`
        )
    );

    errors.push(
        ...validatePositiveInteger(
            output.height,
            `${context}.height`
        )
    );

    errors.push(
        ...validatePositiveInteger(
            output.pixelCount,
            `${context}.pixelCount`
        )
    );

    errors.push(
        ...validatePixelCount(
            output.width,
            output.height,
            output.pixelCount,
            context
        )
    );

    return errors;
}

function validateRasterIndexWorkflowResult(
    result
) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: [
                "result must be an object"
            ],
            workflowVersion: null,
            indexCode: null,
            definition: null
        };
    }

    errors.push(
        ...validateRequiredFields(
            result,
            REQUIRED_WORKFLOW_FIELDS,
            "result"
        )
    );

    if (
        typeof result.workflowVersion !==
            "string" ||
        !result.workflowVersion.trim()
    ) {
        errors.push(
            "workflowVersion must be a non-empty string"
        );
    } else if (
        result.workflowVersion !==
        RASTER_INDEX_WORKFLOW_CONTRACT_VERSION
    ) {
        errors.push(
            `workflowVersion must be ${RASTER_INDEX_WORKFLOW_CONTRACT_VERSION}`
        );
    }

    let indexCode = null;
    let definition = null;

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "indexCode"
        )
    ) {
        try {
            indexCode =
                normalizeIndexCode(
                    result.indexCode
                );
        } catch (error) {
            errors.push(
                error.message
            );
        }
    }

    if (indexCode) {
        definition =
            getIndexDefinition(
                indexCode
            );

        if (!definition) {
            errors.push(
                `Unknown remote sensing index: ${indexCode}`
            );
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "input"
        )
    ) {
        errors.push(
            ...validateInput(
                result.input
            )
        );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "processing"
        ) &&
        indexCode
    ) {
        errors.push(
            ...validateProcessing(
                result.processing,
                indexCode,
                definition
            )
        );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "continuousOutput"
        ) &&
        indexCode
    ) {
        errors.push(
            ...validateOutput({
                output:
                    result.continuousOutput,
                expectedOutputType:
                    "continuous_index",
                expectedDataType:
                    "Float32",
                indexCode,
                context:
                    "continuousOutput"
            })
        );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "classificationOutput"
        ) &&
        indexCode
    ) {
        errors.push(
            ...validateOutput({
                output:
                    result.classificationOutput,
                expectedOutputType:
                    "classification",
                expectedDataType:
                    "Uint8",
                indexCode,
                context:
                    "classificationOutput"
            })
        );
    }

    if (
        isPlainObject(result.input) &&
        isPlainObject(result.continuousOutput)
    ) {
        if (
            result.continuousOutput.width !==
                result.input.width
        ) {
            errors.push(
                "continuousOutput.width must match input.width"
            );
        }

        if (
            result.continuousOutput.height !==
                result.input.height
        ) {
            errors.push(
                "continuousOutput.height must match input.height"
            );
        }

        if (
            result.continuousOutput.pixelCount !==
                result.input.pixelCount
        ) {
            errors.push(
                "continuousOutput.pixelCount must match input.pixelCount"
            );
        }
    }

    if (
        isPlainObject(result.input) &&
        isPlainObject(result.classificationOutput)
    ) {
        if (
            result.classificationOutput.width !==
                result.input.width
        ) {
            errors.push(
                "classificationOutput.width must match input.width"
            );
        }

        if (
            result.classificationOutput.height !==
                result.input.height
        ) {
            errors.push(
                "classificationOutput.height must match input.height"
            );
        }

        if (
            result.classificationOutput.pixelCount !==
                result.input.pixelCount
        ) {
            errors.push(
                "classificationOutput.pixelCount must match input.pixelCount"
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        workflowVersion:
            result.workflowVersion || null,
        indexCode,
        definition
    };
}

function createRasterIndexWorkflowResultContract({
    workflowVersion =
        RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
    indexCode,
    input,
    processing,
    continuousOutput,
    classificationOutput
}) {
    return {
        workflowVersion,
        indexCode,
        input,
        processing,
        continuousOutput,
        classificationOutput
    };
}

module.exports = {
    RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
    REQUIRED_WORKFLOW_FIELDS,
    REQUIRED_INPUT_FIELDS,
    REQUIRED_PROCESSING_FIELDS,
    REQUIRED_OUTPUT_FIELDS,
    OUTPUT_TYPES,
    DATA_TYPES,
    validateRasterIndexWorkflowResult,
    createRasterIndexWorkflowResultContract
};
