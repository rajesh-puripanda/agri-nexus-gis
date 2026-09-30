"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculateSentinel2NdviWindow
} = require("../services/remoteSensing/sentinel2WindowIndexService");

test(
    "calculates NDVI window through the authoritative index engine",
    () => {
        const red = {
            dataType: "Float32",
            data: new Float32Array([
                0.2,
                0.4,
                0.5,
                0.8
            ])
        };

        const nir = {
            dataType: "Float32",
            data: new Float32Array([
                0.6,
                0.6,
                0.3,
                0.4
            ])
        };

        const result =
            calculateSentinel2NdviWindow({
                red,
                nir,
                pixelCount: 4
            });

        assert.equal(result.indexCode, "NDVI");
        assert.equal(result.dataType, "Float32");
        assert.equal(result.pixelCount, 4);
        assert.equal(result.validPixelCount, 4);
        assert.equal(result.noDataPixelCount, 0);

        assert.deepEqual(
            Array.from(result.data).map(value =>
                Number(value.toFixed(6))
            ),
            [
                0.5,
                0.2,
                -0.25,
                -0.333333
            ]
        );
    }
);

test(
    "preserves NoData pixels without calling the index engine",
    () => {
        const red = {
            dataType: "Float32",
            data: new Float32Array([
                0.2,
                -9999,
                0.5,
                -9999
            ])
        };

        const nir = {
            dataType: "Float32",
            data: new Float32Array([
                0.6,
                0.7,
                -9999,
                -9999
            ])
        };

        let calculationCount = 0;

        const result =
            calculateSentinel2NdviWindow({
                red,
                nir,
                pixelCount: 4,
                calculateIndexImpl(request) {
                    calculationCount += 1;

                    assert.equal(
                        request.indexCode,
                        "NDVI"
                    );

                    return {
                        indexCode: "NDVI",
                        value:
                            (request.inputs.NIR -
                                request.inputs.Red) /
                            (request.inputs.NIR +
                                request.inputs.Red)
                    };
                }
            });

        assert.equal(calculationCount, 1);

        assert.equal(result.validPixelCount, 1);
        assert.equal(result.noDataPixelCount, 3);

        assert.deepEqual(
            Array.from(result.data).map(value =>
                Number(value.toFixed(6))
            ),
            [
                0.5,
                -9999,
                -9999,
                -9999
            ]
        );
    }
);

test(
    "rejects a non-Float32 Red band",
    () => {
        assert.throws(
            () =>
                calculateSentinel2NdviWindow({
                    red: {
                        dataType: "UINT16",
                        data: new Uint16Array([100, 200])
                    },
                    nir: {
                        dataType: "Float32",
                        data: new Float32Array([
                            0.3,
                            0.4
                        ])
                    },
                    pixelCount: 2
                }),
            /Red band data must be Float32Array/
        );
    }
);

test(
    "rejects a non-Float32 NIR band",
    () => {
        assert.throws(
            () =>
                calculateSentinel2NdviWindow({
                    red: {
                        dataType: "Float32",
                        data: new Float32Array([
                            0.2,
                            0.3
                        ])
                    },
                    nir: {
                        dataType: "UINT16",
                        data: new Uint16Array([100, 200])
                    },
                    pixelCount: 2
                }),
            /NIR band data must be Float32Array/
        );
    }
);

test(
    "rejects mismatched pixel counts",
    () => {
        assert.throws(
            () =>
                calculateSentinel2NdviWindow({
                    red: {
                        dataType: "Float32",
                        data: new Float32Array([
                            0.2,
                            0.3
                        ])
                    },
                    nir: {
                        dataType: "Float32",
                        data: new Float32Array([
                            0.4
                        ])
                    },
                    pixelCount: 2
                }),
            /NIR band must contain exactly 2 pixels/
        );
    }
);

test(
    "rejects invalid pixelCount",
    () => {
        assert.throws(
            () =>
                calculateSentinel2NdviWindow({
                    red: {
                        dataType: "Float32",
                        data: new Float32Array([0.2])
                    },
                    nir: {
                        dataType: "Float32",
                        data: new Float32Array([0.4])
                    },
                    pixelCount: 0
                }),
            /pixelCount must be a positive integer/
        );
    }
);
