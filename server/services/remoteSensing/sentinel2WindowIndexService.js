"use strict";

const {
    calculateRemoteSensingIndex
} = require("./indexCalculationService");

function assertPreparedBand(band, bandName, expectedPixelCount) {
    if (!band || typeof band !== "object") {
        throw new TypeError(
            `${bandName} band is required.`
        );
    }

    if (!(band.data instanceof Float32Array)) {
        throw new TypeError(
            `${bandName} band data must be Float32Array.`
        );
    }

    if (band.dataType !== "Float32") {
        throw new TypeError(
            `${bandName} band dataType must be Float32.`
        );
    }

    if (band.data.length !== expectedPixelCount) {
        throw new RangeError(
            `${bandName} band must contain exactly ` +
            `${expectedPixelCount} pixels.`
        );
    }
}

function calculateSentinel2NdviWindow({
    red,
    nir,
    pixelCount,
    noData = -9999,
    calculateIndexImpl = calculateRemoteSensingIndex
} = {}) {
    if (!Number.isInteger(pixelCount) || pixelCount <= 0) {
        throw new TypeError(
            "pixelCount must be a positive integer."
        );
    }

    if (
        typeof noData !== "number" ||
        !Number.isFinite(noData)
    ) {
        throw new TypeError(
            "noData must be a finite number."
        );
    }

    assertPreparedBand(
        red,
        "Red",
        pixelCount
    );

    assertPreparedBand(
        nir,
        "NIR",
        pixelCount
    );

    const output =
        new Float32Array(pixelCount);

    let validPixelCount = 0;
    let noDataPixelCount = 0;

    for (let index = 0; index < pixelCount; index += 1) {
        const redValue = red.data[index];
        const nirValue = nir.data[index];

        if (
            redValue === noData ||
            nirValue === noData
        ) {
            output[index] = noData;
            noDataPixelCount += 1;
            continue;
        }

        const result =
            calculateIndexImpl({
                indexCode: "NDVI",
                inputs: {
                    Red: redValue,
                    NIR: nirValue
                }
            });

        if (
            !result ||
            typeof result.value !== "number" ||
            !Number.isFinite(result.value)
        ) {
            throw new Error(
                `NDVI calculation returned an invalid value ` +
                `at pixel ${index}.`
            );
        }

        output[index] = result.value;
        validPixelCount += 1;
    }

    return {
        indexCode: "NDVI",
        dataType: "Float32",
        data: output,
        pixelCount,
        validPixelCount,
        noDataPixelCount,
        noData
    };
}

module.exports = {
    calculateSentinel2NdviWindow
};