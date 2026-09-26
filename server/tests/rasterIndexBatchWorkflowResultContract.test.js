"use strict";

// ============================================================
// server/tests/rasterIndexBatchWorkflowResultContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.3
// Batch Raster Workflow Result Contract Tests
// ============================================================

const assert = require("node:assert/strict");

const { getIndexDefinition } = require("../scientific/remoteSensing/indices/indexRegistry");
const { test } = require("node:test");

const {
    RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION,
    REQUIRED_BATCH_RESULT_FIELDS,
    REQUIRED_INPUT_FIELDS,
    validateRasterIndexBatchWorkflowResult,
    createRasterIndexBatchWorkflowResultContract
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowResultContract"
);

function workflowResult(indexCode) {
    return {
        workflowVersion: "1.0",
        indexCode,
        input: {
            filePath: "D:\\data\\scene.tif",
            width: 4,
            height: 2,
            pixelCount: 8
        },
        processing: {
            indexCode,
            indexName: getIndexDefinition(indexCode).name,
            classificationMethod:
                "baseline_qualitative"
        },
        continuousOutput: {
            outputPath:
                `D:\\data\\output\\${indexCode}_index.tif`,
            outputType:
                "continuous_index",
            indexCode,
            dataType: "Float32",
            width: 4,
            height: 2,
            pixelCount: 8
        },
        classificationOutput: {
            outputPath:
                `D:\\data\\output\\${indexCode}_classification.tif`,
            outputType:
                "classification",
            indexCode,
            dataType: "Uint8",
            width: 4,
            height: 2,
            pixelCount: 8
        }
    };
}

function validResult(overrides = {}) {
    return {
        batchVersion:
            RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION,

        input: {
            filePath:
                "D:\\data\\scene.tif",

            indexCodes: [
                "NDVI",
                "EVI",
                "NDMI"
            ]
        },

        results: [
            workflowResult("NDVI"),
            workflowResult("EVI"),
            workflowResult("NDMI")
        ],

        ...overrides
    };
}

test(
    "batch result contract version is 1.0",
    () => {
        assert.equal(
            RASTER_INDEX_BATCH_WORKFLOW_RESULT_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "batch result contract defines required fields",
    () => {
        assert.deepEqual(
            REQUIRED_BATCH_RESULT_FIELDS,
            [
                "batchVersion",
                "input",
                "results"
            ]
        );

        assert.deepEqual(
            REQUIRED_INPUT_FIELDS,
            [
                "filePath",
                "indexCodes"
            ]
        );
    }
);

test(
    "valid batch workflow result passes validation",
    () => {
        const validation =
            validateRasterIndexBatchWorkflowResult(
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
    }
);

test(
    "batch result validation is side-effect-free",
    () => {
        const result =
            validResult({
                input: {
                    filePath:
                        "D:\\data\\scene.tif",

                    indexCodes: [
                        " ndvi ",
                        "evi",
                        "NdMi"
                    ]
                }
            });

        result.results = [
            workflowResult("NDVI"),
            workflowResult("EVI"),
            workflowResult("NDMI")
        ];

        const original =
            structuredClone(result);

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.deepEqual(
            result,
            original
        );

        assert.deepEqual(
            result.input.indexCodes,
            [
                " ndvi ",
                "evi",
                "NdMi"
            ]
        );
    }
);

test(
    "missing batch field is rejected",
    () => {
        const result =
            validResult();

        delete result.batchVersion;

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);

test(
    "invalid input is rejected",
    () => {
        const result =
            validResult({
                input: {
                    filePath: "",
                    indexCodes: []
                }
            });

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.length >= 2
        );
    }
);

test(
    "unknown index is rejected",
    () => {
        const result =
            validResult({
                input: {
                    filePath:
                        "D:\\data\\scene.tif",

                    indexCodes: [
                        "NDVI",
                        "UNKNOWN"
                    ]
                }
            });

        result.results = [
            workflowResult("NDVI"),
            workflowResult("EVI")
        ];

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);

test(
    "empty results are rejected",
    () => {
        const result =
            validResult({
                results: []
            });

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);

test(
    "results length must match requested indices",
    () => {
        const result =
            validResult({
                input: {
                    filePath:
                        "D:\\data\\scene.tif",

                    indexCodes: [
                        "NDVI",
                        "EVI",
                        "NDMI"
                    ]
                },

                results: [
                    workflowResult("NDVI"),
                    workflowResult("EVI")
                ]
            });

        const validation =
            validateRasterIndexBatchWorkflowResult(
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
                        "length must match results length"
                    )
            )
        );
    }
);

test(
    "result order must match requested index order",
    () => {
        const result =
            validResult({
                results: [
                    workflowResult("EVI"),
                    workflowResult("NDVI"),
                    workflowResult("NDMI")
                ]
            });

        const validation =
            validateRasterIndexBatchWorkflowResult(
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
                        "must match input.indexCodes"
                    )
            )
        );
    }
);

test(
    "invalid delegated workflow result is rejected",
    () => {
        const result =
            validResult();

        result.results[1].continuousOutput.dataType =
            "Uint8";

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.ok(
            validation.errors.some(
                error =>
                    error.startsWith(
                        "results[1]:"
                    )
            )
        );
    }
);

test(
    "delegated workflow result index mismatch is rejected",
    () => {
        const result =
            validResult();

        result.results[1].indexCode =
            "NDVI";

        result.results[1].processing.indexCode =
            "NDVI";

        result.results[1].continuousOutput.indexCode =
            "NDVI";

        result.results[1].classificationOutput.indexCode =
            "NDVI";

        const validation =
            validateRasterIndexBatchWorkflowResult(
                result
            );

        assert.equal(
            validation.valid,
            false
        );
    }
);

test(
    "factory creates a valid batch result",
    () => {
        const result =
            createRasterIndexBatchWorkflowResultContract(
                {
                    input: {
                        filePath:
                            "D:\\data\\scene.tif",

                        indexCodes: [
                            "NDVI",
                            "EVI"
                        ]
                    },

                    results: [
                        workflowResult("NDVI"),
                        workflowResult("EVI")
                    ]
                }
            );

        assert.equal(
            result.batchVersion,
            "1.0"
        );

        assert.deepEqual(
            result.input.indexCodes,
            [
                "NDVI",
                "EVI"
            ]
        );

        assert.equal(
            result.results.length,
            2
        );
    }
);

test(
    "factory rejects an invalid batch result",
    () => {
        assert.throws(
            () =>
                createRasterIndexBatchWorkflowResultContract(
                    {
                        input: {
                            filePath: "",
                            indexCodes: []
                        },
                        results: []
                    }
                ),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_RASTER_INDEX_BATCH_WORKFLOW_RESULT"
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


