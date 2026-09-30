"use strict";

const {
    decodeSentinel2Jp2Window
} = require("./sentinel2Jp2WindowDecoderService");

const {
    prepareBandSamples
} = require("./sentinel2RadiometricPreparationService");

function assertNonEmptyString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new TypeError(`${fieldName} must be a non-empty string.`);
    }
}

function assertPositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new TypeError(`${fieldName} must be a positive integer.`);
    }
}

function assertFiniteNumber(value, fieldName) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`${fieldName} must be a finite number.`);
    }
}

function assertSameWindow(red, nir) {
    const fields = ["x0", "y0", "x1", "y1"];

    for (const field of fields) {
        if (red.window[field] !== nir.window[field]) {
            throw new Error(
                `Red and NIR decode windows do not match: ${field}.`
            );
        }
    }

    if (
        red.window.width !== nir.window.width ||
        red.window.height !== nir.window.height
    ) {
        throw new Error(
            "Red and NIR decoded window dimensions do not match."
        );
    }
}

async function prepareSentinel2Window({
    redInputPath,
    nirInputPath,
    x0,
    y0,
    x1,
    y1,
    scale,
    offset,
    sourceNoData = 0,
    outputNoData = -9999,
    decodeWindowImpl = decodeSentinel2Jp2Window
} = {}) {
    assertNonEmptyString(redInputPath, "redInputPath");
    assertNonEmptyString(nirInputPath, "nirInputPath");

    assertFiniteNumber(scale, "scale");
    assertFiniteNumber(offset, "offset");
    assertFiniteNumber(sourceNoData, "sourceNoData");
    assertFiniteNumber(outputNoData, "outputNoData");

    const red = await decodeWindowImpl({
        inputPath: redInputPath,
        x0,
        y0,
        x1,
        y1
    });

    const nir = await decodeWindowImpl({
        inputPath: nirInputPath,
        x0,
        y0,
        x1,
        y1
    });

    assertSameWindow(red, nir);

    const pixelCount =
        red.window.width *
        red.window.height;

    assertPositiveInteger(
        pixelCount,
        "decoded pixelCount"
    );

    if (red.samples.length !== pixelCount) {
        throw new Error(
            "Red decoded sample count does not match the window."
        );
    }

    if (nir.samples.length !== pixelCount) {
        throw new Error(
            "NIR decoded sample count does not match the window."
        );
    }

    const preparedRed = prepareBandSamples({
        samples: red.samples,
        scale,
        offset,
        noData: sourceNoData,
        outputNoData,
        bandName: "Red"
    });

    const preparedNir = prepareBandSamples({
        samples: nir.samples,
        scale,
        offset,
        noData: sourceNoData,
        outputNoData,
        bandName: "NIR"
    });

    return {
        window: red.window,
        pixelCount,
        bands: {
            Red: {
                data: preparedRed,
                dataType: "Float32"
            },
            NIR: {
                data: preparedNir,
                dataType: "Float32"
            }
        },
        radiometry: {
            sourceDataType: "UINT16",
            scale,
            offset,
            noData: sourceNoData,
            formula: "physicalValue = DN * scale + offset"
        }
    };
}

module.exports = {
    prepareSentinel2Window,
    assertSameWindow
};