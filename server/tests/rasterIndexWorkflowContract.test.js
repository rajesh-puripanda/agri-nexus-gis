"use strict";

// ============================================================
// server/tests/rasterIndexWorkflowContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.3.6.1
// Raster Index Workflow Result Contract Tests
// ============================================================

const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
    validateRasterIndexWorkflowResult,
    createRasterIndexWorkflowResultContract
} = require(
    "../scientific/remoteSensing/raster/rasterIndexWorkflowContract"
);

function validResult() {
    return {
        workflowVersion:
            RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,

        indexCode: "NDVI",

        input: {
            filePath:
                "C:\\data\\source.tif",
            width: 4,
            height: 2,
            pixelCount: 8
        },

        processing: {
            indexCode: "NDVI",
            indexName:
                "Normalized Difference Vegetation Index",
            classificationMethod:
                "baseline_qualitative"
        },

        continuousOutput: {
            outputPath:
                "C:\\data\\NDVI_index.tif",
            outputType:
                "continuous_index",
            indexCode: "NDVI",
            dataType: "Float32",
            width: 4,
            height: 2,
            pixelCount: 8
        },

        classificationOutput: {
            outputPath:
                "C:\\data\\NDVI_classification.tif",
            outputType:
                "classification",
            indexCode: "NDVI",
            dataType: "Uint8",
            width: 4,
            height: 2,
            pixelCount: 8
        }
    };
}

test(
    "workflow contract version is 1.0",
    () => {
        assert.equal(
            RASTER_INDEX_WORKFLOW_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "validates a complete workflow result",
    () => {
        const validation =
            validateRasterIndexWorkflowResult(
                validResult()
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            validation.errors,
            []
        );

        assert.equal(
            validation.indexCode,
            "NDVI"
        );

        assert.equal(
            validation.definition.code,
            "NDVI"
        );
    }
);

test(
    "normalizes lowercase index code",
    () => {
        const result =
            validResult();

        result.indexCode = "ndvi";
        result.processing.indexCode =
            "ndvi";
        result.continuousOutput.indexCode =
            "ndvi";
        result.classificationOutput.indexCode =
            "ndvi";

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.indexCode,
            "NDVI"
        );
    }
);

test(
    "rejects missing workflow field",
    () => {
        const result =
            validResult();

        delete result.processing;

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "processing"
                    )
            )
        );
    }
);

test(
    "rejects unknown index",
    () => {
        const result =
            validResult();

        result.indexCode =
            "UNKNOWN";

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "Unknown remote sensing index"
                    )
            )
        );
    }
);

test(
    "rejects wrong continuous output type",
    () => {
        const result =
            validResult();

        result.continuousOutput.outputType =
            "classification";

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "continuousOutput.outputType must be continuous_index"
                    )
            )
        );
    }
);

test(
    "rejects wrong classification data type",
    () => {
        const result =
            validResult();

        result.classificationOutput.dataType =
            "Float32";

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "classificationOutput.dataType must be Uint8"
                    )
            )
        );
    }
);

test(
    "rejects output dimensions that differ from input",
    () => {
        const result =
            validResult();

        result.continuousOutput.width =
            8;

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "continuousOutput.width must match input.width"
                    )
            )
        );
    }
);

test(
    "rejects processing index name inconsistent with registry",
    () => {
        const result =
            validResult();

        result.processing.indexName =
            "Incorrect Index Name";

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "processing.indexName must match registered definition"
                    )
            )
        );
    }
);

test(
    "rejects input pixel count mismatch",
    () => {
        const result =
            validResult();

        result.input.pixelCount =
            7;

        const validation =
            validateRasterIndexWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "input.pixelCount"
                    )
            )
        );
    }
);

test(
    "creates the workflow result contract structure",
    () => {
        const source =
            validResult();

        const result =
            createRasterIndexWorkflowResultContract(
                source
            );

        assert.deepEqual(
            result,
            source
        );
    }
);
