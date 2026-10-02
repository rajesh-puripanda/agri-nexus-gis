"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validateMultiSourceRasterIndexWorkflowRequest
} = require(
    "../scientific/remoteSensing/raster/" +
    "multiSourceRasterIndexWorkflowRequestContract"
);

test(
    "validates a mixed-resolution NDMI multi-source request",
    () => {
        const validation =
            validateMultiSourceRasterIndexWorkflowRequest({
                indexCode: "NDMI",
                targetResolution: 20,
                sources: [
                    {
                        band: "NIR",
                        inputPath: "nir.tif"
                    },
                    {
                        band: "SWIR",
                        inputPath: "swir.tif"
                    }
                ]
            });

        assert.equal(validation.valid, true);
        assert.equal(validation.indexCode, "NDMI");
        assert.deepEqual(validation.errors, []);
    }
);

test(
    "rejects NDMI when SWIR is missing",
    () => {
        const validation =
            validateMultiSourceRasterIndexWorkflowRequest({
                indexCode: "NDMI",
                targetResolution: 20,
                sources: [
                    {
                        band: "NIR",
                        inputPath: "nir.tif"
                    }
                ]
            });

        assert.equal(validation.valid, false);

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "missing required band"
                    ) &&
                    error.includes("SWIR")
            )
        );
    }
);

test(
    "rejects non-positive target resolution",
    () => {
        const validation =
            validateMultiSourceRasterIndexWorkflowRequest({
                indexCode: "NDMI",
                targetResolution: 0,
                sources: [
                    {
                        band: "NIR",
                        inputPath: "nir.tif"
                    },
                    {
                        band: "SWIR",
                        inputPath: "swir.tif"
                    }
                ]
            });

        assert.equal(validation.valid, false);

        assert.ok(
            validation.errors.some(
                error =>
                    error.includes(
                        "targetResolution"
                    )
            )
        );
    }
);
