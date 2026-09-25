"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateScalarIndex,
  calculateRemoteSensingIndex,
} = require("../services/remoteSensing/indexCalculationService");

const EPSILON = 1e-12;

function assertApproximately(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < EPSILON,
    message ||
      `Expected ${actual} to be approximately ${expected}.`
  );
}

test("NDVI calculates correctly", () => {
  const value = calculateScalarIndex({
    indexCode: "NDVI",
    inputs: {
      NIR: 0.8,
      Red: 0.2,
    },
  });

  assertApproximately(value, 0.6);
});

test("EVI calculates correctly using registered parameters", () => {
  const value = calculateScalarIndex({
    indexCode: "EVI",
    inputs: {
      NIR: 0.8,
      Red: 0.2,
      Blue: 0.1,
    },
  });

  const expected =
    2.5 *
    (0.8 - 0.2) /
    (0.8 + 6 * 0.2 - 7.5 * 0.1 + 1);

  assertApproximately(value, expected);
});

test("SAVI calculates correctly using registered L", () => {
  const value = calculateScalarIndex({
    indexCode: "SAVI",
    inputs: {
      NIR: 0.8,
      Red: 0.2,
    },
  });

  const expected =
    ((0.8 - 0.2) /
      (0.8 + 0.2 + 0.5)) *
    1.5;

  assertApproximately(value, expected);
});

test("GNDVI calculates correctly", () => {
  const value = calculateScalarIndex({
    indexCode: "GNDVI",
    inputs: {
      NIR: 0.7,
      Green: 0.3,
    },
  });

  assertApproximately(value, 0.4);
});

test("ARVI calculates correctly using registered gamma", () => {
  const value = calculateScalarIndex({
    indexCode: "ARVI",
    inputs: {
      NIR: 0.8,
      Red: 0.2,
      Blue: 0.1,
    },
  });

  const gamma = 1.0;

  const correctedRed =
    0.2 -
    gamma * (0.1 - 0.2);

  const expected =
    (0.8 - correctedRed) /
    (0.8 + correctedRed);

  assertApproximately(value, expected);
});

test("NDWI calculates correctly", () => {
  const value = calculateScalarIndex({
    indexCode: "NDWI",
    inputs: {
      Green: 0.6,
      NIR: 0.2,
    },
  });

  assertApproximately(value, 0.5);
});

test("NDMI calculates correctly", () => {
  const value = calculateScalarIndex({
    indexCode: "NDMI",
    inputs: {
      NIR: 0.6,
      SWIR: 0.2,
    },
  });

  assertApproximately(value, 0.5);
});

test("custom EVI parameters are accepted", () => {
  const value = calculateScalarIndex({
    indexCode: "EVI",
    inputs: {
      NIR: 0.7,
      Red: 0.2,
      Blue: 0.1,
    },
    parameters: {
      G: 2.5,
      C1: 6,
      C2: 7.5,
      L: 1,
    },
  });

  assert.ok(Number.isFinite(value));
});

test("non-finite band values are rejected", () => {
  assert.throws(
    () =>
      calculateScalarIndex({
        indexCode: "NDVI",
        inputs: {
          NIR: NaN,
          Red: 0.2,
        },
      }),
    /Band NIR must be a finite number/
  );
});

test("normalized-difference zero denominator is rejected", () => {
  assert.throws(
    () =>
      calculateScalarIndex({
        indexCode: "NDVI",
        inputs: {
          NIR: 0,
          Red: 0,
        },
      }),
    /NIR \+ Red equals zero/
  );
});

test("EVI zero denominator is rejected", () => {
  assert.throws(
    () =>
      calculateScalarIndex({
        indexCode: "EVI",
        inputs: {
          NIR: 0,
          Red: 0,
          Blue: 0,
        },
        parameters: {
          G: 2.5,
          C1: 6,
          C2: 7.5,
          L: 0,
        },
      }),
    /EVI: denominator equals zero/
  );
});

test("unknown index is rejected", () => {
  assert.throws(
    () =>
      calculateScalarIndex({
        indexCode: "UNKNOWN",
        inputs: {},
      }),
    /Unknown remote sensing index/
  );
});

test("missing registered input is rejected before calculation", () => {
  assert.throws(
    () =>
      calculateRemoteSensingIndex({
        indexCode: "NDVI",
        inputs: {
          NIR: 0.8,
        },
      }),
    /NDVI: missing required input band: Red/
  );
});

test("public calculation function returns index metadata", () => {
  const result =
    calculateRemoteSensingIndex({
      indexCode: "NDVI",
      inputs: {
        NIR: 0.8,
        Red: 0.2,
      },
    });

  assert.equal(result.indexCode, "NDVI");

  assertApproximately(
    result.value,
    0.6
  );

  assert.deepEqual(
    result.validRange,
    {
      min: -1,
      max: 1,
    }
  );
});
