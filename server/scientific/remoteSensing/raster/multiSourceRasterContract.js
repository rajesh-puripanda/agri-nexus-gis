"use strict";

// ============================================================
// server/scientific/remoteSensing/raster/multiSourceRasterContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 13.6.2.2.3.1
// Multi-Source Raster Compatibility Contract
//
// Responsibility:
//   Define compatibility requirements for combining multiple
//   independently read raster sources into one normalized raster.
//
// This contract does NOT:
//   - read GeoTIFF files
//   - normalize bands
//   - modify pixel values
//   - calculate indices
//   - classify pixels
//
// ============================================================

const MULTI_SOURCE_RASTER_CONTRACT_VERSION = "1.0";

const REQUIRED_COMPATIBILITY_FIELDS = Object.freeze([
    "width",
    "height",
    "pixelCount",
    "origin",
    "resolution",
    "boundingBox",
    "geoKeys"
]);

function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function assertRasterSources(rasters) {
    if (!Array.isArray(rasters)) {
        throw new TypeError(
            "Raster sources must be an array."
        );
    }

    if (rasters.length === 0) {
        throw new Error(
            "At least one raster source is required."
        );
    }
}

function assertRasterStructure(raster, index) {
    if (!isObject(raster)) {
        throw new TypeError(
            `Raster source at index ${index} must be an object.`
        );
    }

    if (
        !Number.isInteger(raster.width) ||
        raster.width <= 0
    ) {
        throw new Error(
            `Raster source at index ${index} has an invalid width.`
        );
    }

    if (
        !Number.isInteger(raster.height) ||
        raster.height <= 0
    ) {
        throw new Error(
            `Raster source at index ${index} has an invalid height.`
        );
    }

    const expectedPixelCount =
        raster.width * raster.height;

    if (
        !Number.isSafeInteger(
            expectedPixelCount
        )
    ) {
        throw new Error(
            `Raster source at index ${index} has invalid dimensions.`
        );
    }

    if (
        raster.pixelCount !== undefined &&
        raster.pixelCount !== expectedPixelCount
    ) {
        throw new Error(
            `Raster source at index ${index} has an invalid pixelCount.`
        );
    }
}

function assertCoordinateArray(
    value,
    fieldName,
    index
) {
    const isCoordinateArray =
        Array.isArray(value) ||
        ArrayBuffer.isView(value);

    if (
        !isCoordinateArray ||
        value.length === 0
    ) {
        throw new Error(
            `Raster source at index ${index} has an invalid ${fieldName}.`
        );
    }

    for (
        let position = 0;
        position < value.length;
        position += 1
    ) {
        if (!Number.isFinite(value[position])) {
            throw new Error(
                `Raster source at index ${index} has a non-finite ${fieldName} value.`
            );
        }
    }
}

function assertGeoKeys(
    geoKeys,
    index
) {
    if (!isObject(geoKeys)) {
        throw new Error(
            `Raster source at index ${index} has invalid geoKeys.`
        );
    }
}

function valuesEqual(
    left,
    right
) {
    if (
        Array.isArray(left) ||
        ArrayBuffer.isView(left)
    ) {
        if (
            !Array.isArray(right) &&
            !ArrayBuffer.isView(right)
        ) {
            return false;
        }

        if (left.length !== right.length) {
            return false;
        }

        for (
            let index = 0;
            index < left.length;
            index += 1
        ) {
            if (left[index] !== right[index]) {
                return false;
            }
        }

        return true;
    }

    return left === right;
}

function geoKeysEqual(
    left,
    right
) {
    const leftKeys =
        Object.keys(left).sort();

    const rightKeys =
        Object.keys(right).sort();

    if (
        leftKeys.length !==
        rightKeys.length
    ) {
        return false;
    }

    for (
        let index = 0;
        index < leftKeys.length;
        index += 1
    ) {
        const key =
            leftKeys[index];

        if (
            key !== rightKeys[index]
        ) {
            return false;
        }

        if (
            !valuesEqual(
                left[key],
                right[key]
            )
        ) {
            return false;
        }
    }

    return true;
}

function compareRasterCompatibility(
    referenceRaster,
    candidateRaster,
    candidateIndex
) {
    const mismatches = [];

    if (
        referenceRaster.width !==
        candidateRaster.width
    ) {
        mismatches.push(
            "width"
        );
    }

    if (
        referenceRaster.height !==
        candidateRaster.height
    ) {
        mismatches.push(
            "height"
        );
    }

    const referencePixelCount =
        referenceRaster.width *
        referenceRaster.height;

    const candidatePixelCount =
        candidateRaster.width *
        candidateRaster.height;

    if (
        referencePixelCount !==
        candidatePixelCount
    ) {
        mismatches.push(
            "pixelCount"
        );
    }

    if (
        !valuesEqual(
            referenceRaster.origin,
            candidateRaster.origin
        )
    ) {
        mismatches.push(
            "origin"
        );
    }

    if (
        !valuesEqual(
            referenceRaster.resolution,
            candidateRaster.resolution
        )
    ) {
        mismatches.push(
            "resolution"
        );
    }

    if (
        !valuesEqual(
            referenceRaster.boundingBox,
            candidateRaster.boundingBox
        )
    ) {
        mismatches.push(
            "boundingBox"
        );
    }

    if (
        !geoKeysEqual(
            referenceRaster.geoKeys,
            candidateRaster.geoKeys
        )
    ) {
        mismatches.push(
            "geoKeys"
        );
    }

    const referenceNoData =
        referenceRaster.noData;

    const candidateNoData =
        candidateRaster.noData;

    const noDataEqual =
        referenceNoData === candidateNoData ||
        (
            referenceNoData === null &&
            candidateNoData === undefined
        ) ||
        (
            referenceNoData === undefined &&
            candidateNoData === null
        );

    if (!noDataEqual) {
        mismatches.push(
            "noData"
        );
    }

    return {
        compatible:
            mismatches.length === 0,

        candidateIndex,

        mismatches
    };
}

function validateMultiSourceRasterCompatibility(
    rasters
) {
    assertRasterSources(
        rasters
    );

    rasters.forEach(
        assertRasterStructure
    );

    const reference =
        rasters[0];

    assertCoordinateArray(
        reference.origin,
        "origin",
        0
    );

    assertCoordinateArray(
        reference.resolution,
        "resolution",
        0
    );

    assertCoordinateArray(
        reference.boundingBox,
        "boundingBox",
        0
    );

    assertGeoKeys(
        reference.geoKeys,
        0
    );

    const comparisons = [];

    for (
        let index = 1;
        index < rasters.length;
        index += 1
    ) {
        const candidate =
            rasters[index];

        assertCoordinateArray(
            candidate.origin,
            "origin",
            index
        );

        assertCoordinateArray(
            candidate.resolution,
            "resolution",
            index
        );

        assertCoordinateArray(
            candidate.boundingBox,
            "boundingBox",
            index
        );

        assertGeoKeys(
            candidate.geoKeys,
            index
        );

        comparisons.push(
            compareRasterCompatibility(
                reference,
                candidate,
                index
            )
        );
    }

    const incompatible =
        comparisons.filter(
            comparison =>
                !comparison.compatible
        );

    return {
        valid:
            incompatible.length === 0,

        contractVersion:
            MULTI_SOURCE_RASTER_CONTRACT_VERSION,

        sourceCount:
            rasters.length,

        referenceIndex: 0,

        comparisons,

        mismatches:
            incompatible.map(
                comparison => ({
                    candidateIndex:
                        comparison.candidateIndex,
                    fields:
                        comparison.mismatches
                })
            )
    };
}

module.exports = {
    MULTI_SOURCE_RASTER_CONTRACT_VERSION,
    REQUIRED_COMPATIBILITY_FIELDS,
    validateMultiSourceRasterCompatibility
};


