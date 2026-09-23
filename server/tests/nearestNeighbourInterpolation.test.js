"use strict";

// ============================================================
// server/tests/nearestNeighbourInterpolation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Nearest-Neighbour Interpolation Tests
//
// Test coverage:
//   1. Numeric validation
//   2. Sample validation
//   3. Sample-array validation
//   4. Target validation
//   5. Distance-vector construction
//   6. Nearest-sample selection
//   7. Minimum-distance calculation
//   8. Prediction calculation
//   9. Prediction validation
//  10. Full nearest-neighbour interpolation
//  11. Exact sample reproduction
//  12. Single-sample interpolation
//  13. Multiple-sample selection
//  14. Tie handling
//  15. Zero-distance handling
//  16. Negative and zero values
//  17. Constant values
//  18. Invalid inputs
//  19. Input immutability
//  20. Result diagnostics
//  21. Alias equivalence
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MIN_SAMPLE_COUNT,
  METHOD_IDENTIFIER,
  isFiniteNumericValue,
  validateSample,
  validateSamples,
  validateTarget,
  buildNearestNeighbourDistances,
  findNearestSampleIndex,
  findNearestSampleDistance,
  calculateNearestNeighbourPrediction,
  validatePrediction,
  interpolateNearestNeighbour,
  nearestNeighbourInterpolation,
} = require("../services/interpolation/nearestNeighbourInterpolation");

/* ============================================================
   TEST DATA
   ============================================================ */

function createSamples() {
  return [
    {
      latitude: 17.700000,
      longitude: 83.300000,
      value: 100,
    },
    {
      latitude: 17.710000,
      longitude: 83.310000,
      value: 200,
    },
    {
      latitude: 17.720000,
      longitude: 83.320000,
      value: 300,
    },
  ];
}

function createSingleSample() {
  return [
    {
      latitude: 17.700000,
      longitude: 83.300000,
      value: 150,
    },
  ];
}

/* ============================================================
   isFiniteNumericValue()
   ============================================================ */

test.describe("isFiniteNumericValue()", () => {
  test("accepts positive finite numbers", () => {
    assert.equal(isFiniteNumericValue(123.456), true);
  });

  test("accepts negative finite numbers", () => {
    assert.equal(isFiniteNumericValue(-123.456), true);
  });

  test("accepts zero", () => {
    assert.equal(isFiniteNumericValue(0), true);
  });

  test("rejects NaN", () => {
    assert.equal(isFiniteNumericValue(Number.NaN), false);
  });

  test("rejects Infinity", () => {
    assert.equal(isFiniteNumericValue(Infinity), false);
  });

  test("rejects negative Infinity", () => {
    assert.equal(isFiniteNumericValue(-Infinity), false);
  });

  test("rejects numeric strings", () => {
    assert.equal(isFiniteNumericValue("123"), false);
  });

  test("rejects null", () => {
    assert.equal(isFiniteNumericValue(null), false);
  });

  test("rejects undefined", () => {
    assert.equal(isFiniteNumericValue(undefined), false);
  });
});

/* ============================================================
   validateSample()
   ============================================================ */

test.describe("validateSample()", () => {
  test("accepts a valid sample", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: 125,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("accepts a sample with a zero value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: 0,
    });

    assert.equal(result.valid, true);
  });

  test("accepts a sample with a negative value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: -15.5,
    });

    assert.equal(result.valid, true);
  });

  test("rejects a null sample", () => {
    const result = validateSample(null);

    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test("rejects a non-object sample", () => {
    const result = validateSample("sample");

    assert.equal(result.valid, false);
  });

  test("rejects an array as a sample", () => {
    const result = validateSample([]);

    assert.equal(result.valid, false);
  });

  test("rejects missing latitude", () => {
    const result = validateSample({
      longitude: 83.3,
      value: 100,
    });

    assert.equal(result.valid, false);
  });

  test("rejects missing longitude", () => {
    const result = validateSample({
      latitude: 17.7,
      value: 100,
    });

    assert.equal(result.valid, false);
  });

  test("rejects missing value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
    });

    assert.equal(result.valid, false);
  });

  test("rejects non-numeric latitude", () => {
    const result = validateSample({
      latitude: "17.7",
      longitude: 83.3,
      value: 100,
    });

    assert.equal(result.valid, false);
  });

  test("rejects non-numeric longitude", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: "83.3",
      value: 100,
    });

    assert.equal(result.valid, false);
  });

  test("rejects non-numeric value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: "100",
    });

    assert.equal(result.valid, false);
  });

  test("rejects NaN value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: Number.NaN,
    });

    assert.equal(result.valid, false);
  });

  test("rejects infinite value", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 83.3,
      value: Infinity,
    });

    assert.equal(result.valid, false);
  });

  test("rejects invalid latitude", () => {
    const result = validateSample({
      latitude: 91,
      longitude: 83.3,
      value: 100,
    });

    assert.equal(result.valid, false);
  });

  test("rejects invalid longitude", () => {
    const result = validateSample({
      latitude: 17.7,
      longitude: 181,
      value: 100,
    });

    assert.equal(result.valid, false);
  });
});

/* ============================================================
   validateSamples()
   ============================================================ */

test.describe("validateSamples()", () => {
  test("accepts one valid sample", () => {
    const result = validateSamples(createSingleSample());

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("accepts three valid samples", () => {
    const result = validateSamples(createSamples());

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("accepts more than three samples", () => {
    const samples = [
      ...createSamples(),
      {
        latitude: 17.73,
        longitude: 83.33,
        value: 400,
      },
    ];

    const result = validateSamples(samples);

    assert.equal(result.valid, true);
  });

  test("rejects non-array input", () => {
    const result = validateSamples(null);

    assert.equal(result.valid, false);
  });

  test("rejects an empty sample array", () => {
    const result = validateSamples([]);

    assert.equal(result.valid, false);
  });

  test("reports invalid samples", () => {
    const result = validateSamples([
      {
        latitude: 17.7,
        longitude: 83.3,
        value: 100,
      },
      {
        latitude: 17.7,
        longitude: 83.3,
        value: Number.NaN,
      },
    ]);

    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test("uses one as the minimum sample count", () => {
    assert.equal(MIN_SAMPLE_COUNT, 1);
  });
});

/* ============================================================
   validateTarget()
   ============================================================ */

test.describe("validateTarget()", () => {
  test("accepts a valid target", () => {
    const result = validateTarget({
      latitude: 17.705,
      longitude: 83.305,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test("rejects null target", () => {
    const result = validateTarget(null);

    assert.equal(result.valid, false);
  });

  test("rejects a non-object target", () => {
    const result = validateTarget("target");

    assert.equal(result.valid, false);
  });

  test("rejects an array target", () => {
    const result = validateTarget([]);

    assert.equal(result.valid, false);
  });

  test("rejects missing latitude", () => {
    const result = validateTarget({
      longitude: 83.3,
    });

    assert.equal(result.valid, false);
  });

  test("rejects missing longitude", () => {
    const result = validateTarget({
      latitude: 17.7,
    });

    assert.equal(result.valid, false);
  });

  test("rejects invalid latitude", () => {
    const result = validateTarget({
      latitude: 91,
      longitude: 83.3,
    });

    assert.equal(result.valid, false);
  });

  test("rejects invalid longitude", () => {
    const result = validateTarget({
      latitude: 17.7,
      longitude: 181,
    });

    assert.equal(result.valid, false);
  });

  test("rejects non-numeric latitude", () => {
    const result = validateTarget({
      latitude: "17.7",
      longitude: 83.3,
    });

    assert.equal(result.valid, false);
  });

  test("rejects non-numeric longitude", () => {
    const result = validateTarget({
      latitude: 17.7,
      longitude: "83.3",
    });

    assert.equal(result.valid, false);
  });
});

/* ============================================================
   buildNearestNeighbourDistances()
   ============================================================ */

test.describe("buildNearestNeighbourDistances()", () => {
  test("builds one distance for one sample", () => {
    const samples = createSingleSample();

    const distances = buildNearestNeighbourDistances(
      {
        latitude: 17.705,
        longitude: 83.305,
      },
      samples,
    );

    assert.equal(distances.length, 1);
    assert.ok(Number.isFinite(distances[0]));
  });

  test("builds one distance for every sample", () => {
    const samples = createSamples();

    const distances = buildNearestNeighbourDistances(
      {
        latitude: 17.705,
        longitude: 83.305,
      },
      samples,
    );

    assert.equal(distances.length, samples.length);
    assert.ok(distances.every(Number.isFinite));
  });

  test("returns zero distance at an exact sample location", () => {
    const samples = createSamples();

    const distances = buildNearestNeighbourDistances(
      {
        latitude: samples[0].latitude,
        longitude: samples[0].longitude,
      },
      samples,
    );

    assert.equal(distances[0], 0);
  });

  test("does not mutate the samples", () => {
    const samples = createSamples();
    const original = structuredClone(samples);

    buildNearestNeighbourDistances(
      {
        latitude: 17.705,
        longitude: 83.305,
      },
      samples,
    );

    assert.deepEqual(samples, original);
  });
});

/* ============================================================
   findNearestSampleIndex()
   ============================================================ */

test.describe("findNearestSampleIndex()", () => {
  test("returns the index of the smallest distance", () => {
    const index = findNearestSampleIndex([
      100,
      25,
      50,
    ]);

    assert.equal(index, 1);
  });

  test("returns index zero when first distance is smallest", () => {
    const index = findNearestSampleIndex([
      10,
      20,
      30,
    ]);

    assert.equal(index, 0);
  });

  test("returns the last index when the last distance is smallest", () => {
    const index = findNearestSampleIndex([
      30,
      20,
      10,
    ]);

    assert.equal(index, 2);
  });

  test("selects the first sample when distances are tied", () => {
    const index = findNearestSampleIndex([
      100,
      100,
      200,
    ]);

    assert.equal(index, 0);
  });
});

/* ============================================================
   findNearestSampleDistance()
   ============================================================ */

test.describe("findNearestSampleDistance()", () => {
  test("returns the minimum distance", () => {
    const distance = findNearestSampleDistance([
      100,
      25,
      50,
    ]);

    assert.equal(distance, 25);
  });

  test("returns zero when an exact sample location is present", () => {
    const distance = findNearestSampleDistance([
      100,
      0,
      50,
    ]);

    assert.equal(distance, 0);
  });
});

/* ============================================================
   calculateNearestNeighbourPrediction()
   ============================================================ */

test.describe("calculateNearestNeighbourPrediction()", () => {
  test("returns the nearest sample value", () => {
    const prediction = calculateNearestNeighbourPrediction({
      latitude: 17.7,
      longitude: 83.3,
      value: 250,
    });

    assert.equal(prediction, 250);
  });

  test("returns zero for a zero-valued sample", () => {
    const prediction = calculateNearestNeighbourPrediction({
      latitude: 17.7,
      longitude: 83.3,
      value: 0,
    });

    assert.equal(prediction, 0);
  });

  test("preserves negative sample values", () => {
    const prediction = calculateNearestNeighbourPrediction({
      latitude: 17.7,
      longitude: 83.3,
      value: -25,
    });

    assert.equal(prediction, -25);
  });
});

/* ============================================================
   validatePrediction()
   ============================================================ */

test.describe("validatePrediction()", () => {
  test("accepts a finite prediction", () => {
    assert.equal(validatePrediction(123.45), true);
  });

  test("accepts zero", () => {
    assert.equal(validatePrediction(0), true);
  });

  test("accepts negative values", () => {
    assert.equal(validatePrediction(-20), true);
  });

  test("rejects NaN", () => {
    assert.equal(validatePrediction(Number.NaN), false);
  });

  test("rejects Infinity", () => {
    assert.equal(validatePrediction(Infinity), false);
  });
});

/* ============================================================
   interpolateNearestNeighbour()
   ============================================================ */

test.describe("interpolateNearestNeighbour()", () => {
  test("interpolates a single-sample dataset", () => {
    const result = interpolateNearestNeighbour(
      createSingleSample(),
      {
        latitude: 17.8,
        longitude: 83.4,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 150);
  });

  test("selects the nearest sample", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.719,
        longitude: 83.319,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 300);
    assert.equal(result.nearestSample.index, 2);
  });

  test("selects the first sample when it is nearest", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.701,
        longitude: 83.301,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 100);
    assert.equal(result.nearestSample.index, 0);
  });

  test("selects the second sample when it is nearest", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.709,
        longitude: 83.309,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 200);
    assert.equal(result.nearestSample.index, 1);
  });

  test("reproduces the first sample exactly", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: samples[0].latitude,
        longitude: samples[0].longitude,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, samples[0].value);
    assert.equal(result.nearestSample.index, 0);
    assert.equal(result.nearestSample.distanceMetres, 0);
  });

  test("reproduces the second sample exactly", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: samples[1].latitude,
        longitude: samples[1].longitude,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, samples[1].value);
    assert.equal(result.nearestSample.index, 1);
    assert.equal(result.nearestSample.distanceMetres, 0);
  });

  test("reproduces the third sample exactly", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: samples[2].latitude,
        longitude: samples[2].longitude,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, samples[2].value);
    assert.equal(result.nearestSample.index, 2);
    assert.equal(result.nearestSample.distanceMetres, 0);
  });

  test("produces a finite prediction", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.ok(Number.isFinite(result.prediction));
  });

  test("preserves negative values", () => {
    const samples = [
      {
        latitude: 17.7,
        longitude: 83.3,
        value: -100,
      },
      {
        latitude: 17.8,
        longitude: 83.4,
        value: -200,
      },
    ];

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.701,
        longitude: 83.301,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, -100);
  });

  test("preserves zero values", () => {
    const samples = [
      {
        latitude: 17.7,
        longitude: 83.3,
        value: 0,
      },
      {
        latitude: 17.8,
        longitude: 83.4,
        value: 100,
      },
    ];

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.701,
        longitude: 83.301,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 0);
  });

  test("handles constant sample values", () => {
    const samples = [
      {
        latitude: 17.7,
        longitude: 83.3,
        value: 50,
      },
      {
        latitude: 17.71,
        longitude: 83.31,
        value: 50,
      },
      {
        latitude: 17.72,
        longitude: 83.32,
        value: 50,
      },
    ];

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.prediction, 50);
  });

  test("returns the nearest sample metadata", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: samples[1].latitude,
        longitude: samples[1].longitude,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.nearestSample.index, 1);
    assert.equal(
      result.nearestSample.latitude,
      samples[1].latitude,
    );
    assert.equal(
      result.nearestSample.longitude,
      samples[1].longitude,
    );
    assert.equal(
      result.nearestSample.value,
      samples[1].value,
    );
    assert.equal(result.nearestSample.distanceMetres, 0);
  });

  test("returns the correct sample count", () => {
    const samples = createSamples();

    const result = interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.sampleCount, 3);
  });

  test("returns the correct method identifier", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.method, "nearest_neighbour");
    assert.equal(result.method, METHOD_IDENTIFIER);
  });

  test("reports no weighting", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.diagnostics.weighting, "none");
  });

  test("reports no smoothing", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.diagnostics.smoothing, false);
  });

  test("reports deterministic tie handling", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.705,
        longitude: 83.305,
      },
    );

    assert.equal(result.success, true);
    assert.equal(
      result.diagnostics.tieHandling,
      "first_minimum_distance",
    );
  });

  test("returns a finite nearest-sample distance", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.ok(
      Number.isFinite(result.nearestSample.distanceMetres),
    );
  });

  test("rejects empty samples", () => {
    const result = interpolateNearestNeighbour([], {
      latitude: 17.7,
      longitude: 83.3,
    });

    assert.equal(result.success, false);
  });

  test("rejects null samples", () => {
    const result = interpolateNearestNeighbour(null, {
      latitude: 17.7,
      longitude: 83.3,
    });

    assert.equal(result.success, false);
  });

  test("rejects invalid sample values", () => {
    const result = interpolateNearestNeighbour(
      [
        {
          latitude: 17.7,
          longitude: 83.3,
          value: Number.NaN,
        },
      ],
      {
        latitude: 17.7,
        longitude: 83.3,
      },
    );

    assert.equal(result.success, false);
  });

  test("rejects invalid sample coordinates", () => {
    const result = interpolateNearestNeighbour(
      [
        {
          latitude: 91,
          longitude: 83.3,
          value: 100,
        },
      ],
      {
        latitude: 17.7,
        longitude: 83.3,
      },
    );

    assert.equal(result.success, false);
  });

  test("rejects null target", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      null,
    );

    assert.equal(result.success, false);
  });

  test("rejects invalid target latitude", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 91,
        longitude: 83.3,
      },
    );

    assert.equal(result.success, false);
  });

  test("rejects invalid target longitude", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.7,
        longitude: 181,
      },
    );

    assert.equal(result.success, false);
  });

  test("does not mutate the samples", () => {
    const samples = createSamples();
    const original = structuredClone(samples);

    interpolateNearestNeighbour(
      samples,
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.deepEqual(samples, original);
  });

  test("does not mutate the target", () => {
    const samples = createSamples();

    const target = {
      latitude: 17.715,
      longitude: 83.315,
    };

    const original = structuredClone(target);

    interpolateNearestNeighbour(samples, target);

    assert.deepEqual(target, original);
  });

  test("supports the nearestNeighbourInterpolation alias", () => {
    const samples = createSamples();

    const target = {
      latitude: 17.715,
      longitude: 83.315,
    };

    const resultA = interpolateNearestNeighbour(
      samples,
      target,
    );

    const resultB = nearestNeighbourInterpolation(
      samples,
      target,
    );

    assert.deepEqual(resultB, resultA);
  });

  test("returns target coordinates unchanged", () => {
    const target = {
      latitude: 17.715,
      longitude: 83.315,
    };

    const result = interpolateNearestNeighbour(
      createSamples(),
      target,
    );

    assert.equal(result.success, true);
    assert.deepEqual(result.target, target);
  });

  test("uses the local Euclidean distance metric", () => {
    const result = interpolateNearestNeighbour(
      createSamples(),
      {
        latitude: 17.715,
        longitude: 83.315,
      },
    );

    assert.equal(result.success, true);
    assert.equal(
      result.diagnostics.distanceMetric,
      "local_euclidean",
    );
  });
});