"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION,
    REQUIRED_REQUEST_FIELDS,
    OPTIONAL_REQUEST_FIELDS,
    validateRasterIndexWorkflowRequest,
    createRasterIndexWorkflowRequestContract
} = require(
    "../scientific/remoteSensing/raster/" +
    "rasterIndexWorkflowRequestContract"
);

function validRequest() {
    return {
        inputPath:
            "D:\\data\\scene.tif",

        indexCode:
            "NDVI",

        bandMapping: {
            Red: 3,
            NIR: 4
        },

        outputDirectory:
            "D:\\data\\output"
    };
}

test(
    "request contract version is 1.0",
    () => {
        assert.equal(
            RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION,
            "1.0"
        );
    }
);

test(
    "request contract defines required fields",
    () => {
        assert.deepEqual(
            REQUIRED_REQUEST_FIELDS,
            [
                "inputPath",
                "indexCode",
                "bandMapping",
                "outputDirectory"
            ]
        );
    }
);

test(
    "request contract defines optional fields",
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
    "valid NDVI request passes validation",
    () => {
        const result =
            validateRasterIndexWorkflowRequest(
                validRequest()
            );

        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
        assert.equal(result.indexCode, "NDVI");
        assert.equal(
            result.definition.code,
            "NDVI"
        );
    }
);

test(
    "index code is normalized",
    () => {
        const request = validRequest();
        request.indexCode = " ndvi ";

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
        assert.equal(
            result.indexCode,
            "NDVI"
        );
    }
);

test(
    "unknown index is rejected",
    () => {
        const request = validRequest();
        request.indexCode = "UNKNOWN";

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some((error) =>
                error.includes(
                    "Unknown remote sensing index"
                )
            )
        );
    }
);

test(
    "missing required fields are rejected",
    () => {
        const result =
            validateRasterIndexWorkflowRequest({});

        assert.equal(result.valid, false);

        for (
            const field of REQUIRED_REQUEST_FIELDS
        ) {
            assert.ok(
                result.errors.some((error) =>
                    error.includes(field)
                )
            );
        }
    }
);

test(
    "invalid band mapping is rejected",
    () => {
        const request = validRequest();

        request.bandMapping = {
            Red: 0,
            NIR: 4.5
        };

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.equal(
            result.errors.length,
            2
        );
    }
);

test(
    "empty band mapping is rejected",
    () => {
        const request = validRequest();
        request.bandMapping = {};

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some((error) =>
                error.includes(
                    "at least one band"
                )
            )
        );
    }
);

test(
    "invalid path fields are rejected",
    () => {
        const request = validRequest();

        request.inputPath = " ";
        request.outputDirectory = "";

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.ok(
            result.errors.some((error) =>
                error.includes(
                    "inputPath"
                )
            )
        );
        assert.ok(
            result.errors.some((error) =>
                error.includes(
                    "outputDirectory"
                )
            )
        );
    }
);

test(
    "NUL characters in path fields are rejected",
    () => {
        const inputPathRequest = validRequest();

        inputPathRequest.inputPath =
            "D:\\data\\scene.tif" + "\0";

        const inputPathResult =
            validateRasterIndexWorkflowRequest(
                inputPathRequest
            );

        assert.equal(
            inputPathResult.valid,
            false
        );

        assert.ok(
            inputPathResult.errors.some((error) =>
                error.includes(
                    "inputPath must not contain NUL characters"
                )
            )
        );

        const outputDirectoryRequest =
            validRequest();

        outputDirectoryRequest.outputDirectory =
            "D:\\data\\output" + "\0";

        const outputDirectoryResult =
            validateRasterIndexWorkflowRequest(
                outputDirectoryRequest
            );

        assert.equal(
            outputDirectoryResult.valid,
            false
        );

        assert.ok(
            outputDirectoryResult.errors.some((error) =>
                error.includes(
                    "outputDirectory must not contain NUL characters"
                )
            )
        );
    }
);
test(
    "invalid optional fields are rejected",
    () => {
        const request = validRequest();

        request.noData = "invalid";
        request.parameters = [];
        request.processingContext = "invalid";
        request.spatialContext = [];

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, false);
        assert.equal(
            result.errors.length,
            4
        );
    }
);

test(
    "valid optional fields are accepted",
    () => {
        const request = {
            ...validRequest(),

            noData: -9999,

            parameters: {
                L: 0.5
            },

            processingContext: {
                source: "GeoTIFF"
            },

            spatialContext: {
                coordinateSystem: "EPSG:4326"
            }
        };

        const result =
            validateRasterIndexWorkflowRequest(
                request
            );

        assert.equal(result.valid, true);
        assert.deepEqual(result.errors, []);
    }
);

test(
    "non-object request is rejected",
    () => {
        const result =
            validateRasterIndexWorkflowRequest(
                null
            );

        assert.equal(result.valid, false);
        assert.equal(
            result.errors.length,
            1
        );
    }
);

test(
    "request factory creates the expected structure",
    () => {
        const request =
            createRasterIndexWorkflowRequestContract({
                inputPath:
                    "D:\\data\\scene.tif",

                indexCode:
                    "NDVI",

                bandMapping: {
                    Red: 3,
                    NIR: 4
                },

                outputDirectory:
                    "D:\\data\\output",

                noData: -9999,

                parameters: {
                    L: 0.5
                },

                processingContext: {
                    source: "GeoTIFF"
                },

                spatialContext: {
                    coordinateSystem:
                        "EPSG:4326"
                }
            });

        assert.deepEqual(
            request,
            {
                inputPath:
                    "D:\\data\\scene.tif",

                indexCode:
                    "NDVI",

                bandMapping: {
                    Red: 3,
                    NIR: 4
                },

                outputDirectory:
                    "D:\\data\\output",

                noData: -9999,

                parameters: {
                    L: 0.5
                },

                processingContext: {
                    source: "GeoTIFF"
                },

                spatialContext: {
                    coordinateSystem:
                        "EPSG:4326"
                }
            }
        );
    }
);
