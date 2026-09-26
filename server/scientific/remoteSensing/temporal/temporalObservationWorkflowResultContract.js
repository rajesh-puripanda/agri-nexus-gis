"use strict";

// ============================================================
// server/scientific/remoteSensing/temporal/
// temporalObservationWorkflowResultContract.js
//
// AgriNexus GIS
//
// Phase 5.1.5.3.3
// Temporal Observation Workflow Result Contract v1.0
//
// Responsibilities:
// - Validate temporal observation workflow result structure.
// - Delegate observation validation to the frozen
//   Temporal Index Observation Contract.
// - Validate flattened raster output artifacts using the
//   established Raster Index Workflow output semantics.
// - Validate cross-field observation/output consistency.
//
// Non-responsibilities:
// - No raster reading.
// - No raster writing.
// - No index calculation.
// - No statistics calculation.
// - No classification.
// - No temporal composition.
// - No trend/change/seasonal analysis.
// - No interpolation/reprojection/resampling.
// ============================================================

const {
    validateTemporalIndexObservation
} = require("./temporalIndexObservationContract");

const TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION =
    "1.0";

const REQUIRED_RESULT_FIELDS = [
    "contractVersion",
    "observation",
    "continuousOutput",
    "classificationOutput"
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

const EXPECTED_OUTPUTS = {
    continuousOutput: {
        outputType: "continuous_index",
        dataType: "Float32"
    },
    classificationOutput: {
        outputType: "classification",
        dataType: "Uint8"
    }
};

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateRequiredFields(object, fields, context) {
    const errors = [];

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

function validatePositiveInteger(value, name) {
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

function validateOutputArtifact(
    output,
    outputName,
    expected
) {
    const errors = [];

    if (!isPlainObject(output)) {
        return [
            `${outputName} must be an object`
        ];
    }

    errors.push(
        ...validateRequiredFields(
            output,
            REQUIRED_OUTPUT_FIELDS,
            outputName
        )
    );

    if (
        typeof output.outputPath !== "string" ||
        !output.outputPath.trim()
    ) {
        errors.push(
            `${outputName}.outputPath must be a non-empty string`
        );
    }

    if (
        typeof output.outputType !== "string" ||
        !output.outputType.trim()
    ) {
        errors.push(
            `${outputName}.outputType must be a non-empty string`
        );
    } else if (
        output.outputType.trim().toLowerCase() !==
        expected.outputType
    ) {
        errors.push(
            `${outputName}.outputType must be ${expected.outputType}`
        );
    }

    if (
        typeof output.indexCode !== "string" ||
        !output.indexCode.trim()
    ) {
        errors.push(
            `${outputName}.indexCode must be a non-empty string`
        );
    }

    if (
        typeof output.dataType !== "string" ||
        !output.dataType.trim()
    ) {
        errors.push(
            `${outputName}.dataType must be a non-empty string`
        );
    } else if (
        output.dataType.trim() !== expected.dataType
    ) {
        errors.push(
            `${outputName}.dataType must be ${expected.dataType}`
        );
    }

    errors.push(
        ...validatePositiveInteger(
            output.width,
            `${outputName}.width`
        )
    );

    errors.push(
        ...validatePositiveInteger(
            output.height,
            `${outputName}.height`
        )
    );

    errors.push(
        ...validatePositiveInteger(
            output.pixelCount,
            `${outputName}.pixelCount`
        )
    );

    if (
        Number.isInteger(output.width) &&
        output.width > 0 &&
        Number.isInteger(output.height) &&
        output.height > 0 &&
        Number.isInteger(output.pixelCount) &&
        output.pixelCount > 0 &&
        output.pixelCount !==
            output.width * output.height
    ) {
        errors.push(
            `${outputName}.pixelCount must equal width * height`
        );
    }

    return errors;
}

function validateTemporalObservationWorkflowResult(
    result
) {
    const errors = [];

    if (!isPlainObject(result)) {
        return {
            valid: false,
            errors: [
                "result must be an object"
            ]
        };
    }

    errors.push(
        ...validateRequiredFields(
            result,
            REQUIRED_RESULT_FIELDS,
            "result"
        )
    );

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "contractVersion"
        ) &&
        result.contractVersion !==
            TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be ${TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION}`
        );
    }

    let observationValidation = null;

    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "observation"
        )
    ) {
        observationValidation =
            validateTemporalIndexObservation(
                result.observation
            );

        if (observationValidation.length > 0) {
            errors.push(
                ...observationValidation.map(
                    (error) =>
                        `observation: ${error}`
                )
            );
        }
    }

    const outputValidations = {};

    for (const outputName of [
        "continuousOutput",
        "classificationOutput"
    ]) {
        if (
            Object.prototype.hasOwnProperty.call(
                result,
                outputName
            )
        ) {
            const validation =
                validateOutputArtifact(
                    result[outputName],
                    outputName,
                    EXPECTED_OUTPUTS[outputName]
                );

            outputValidations[outputName] =
                validation;

            errors.push(...validation);
        }
    }

    if (
        observationValidation &&
        observationValidation.length === 0 &&
        isPlainObject(
            result.continuousOutput
        ) &&
        isPlainObject(
            result.classificationOutput
        )
    ) {
        const observation =
            result.observation;

        const observationIndexCode =
            observation.index &&
            observation.index.code;

        const continuousIndexCode =
            result.continuousOutput.indexCode;

        const classificationIndexCode =
            result.classificationOutput.indexCode;

        if (
            typeof observationIndexCode === "string" &&
            typeof continuousIndexCode === "string" &&
            observationIndexCode !==
                continuousIndexCode.trim().toUpperCase()
        ) {
            errors.push(
                "continuousOutput.indexCode must match observation.index.code"
            );
        }

        if (
            typeof observationIndexCode === "string" &&
            typeof classificationIndexCode === "string" &&
            observationIndexCode !==
                classificationIndexCode.trim().toUpperCase()
        ) {
            errors.push(
                "classificationOutput.indexCode must match observation.index.code"
            );
        }

        if (
            typeof continuousIndexCode === "string" &&
            typeof classificationIndexCode === "string" &&
            continuousIndexCode.trim().toUpperCase() !==
                classificationIndexCode.trim().toUpperCase()
        ) {
            errors.push(
                "continuousOutput.indexCode must match classificationOutput.indexCode"
            );
        }

        const raster =
            observation.raster;

        if (isPlainObject(raster)) {
            for (const outputName of [
                "continuousOutput",
                "classificationOutput"
            ]) {
                const output =
                    result[outputName];

                if (!isPlainObject(output)) {
                    continue;
                }

                if (
                    Number.isInteger(raster.width) &&
                    Number.isInteger(output.width) &&
                    raster.width !== output.width
                ) {
                    errors.push(
                        `${outputName}.width must match observation.raster.width`
                    );
                }

                if (
                    Number.isInteger(raster.height) &&
                    Number.isInteger(output.height) &&
                    raster.height !== output.height
                ) {
                    errors.push(
                        `${outputName}.height must match observation.raster.height`
                    );
                }

                if (
                    Number.isInteger(raster.pixelCount) &&
                    Number.isInteger(output.pixelCount) &&
                    raster.pixelCount !== output.pixelCount
                ) {
                    errors.push(
                        `${outputName}.pixelCount must match observation.raster.pixelCount`
                    );
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createTemporalObservationWorkflowResultContract({
    contractVersion =
        TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION,
    observation,
    continuousOutput,
    classificationOutput
}) {
    const result = {
        contractVersion,
        observation,
        continuousOutput,
        classificationOutput
    };

    const validation =
        validateTemporalObservationWorkflowResult(
            result
        );

    if (!validation.valid) {
        const error = new TypeError(
            `Invalid temporal observation workflow result: ${validation.errors.join("; ")}`
        );

        error.code =
            "INVALID_TEMPORAL_OBSERVATION_WORKFLOW_RESULT";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION,
    REQUIRED_RESULT_FIELDS,
    REQUIRED_OUTPUT_FIELDS,
    EXPECTED_OUTPUTS,
    validateTemporalObservationWorkflowResult,
    createTemporalObservationWorkflowResultContract
};
