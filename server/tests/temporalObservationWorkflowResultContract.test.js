"use strict";

// ============================================================
// server/tests/temporalObservationWorkflowResultContract.test.js
//
// AgriNexus GIS
//
// Phase 5.1.5.3.3
// Temporal Observation Workflow Result Contract v1.0
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION,
    REQUIRED_RESULT_FIELDS,
    REQUIRED_OUTPUT_FIELDS,
    EXPECTED_OUTPUTS,
    validateTemporalObservationWorkflowResult,
    createTemporalObservationWorkflowResultContract
} = require("../scientific/remoteSensing/temporal/temporalObservationWorkflowResultContract");

function createValidObservation() {
    return {
        contractVersion: "1.0",
        observation: {
            observationDate: "2025-06-15",
            acquisitionDate: "2025-06-15T05:30:00Z",
            sensor: "Sentinel-2",
            sceneId: "S2A_TEST_SCENE",
            indexCode: "NDVI"
        },
        raster: {
            rasterId: "RASTER-001",
            width: 2,
            height: 2,
            pixelCount: 4,
            noData: -9999
        },
        index: {
            code: "NDVI",
            name: "Normalized Difference Vegetation Index",
            validRange: {
                min: -1,
                max: 1
            }
        },
        statistics: {
            validPixelCount: 4,
            noDataPixelCount: 0,
            minimum: 0.1,
            maximum: 0.8,
            mean: 0.45
        },
        spatialContext: {
            projection: "EPSG:4326"
        },
        processingContext: {
            workflow: "temporal_observation"
        }
    };
}

function createValidOutput(
    outputType,
    dataType,
    outputPath
) {
    return {
        outputPath,
        outputType,
        indexCode: "NDVI",
        dataType,
        width: 2,
        height: 2,
        pixelCount: 4
    };
}

function createValidResult() {
    return {
        contractVersion:
            TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION,
        observation: createValidObservation(),
        continuousOutput: createValidOutput(
            EXPECTED_OUTPUTS.continuousOutput.outputType,
            EXPECTED_OUTPUTS.continuousOutput.dataType,
            "C:\\temp\\ndvi_continuous.tif"
        ),
        classificationOutput: createValidOutput(
            EXPECTED_OUTPUTS.classificationOutput.outputType,
            EXPECTED_OUTPUTS.classificationOutput.dataType,
            "C:\\temp\\ndvi_classification.tif"
        )
    };
}

test(
    "exports Phase 5.1.5.3.3 contract version and field definitions",
    () => {
        assert.equal(
            TEMPORAL_OBSERVATION_WORKFLOW_RESULT_CONTRACT_VERSION,
            "1.0"
        );

        assert.deepEqual(
            REQUIRED_RESULT_FIELDS,
            [
                "contractVersion",
                "observation",
                "continuousOutput",
                "classificationOutput"
            ]
        );

        assert.deepEqual(
            REQUIRED_OUTPUT_FIELDS,
            [
                "outputPath",
                "outputType",
                "indexCode",
                "dataType",
                "width",
                "height",
                "pixelCount"
            ]
        );
    }
);

test(
    "accepts a valid temporal observation workflow result",
    () => {
        const result =
            createValidResult();

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, true);
        assert.deepEqual(validation.errors, []);
    }
);

test(
    "rejects a non-object result",
    () => {
        const validation =
            validateTemporalObservationWorkflowResult(
                null
            );

        assert.equal(validation.valid, false);
        assert.match(
            validation.errors[0],
            /result must be an object/
        );
    }
);

test(
    "rejects a missing required top-level field",
    () => {
        const result =
            createValidResult();

        delete result.continuousOutput;

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "result is missing required field: continuousOutput"
                    )
            )
        );
    }
);

test(
    "rejects an unsupported contract version",
    () => {
        const result =
            createValidResult();

        result.contractVersion = "2.0";

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "contractVersion must be 1.0"
                    )
            )
        );
    }
);

test(
    "delegates temporal observation validation",
    () => {
        const result =
            createValidResult();

        result.observation.index.code =
            "NOT_A_REGISTERED_INDEX";

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.startsWith(
                        "observation:"
                    )
            )
        );
    }
);

test(
    "rejects invalid continuous output type",
    () => {
        const result =
            createValidResult();

        result.continuousOutput.outputType =
            "classification";

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "continuousOutput.outputType must be continuous_index"
                    )
            )
        );
    }
);

test(
    "rejects invalid classification output data type",
    () => {
        const result =
            createValidResult();

        result.classificationOutput.dataType =
            "Float32";

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "classificationOutput.dataType must be Uint8"
                    )
            )
        );
    }
);

test(
    "rejects invalid output dimensions",
    () => {
        const result =
            createValidResult();

        result.continuousOutput.width = 0;

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "continuousOutput.width must be a positive integer"
                    )
            )
        );
    }
);

test(
    "rejects output pixel count inconsistent with dimensions",
    () => {
        const result =
            createValidResult();

        result.classificationOutput.pixelCount =
            3;

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "classificationOutput.pixelCount must equal width * height"
                    )
            )
        );
    }
);

test(
    "rejects output index code inconsistent with observation",
    () => {
        const result =
            createValidResult();

        result.continuousOutput.indexCode =
            "EVI";

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "continuousOutput.indexCode must match observation.index.code"
                    )
            )
        );
    }
);

test(
    "rejects output dimensions inconsistent with observation raster",
    () => {
        const result =
            createValidResult();

        result.classificationOutput.height =
            4;
        result.classificationOutput.pixelCount =
            8;

        const validation =
            validateTemporalObservationWorkflowResult(
                result
            );

        assert.equal(validation.valid, false);
        assert.ok(
            validation.errors.some(
                (error) =>
                    error.includes(
                        "classificationOutput.height must match observation.raster.height"
                    )
            )
        );
    }
);

test(
    "creator returns a valid result unchanged",
    () => {
        const result =
            createValidResult();

        const created =
            createTemporalObservationWorkflowResultContract(
                result
            );

        assert.deepEqual(
            created,
            result
        );
    }
);

test(
    "creator throws typed error for invalid result",
    () => {
        const result =
            createValidResult();

        result.continuousOutput.dataType =
            "Uint8";

        assert.throws(
            () =>
                createTemporalObservationWorkflowResultContract(
                    result
                ),
            (error) => {
                assert.equal(
                    error instanceof TypeError,
                    true
                );

                assert.equal(
                    error.code,
                    "INVALID_TEMPORAL_OBSERVATION_WORKFLOW_RESULT"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                return true;
            }
        );
    }
);

test(
    "validation is side-effect free",
    () => {
        const result =
            createValidResult();

        const before =
            JSON.stringify(result);

        validateTemporalObservationWorkflowResult(
            result
        );

        assert.equal(
            JSON.stringify(result),
            before
        );
    }
);
