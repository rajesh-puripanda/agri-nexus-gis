"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    NO_DATA_VALUE,
    calculateBareSoilFrequency
} = require("../services/remoteSensing/temporal/bareSoilFrequencyCalculationService");

function makeRaster(values, noData = -9999) {
    return {
        width: values.length,
        height: 1,
        noData,
        bands: {
            NDVI: { data: values }
        },
        spatialReference: {
            origin: [0, 10],
            resolution: { x: 10, y: 10 },
            boundingBox: [0, 0, values.length * 10, 10],
            geoKeys: { ProjectedCSTypeGeoKey: 32644 }
        }
    };
}

function observation(date, ndviValues, bsiValues) {
    return {
        date,
        ndviRaster: makeRaster(ndviValues),
        bsiRaster: {
            ...makeRaster(bsiValues),
            bands: { BSI: { data: bsiValues } }
        }
    };
}

test("calculates 0%, 50%, and 100% bare-soil frequency", () => {
    const result = calculateBareSoilFrequency({
        observations: [
            observation("2026-09-08", [0.1, 0.1, 0.1], [0.3, 0.1, 0.3]),
            observation("2026-10-03", [0.1, 0.3, 0.1], [0.1, 0.3, 0.4])
        ]
    });

    assert.deepEqual(Array.from(result.data), [50, 0, 100]);
    assert.equal(result.noData, NO_DATA_VALUE);
});

test("marks pixels with no valid paired observations as NoData", () => {
    const result = calculateBareSoilFrequency({
        observations: [
            observation("2026-09-08", [-9999, 0.1], [0.3, -9999]),
            observation("2026-10-03", [-9999, 0.1], [0.3, -9999])
        ]
    });

    assert.deepEqual(Array.from(result.data), [NO_DATA_VALUE, NO_DATA_VALUE]);
});

test("rejects fewer than two observations", () => {
    assert.throws(
        () => calculateBareSoilFrequency({
            observations: [observation("2026-09-08", [0.1], [0.3])]
        }),
        /At least two/
    );
});

test("rejects duplicate dates", () => {
    assert.throws(
        () => calculateBareSoilFrequency({
            observations: [
                observation("2026-09-08", [0.1], [0.3]),
                observation("2026-09-08", [0.1], [0.3])
            ]
        }),
        /distinct/
    );
});

test("rejects mismatched NDVI and BSI grids", () => {
    const item = observation("2026-09-08", [0.1], [0.3]);
    item.bsiRaster.spatialReference.origin = [10, 10];

    assert.throws(
        () => calculateBareSoilFrequency({
            observations: [
                item,
                observation("2026-10-03", [0.1], [0.3])
            ]
        }),
        /grids do not match/
    );
});
