"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validateRasterAlignmentRequest,
    createRasterAlignmentContract
} = require("../scientific/remoteSensing/raster/rasterAlignmentContract");

test("raster alignment contract accepts a valid 20m target grid", () => {
    const request = {
        alignmentMode: "target_resolution",
        resamplingMethod: "nearest_neighbor",
        targetResolution: 20,
        targetGrid: {
            width: 5490,
            height: 5490,
            origin: [699960, 2000040, 0],
            resolution: [20, -20, 0],
            boundingBox: [
                699960,
                1890240,
                809760,
                2000040
            ]
        },
        noData: -9999
    };

    const validation =
        validateRasterAlignmentRequest(request);

    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);

    const contract =
        createRasterAlignmentContract(request);

    assert.equal(
        contract.contractVersion,
        "1.0"
    );

    assert.equal(
        contract.targetResolution,
        20
    );

    assert.equal(
        contract.resamplingMethod,
        "nearest_neighbor"
    );

    assert.deepEqual(
        contract.targetGrid.resolution,
        [20, -20, 0]
    );
});

test("raster alignment contract rejects an unsupported resampling method", () => {
    const request = {
        alignmentMode: "target_resolution",
        resamplingMethod: "bilinear",
        targetResolution: 20,
        targetGrid: {
            width: 10,
            height: 10,
            origin: [0, 100, 0],
            resolution: [20, -20, 0],
            boundingBox: [0, -100, 200, 100]
        },
        noData: -9999
    };

    const validation =
        validateRasterAlignmentRequest(request);

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(
            (error) =>
                error.includes(
                    "resamplingMethod"
                )
        )
    );
});

test("raster alignment contract rejects a non-positive target resolution", () => {
    const request = {
        alignmentMode: "target_resolution",
        resamplingMethod: "nearest_neighbor",
        targetResolution: 0,
        targetGrid: {
            width: 10,
            height: 10,
            origin: [0, 100, 0],
            resolution: [20, -20, 0],
            boundingBox: [0, -100, 200, 100]
        },
        noData: -9999
    };

    const validation =
        validateRasterAlignmentRequest(request);

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(
            (error) =>
                error.includes(
                    "targetResolution"
                )
        )
    );
});

test("raster alignment contract rejects an invalid target grid", () => {
    const request = {
        alignmentMode: "target_resolution",
        resamplingMethod: "nearest_neighbor",
        targetResolution: 20,
        targetGrid: {
            width: 0,
            height: 10,
            origin: [0, 100, 0],
            resolution: [20, -20, 0],
            boundingBox: [0, -100, 200, 100]
        },
        noData: -9999
    };

    const validation =
        validateRasterAlignmentRequest(request);

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(
            (error) =>
                error.includes(
                    "width"
                )
        )
    );
});

test("raster alignment contract requires finite NoData", () => {
    const request = {
        alignmentMode: "target_resolution",
        resamplingMethod: "nearest_neighbor",
        targetResolution: 20,
        targetGrid: {
            width: 10,
            height: 10,
            origin: [0, 100, 0],
            resolution: [20, -20, 0],
            boundingBox: [0, -100, 200, 100]
        },
        noData: NaN
    };

    const validation =
        validateRasterAlignmentRequest(request);

    assert.equal(validation.valid, false);
    assert.ok(
        validation.errors.some(
            (error) =>
                error.includes(
                    "noData"
                )
        )
    );
});
