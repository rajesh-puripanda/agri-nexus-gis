"use strict";

// ============================================================
// server/tests/rasterIndexBatchWorkflowRequestContract.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.4.2.1
// Raster Index Batch Workflow Request Contract Regression
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    RASTER_INDEX_BATCH_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    OPTIONAL_REQUEST_FIELDS,
    validateRasterIndexBatchWorkflowRequest,
    createRasterIndexBatchWorkflowRequestContract
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexBatchWorkflowRequestContract"
);

function validRequest() {
    return {
        inputPath: "D:\\data\\scene.tif",

        indexCodes: [
            "NDVI",
            "EVI",
            "NDMI"
        ],

        bandMapping: {
            Blue: 1,
            Green: 2,
            Red: 3,
            NIR: 4,
            SWIR: 5
        },

        noData: -9999,

        parameters: {
            SAVI: {
                L: 0.5
            }
        },

        processingContext: {
            source: "test"
        },

        spatialContext: {
            coordinateReferenceSystem: "EPSG:4326"
        },

        outputDirectory:
            "D:\\data\\output"
    };
}

test(
    "batch request contract version is 1.0",
    () => {
        assert.equal(
            RASTER_INDEX_BATCH_WORKFLOW_REQUEST_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "batch request contract defines required fields",
    () => {
        assert.deepEqual(
            REQUIRED_REQUEST_FIELDS,
            [
                "inputPath",
                "indexCodes",
                "bandMapping",
                "outputDirectory"
            ]
        );
    }
);

test(
    "batch request contract defines optional fields",
    () => {
        assert.deepEqual(
            OPTIONAL_REQUEST_FIELDS,
            [
                "noData",
                "parameters",
                "processingContext",
                "spatialContext"
            ]
        );
    }
);

test(
    "valid multi-index request passes validation",
    () => {
        const result =
            validateRasterIndexBatchWorkflowRequest(
                validRequest()
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.indexCodes,
            [
                "NDVI",
                "EVI",
                "NDMI"
            ]
        );
    }
);

test(
    "index codes are normalized",
    () => {
        const request =
            validRequest();

        request.indexCodes = [
            " ndvi ",
            "eVi"
        ];

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.indexCodes,
            [
                "NDVI",
                "EVI"
            ]
        );
    }
);

test(
    "unknown index is rejected",
    () => {
        const request =
            validRequest();

        request.indexCodes = [
            "NDVI",
            "UNKNOWN"
        ];

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "Unknown remote sensing index: UNKNOWN"
                    )
            )
        );
    }
);

test(
    "duplicate indices are rejected",
    () => {
        const request =
            validRequest();

        request.indexCodes = [
            "NDVI",
            "ndvi"
        ];

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "duplicate index: NDVI"
                    )
            )
        );
    }
);

test(
    "missing indexCodes are rejected",
    () => {
        const request =
            validRequest();

        delete request.indexCodes;

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "empty indexCodes are rejected",
    () => {
        const request =
            validRequest();

        request.indexCodes = [];

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "empty band mapping is rejected",
    () => {
        const request =
            validRequest();

        request.bandMapping = {};

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "invalid band numbers are rejected",
    () => {
        const request =
            validRequest();

        request.bandMapping = {
            Red: 0,
            NIR: -1
        };

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "duplicate canonical band names are rejected",
    () => {
        const request =
            validRequest();

        request.bandMapping = {
            Red: 3,
            red: 4
        };

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                (error) =>
                    error.includes(
                        "duplicate band"
                    )
            )
        );
    }
);

test(
    "NUL characters in paths are rejected",
    () => {
        const request =
            validRequest();

        request.inputPath =
            "D:\\data\\scene\0.tif";

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "invalid optional fields are rejected",
    () => {
        const request =
            validRequest();

        request.parameters = "invalid";

        const result =
            validateRasterIndexBatchWorkflowRequest(
                request
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "valid optional fields are accepted",
    () => {
        const result =
            validateRasterIndexBatchWorkflowRequest(
                validRequest()
            );

        assert.equal(
            result.valid,
            true
        );
    }
);

test(
    "contract factory creates normalized request",
    () => {
        const result =
            createRasterIndexBatchWorkflowRequestContract(
                {
                    ...validRequest(),

                    inputPath:
                        "  D:\\data\\scene.tif  ",

                    outputDirectory:
                        "  D:\\data\\output  ",

                    indexCodes: [
                        " ndvi ",
                        " evi "
                    ]
                }
            );

        assert.equal(
            result.contractVersion,
            "1.0"
        );

        assert.equal(
            result.inputPath,
            "D:\\data\\scene.tif"
        );

        assert.equal(
            result.outputDirectory,
            "D:\\data\\output"
        );

        assert.deepEqual(
            result.indexCodes,
            [
                "NDVI",
                "EVI"
            ]
        );

        assert.deepEqual(
            result.bandMapping,
            {
                Blue: 1,
                Green: 2,
                Red: 3,
                NIR: 4,
                SWIR: 5
            }
        );
    }
);

test(
    "factory rejects invalid request",
    () => {
        assert.throws(
            () =>
                createRasterIndexBatchWorkflowRequestContract(
                    {
                        ...validRequest(),
                        indexCodes: [
                            "UNKNOWN"
                        ]
                    }
                ),
            /Unknown remote sensing index/
        );
    }
);
