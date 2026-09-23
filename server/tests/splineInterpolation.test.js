"use strict";

// ============================================================
// server/tests/splineInterpolation.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Tests for:
//   server/services/interpolation/splineInterpolation.js
//
// Scientific method:
//   2-D Thin-Plate Spline interpolation
//
// ============================================================

const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  MIN_SAMPLE_COUNT,
  POLYNOMIAL_DIMENSION,
  DEFAULT_PIVOT_TOLERANCE,

  isFiniteNumber,

  validateSample,
  validateSamples,
  validateTarget,

  buildLocalCoordinatePoints,
  buildLocalTargetCoordinate,

  buildSplineRightHandSide,

  extractSplineSolution,

  calculateSplinePrediction,

  validatePrediction,

  calculateSplineResidualDiagnostics,

  interpolateSpline,
  splineInterpolation,
} = require("../services/interpolation/splineInterpolation");

// ------------------------------------------------------------
// Test data
// ------------------------------------------------------------

function createThreePointSamples() {
  return [
    {
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 20,
    },
    {
      sample_code: "S-003",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 30,
    },
  ];
}

function createFourPointSamples() {
  return [
    {
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 20,
    },
    {
      sample_code: "S-003",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 30,
    },
    {
      sample_code: "S-004",
      latitude: 17.7100,
      longitude: 83.3100,
      value: 40,
    },
  ];
}

function createConstantSamples() {
  return [
    {
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 25,
    },
    {
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 25,
    },
    {
      sample_code: "S-003",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 25,
    },
    {
      sample_code: "S-004",
      latitude: 17.7100,
      longitude: 83.3100,
      value: 25,
    },
  ];
}

function createRealWorldElectricalConductivitySamples() {
  return [
    {
      sample_code: "S-009",
      latitude: 17.775,
      longitude: 83.300,
      value: 0.60,
    },
    {
      sample_code: "S-008",
      latitude: 17.700,
      longitude: 83.360,
      value: 0.45,
    },
    {
      sample_code: "S-007",
      latitude: 17.745,
      longitude: 83.295,
      value: 0.00,
    },
    {
      sample_code: "S-006",
      latitude: 17.720,
      longitude: 83.270,
      value: 0.28,
    },
    {
      sample_code: "S-005",
      latitude: 17.680,
      longitude: 83.330,
      value: 0.42,
    },
    {
      sample_code: "S-004",
      latitude: 17.760,
      longitude: 83.350,
      value: 1.85,
    },
    {
      sample_code: "S-003",
      latitude: 17.695,
      longitude: 83.280,
      value: 0.80,
    },
    {
      sample_code: "S-002",
      latitude: 17.735,
      longitude: 83.315,
      value: 0.35,
    },
    {
      sample_code: "S-001",
      latitude: 17.71234,
      longitude: 83.30125,
      value: 0.35,
    },
  ];
}

function createCollinearSamples() {
  return [
    {
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      sample_code: "S-002",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 20,
    },
    {
      sample_code: "S-003",
      latitude: 17.7200,
      longitude: 83.3000,
      value: 30,
    },
  ];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ============================================================
// isFiniteNumber()
// ============================================================

describe("isFiniteNumber()", () => {
  it("accepts positive finite numbers", () => {
    const result = isFiniteNumber(10);

    assert.strictEqual(result, true);
  });

  it("accepts negative finite numbers", () => {
    const result = isFiniteNumber(-10.5);

    assert.strictEqual(result, true);
  });

  it("accepts zero", () => {
    const result = isFiniteNumber(0);

    assert.strictEqual(result, true);
  });

  it("rejects NaN", () => {
    const result = isFiniteNumber(NaN);

    assert.strictEqual(result, false);
  });

  it("rejects Infinity", () => {
    const result = isFiniteNumber(Infinity);

    assert.strictEqual(result, false);
  });

  it("rejects strings", () => {
    const result = isFiniteNumber("10");

    assert.strictEqual(result, false);
  });

  it("rejects null", () => {
    const result = isFiniteNumber(null);

    assert.strictEqual(result, false);
  });
});

// ============================================================
// validateSample()
// ============================================================

describe("validateSample()", () => {
  it("accepts a valid sample", () => {
    const result = validateSample(
      createThreePointSamples()[0],
      0,
    );

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("rejects a null sample", () => {
    const result = validateSample(null, 0);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("rejects a non-object sample", () => {
    const result = validateSample("sample", 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects missing latitude", () => {
    const sample = {
      longitude: 83.3,
      value: 10,
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects missing longitude", () => {
    const sample = {
      latitude: 17.7,
      value: 10,
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects non-numeric value", () => {
    const sample = {
      latitude: 17.7,
      longitude: 83.3,
      value: "10",
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects NaN value", () => {
    const sample = {
      latitude: 17.7,
      longitude: 83.3,
      value: NaN,
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects infinite value", () => {
    const sample = {
      latitude: 17.7,
      longitude: 83.3,
      value: Infinity,
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });

  it("rejects invalid geographic coordinates", () => {
    const sample = {
      latitude: 95,
      longitude: 83.3,
      value: 10,
    };

    const result = validateSample(sample, 0);

    assert.strictEqual(result.valid, false);
  });
});

// ============================================================
// validateSamples()
// ============================================================

describe("validateSamples()", () => {
  it("accepts three valid samples", () => {
    const result = validateSamples(
      createThreePointSamples(),
    );

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("accepts more than three samples", () => {
    const result = validateSamples(
      createFourPointSamples(),
    );

    assert.strictEqual(result.valid, true);
  });

  it("rejects non-array input", () => {
    const result = validateSamples(null);

    assert.strictEqual(result.valid, false);
  });

  it("rejects fewer than three samples", () => {
    const samples =
      createThreePointSamples().slice(0, 2);

    const result = validateSamples(samples);

    assert.strictEqual(result.valid, false);

    assert.ok(
      result.errors.some((error) =>
        error.includes(
          `${MIN_SAMPLE_COUNT}`,
        ),
      ),
    );
  });

  it("rejects an empty sample array", () => {
    const result = validateSamples([]);

    assert.strictEqual(result.valid, false);
  });

  it("reports invalid samples", () => {
    const samples =
      createThreePointSamples();

    samples[1].value = "invalid";

    const result = validateSamples(samples);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});

// ============================================================
// validateTarget()
// ============================================================

describe("validateTarget()", () => {
  it("accepts a valid target", () => {
    const result = validateTarget({
      latitude: 17.705,
      longitude: 83.305,
    });

    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it("rejects null target", () => {
    const result = validateTarget(null);

    assert.strictEqual(result.valid, false);
  });

  it("rejects missing latitude", () => {
    const result = validateTarget({
      longitude: 83.305,
    });

    assert.strictEqual(result.valid, false);
  });

  it("rejects missing longitude", () => {
    const result = validateTarget({
      latitude: 17.705,
    });

    assert.strictEqual(result.valid, false);
  });

  it("rejects invalid latitude", () => {
    const result = validateTarget({
      latitude: 95,
      longitude: 83.305,
    });

    assert.strictEqual(result.valid, false);
  });

  it("rejects invalid longitude", () => {
    const result = validateTarget({
      latitude: 17.705,
      longitude: 200,
    });

    assert.strictEqual(result.valid, false);
  });
});

// ============================================================
// buildLocalCoordinatePoints()
// ============================================================

describe("buildLocalCoordinatePoints()", () => {
  it("builds local coordinates for all samples", () => {
    const samples =
      createThreePointSamples();

    const origin = {
      latitude: samples[0].latitude,
      longitude: samples[0].longitude,
    };

    const points =
      buildLocalCoordinatePoints(
        samples,
        origin,
      );

    assert.strictEqual(
      points.length,
      samples.length,
    );

    points.forEach((point) => {
      assert.ok(
        isFiniteNumber(point.x),
      );

      assert.ok(
        isFiniteNumber(point.y),
      );
    });
  });

  it("places the origin sample at zero coordinates", () => {
    const samples =
      createThreePointSamples();

    const origin = {
      latitude: samples[0].latitude,
      longitude: samples[0].longitude,
    };

    const points =
      buildLocalCoordinatePoints(
        samples,
        origin,
      );

    assert.strictEqual(points[0].x, 0);
    assert.strictEqual(points[0].y, 0);
  });

  it("does not mutate samples", () => {
    const samples =
      createThreePointSamples();

    const original = clone(samples);

    buildLocalCoordinatePoints(
      samples,
      samples[0],
    );

    assert.deepStrictEqual(
      samples,
      original,
    );
  });
});

// ============================================================
// buildLocalTargetCoordinate()
// ============================================================

describe("buildLocalTargetCoordinate()", () => {
  it("builds finite local target coordinates", () => {
    const samples =
      createThreePointSamples();

    const origin = samples[0];

    const target = {
      latitude: 17.705,
      longitude: 83.305,
    };

    const result =
      buildLocalTargetCoordinate(
        target,
        origin,
      );

    assert.ok(
      isFiniteNumber(result.x),
    );

    assert.ok(
      isFiniteNumber(result.y),
    );
  });

  it("returns zero coordinates for the origin", () => {
    const samples =
      createThreePointSamples();

    const origin = samples[0];

    const result =
      buildLocalTargetCoordinate(
        origin,
        origin,
      );

    assert.strictEqual(result.x, 0);
    assert.strictEqual(result.y, 0);
  });
});

// ============================================================
// buildSplineRightHandSide()
// ============================================================

describe("buildSplineRightHandSide()", () => {
  it("places sample values first", () => {
    const samples =
      createThreePointSamples();

    const rhs =
      buildSplineRightHandSide(samples);

    assert.deepStrictEqual(
      rhs.slice(0, 3),
      [10, 20, 30],
    );
  });

  it("adds three polynomial constraint zeros", () => {
    const samples =
      createThreePointSamples();

    const rhs =
      buildSplineRightHandSide(samples);

    assert.deepStrictEqual(
      rhs.slice(3),
      [0, 0, 0],
    );
  });

  it("has n + 3 entries", () => {
    const samples =
      createFourPointSamples();

    const rhs =
      buildSplineRightHandSide(samples);

    assert.strictEqual(
      rhs.length,
      samples.length +
        POLYNOMIAL_DIMENSION,
    );
  });

  it("does not mutate samples", () => {
    const samples =
      createThreePointSamples();

    const original = clone(samples);

    buildSplineRightHandSide(samples);

    assert.deepStrictEqual(
      samples,
      original,
    );
  });
});

// ============================================================
// extractSplineSolution()
// ============================================================

describe("extractSplineSolution()", () => {
  it("extracts spline weights", () => {
    const solution = [
      1,
      2,
      3,
      4,
      5,
      6,
    ];

    const result =
      extractSplineSolution(
        solution,
        3,
      );

    assert.deepStrictEqual(
      result.weights,
      [1, 2, 3],
    );
  });

  it("extracts three polynomial coefficients", () => {
    const solution = [
      1,
      2,
      3,
      4,
      5,
      6,
    ];

    const result =
      extractSplineSolution(
        solution,
        3,
      );

    assert.deepStrictEqual(
      result.polynomialCoefficients,
      [4, 5, 6],
    );
  });

  it("handles four sample weights", () => {
    const solution = [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
    ];

    const result =
      extractSplineSolution(
        solution,
        4,
      );

    assert.deepStrictEqual(
      result.weights,
      [1, 2, 3, 4],
    );

    assert.deepStrictEqual(
      result.polynomialCoefficients,
      [5, 6, 7],
    );
  });
});

// ============================================================
// calculateSplinePrediction()
// ============================================================

describe("calculateSplinePrediction()", () => {
  it("calculates radial basis contribution", () => {
    const result =
      calculateSplinePrediction(
        [2, 3],
        [0, 0, 0],
        [4, 5],
        { x: 0, y: 0 },
      );

    assert.strictEqual(
      result,
      23,
    );
  });

  it("calculates polynomial contribution", () => {
    const result =
      calculateSplinePrediction(
        [0, 0],
        [5, 2, 3],
        [0, 0],
        { x: 10, y: 20 },
      );

    assert.strictEqual(
      result,
      85,
    );
  });

  it("combines radial and polynomial contributions", () => {
    const result =
      calculateSplinePrediction(
        [2, 3],
        [5, 2, 3],
        [4, 5],
        { x: 10, y: 20 },
      );

    assert.strictEqual(
      result,
      108,
    );
  });
});

// ============================================================
// validatePrediction()
// ============================================================

describe("validatePrediction()", () => {
  it("accepts a finite prediction", () => {
    const result =
      validatePrediction(25);

    assert.strictEqual(result.valid, true);
  });

  it("accepts zero", () => {
    const result =
      validatePrediction(0);

    assert.strictEqual(result.valid, true);
  });

  it("rejects NaN", () => {
    const result =
      validatePrediction(NaN);

    assert.strictEqual(result.valid, false);
  });

  it("rejects Infinity", () => {
    const result =
      validatePrediction(Infinity);

    assert.strictEqual(result.valid, false);
  });
});

// ============================================================
// calculateSplineResidualDiagnostics()
// ============================================================

describe(
  "calculateSplineResidualDiagnostics()",
  () => {
    it("reports zero residual for an exact solution", () => {
      const matrix = [
        [2, 0],
        [0, 3],
      ];

      const solution = [
        4,
        5,
      ];

      const rightHandSide = [
        8,
        15,
      ];

      const result =
        calculateSplineResidualDiagnostics(
          matrix,
          solution,
          rightHandSide,
        );

      assert.strictEqual(
        result.valid,
        true,
      );

      assert.strictEqual(
        result.systemSize,
        2,
      );

      assert.deepStrictEqual(
        result.residual,
        [0, 0],
      );

      assert.strictEqual(
        result.allFinite,
        true,
      );

      assert.strictEqual(
        result.maxAbsoluteResidual,
        0,
      );

      assert.strictEqual(
        result.l1Norm,
        0,
      );

      assert.strictEqual(
        result.l2Norm,
        0,
      );

      assert.strictEqual(
        result.rmsResidual,
        0,
      );
    });

it("calculates residual norms correctly", () => {
  const matrix = [
    [2, 0],
    [0, 3],
  ];

  const solution = [
    4,
    5,
  ];

  const rightHandSide = [
    7,
    14,
  ];

  const result =
    calculateSplineResidualDiagnostics(
      matrix,
      solution,
      rightHandSide,
    );

  assert.strictEqual(
    result.valid,
    true,
  );

  assert.deepStrictEqual(
    result.residual,
    [1, 1],
  );

  assert.strictEqual(
    result.maxAbsoluteResidual,
    1,
  );

  assert.strictEqual(
    result.l1Norm,
    2,
  );

  assert.ok(
    Math.abs(
      result.l2Norm -
        Math.sqrt(2),
    ) < 1e-12,
  );

  assert.ok(
    Math.abs(
      result.rmsResidual -
        1,
    ) < 1e-12,
  );
});

    it("rejects an invalid matrix", () => {
      const result =
        calculateSplineResidualDiagnostics(
          null,
          [1, 2],
          [1, 2],
        );

      assert.strictEqual(
        result.valid,
        false,
      );

      assert.strictEqual(
        result.allFinite,
        false,
      );

      assert.strictEqual(
        result.residual,
        null,
      );
    });

    it("rejects an invalid solution", () => {
      const result =
        calculateSplineResidualDiagnostics(
          [
            [1, 0],
            [0, 1],
          ],
          [1],
          [1, 2],
        );

      assert.strictEqual(
        result.valid,
        false,
      );

      assert.strictEqual(
        result.allFinite,
        false,
      );
    });

    it("rejects an invalid right-hand side", () => {
      const result =
        calculateSplineResidualDiagnostics(
          [
            [1, 0],
            [0, 1],
          ],
          [1, 2],
          [1],
        );

      assert.strictEqual(
        result.valid,
        false,
      );

      assert.strictEqual(
        result.allFinite,
        false,
      );
    });
  },
);

// ============================================================
// interpolateSpline()
// ============================================================

describe("interpolateSpline()", () => {
  it("interpolates a three-point non-collinear sample set", () => {
    const samples =
      createThreePointSamples();

    const target = {
      latitude: 17.705,
      longitude: 83.305,
    };

    const result =
      interpolateSpline(
        samples,
        target,
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      isFiniteNumber(result.prediction),
    );
  });

  it("reproduces the first sample value exactly", () => {
    const samples =
      createThreePointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude:
            samples[0].latitude,
          longitude:
            samples[0].longitude,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Math.abs(
        result.prediction -
          samples[0].value,
      ) < 1e-7,
    );
  });

  it("reproduces the second sample value", () => {
    const samples =
      createThreePointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude:
            samples[1].latitude,
          longitude:
            samples[1].longitude,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Math.abs(
        result.prediction -
          samples[1].value,
      ) < 1e-7,
    );
  });

  it("reproduces the third sample value", () => {
    const samples =
      createThreePointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude:
            samples[2].latitude,
          longitude:
            samples[2].longitude,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Math.abs(
        result.prediction -
          samples[2].value,
      ) < 1e-7,
    );
  });

  it("produces a finite prediction inside the sample region", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Number.isFinite(
        result.prediction,
      ),
    );
  });

  it("produces a finite prediction outside the sample region", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.720,
          longitude: 83.320,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Number.isFinite(
        result.prediction,
      ),
    );
  });

  it("handles the real-world nine-point electrical conductivity geometry", () => {
    const samples =
      createRealWorldElectricalConductivitySamples();

    const target = {
      latitude: 17.7769,
      longitude: 83.2682,
    };

    const result =
      interpolateSpline(
        samples,
        target,
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.method,
      "thin_plate_spline",
    );

    assert.strictEqual(
      result.sampleCount,
      9,
    );

    assert.ok(
      Number.isFinite(
        result.prediction,
      ),
    );

    assert.ok(
      Math.abs(
        result.prediction -
          0.17296346818652533,
      ) < 1e-9,
    );

    assert.strictEqual(
      result.diagnostics.matrixEquilibration.applied,
      true,
    );

    assert.strictEqual(
      result.diagnostics.matrixEquilibration.columnScaling,
      "max_abs",
    );

    assert.strictEqual(
      result.diagnostics.matrixEquilibration.rowScaling,
      "max_abs",
    );

    assert.strictEqual(
      result.diagnostics.solverResidual.systemSize,
      result.diagnostics.systemSize,
    );

    assert.strictEqual(
      result.diagnostics.solverResidual.allFinite,
      true,
    );

    assert.ok(
      Array.isArray(
        result.diagnostics.solverResidual.residual,
      ),
    );

    assert.strictEqual(
      result.diagnostics.solverResidual.residual.length,
      result.diagnostics.systemSize,
    );

    assert.ok(
      Number.isFinite(
        result.diagnostics.solverResidual.maxAbsoluteResidual,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.diagnostics.solverResidual.l1Norm,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.diagnostics.solverResidual.l2Norm,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.diagnostics.solverResidual.rmsResidual,
      ),
    );
  });

  it("reports finite solver residual diagnostics", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    const residualDiagnostics =
      result.diagnostics.solverResidual;

    assert.strictEqual(
      residualDiagnostics.systemSize,
      result.diagnostics.systemSize,
    );

    assert.strictEqual(
      residualDiagnostics.allFinite,
      true,
    );

    assert.strictEqual(
      residualDiagnostics.residual.length,
      result.diagnostics.systemSize,
    );

    assert.ok(
      residualDiagnostics.maxAbsoluteResidual >=
        0,
    );

    assert.ok(
      residualDiagnostics.l1Norm >= 0,
    );

    assert.ok(
      residualDiagnostics.l2Norm >= 0,
    );

    assert.ok(
      residualDiagnostics.rmsResidual >= 0,
    );
  });

  it("reports a small residual for an exactly interpolating solution", () => {
    const result =
      interpolateSpline(
        createFourPointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      result.diagnostics.solverResidual
        .maxAbsoluteResidual < 1e-7,
    );

    assert.ok(
      result.diagnostics.solverResidual
        .rmsResidual < 1e-7,
    );
  });

  it("supports more than the minimum number of samples", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.sampleCount,
      4,
    );
  });

  it("handles constant sample values", () => {
    const samples =
      createConstantSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.ok(
      Math.abs(
        result.prediction - 25,
      ) < 1e-7,
    );
  });

  it("returns the thin-plate-spline method identifier", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.method,
      "thin_plate_spline",
    );
  });

  it("returns the correct sample count", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.sampleCount,
      samples.length,
    );
  });

  it("returns three polynomial coefficients", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.polynomialCoefficients.length,
      POLYNOMIAL_DIMENSION,
    );
  });

  it("returns one weight for every sample", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.weights.length,
      samples.length,
    );
  });

  it("returns the interpolation origin", () => {
    const samples =
      createThreePointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.origin.latitude,
      samples[0].latitude,
    );

    assert.strictEqual(
      result.origin.longitude,
      samples[0].longitude,
    );
  });

  it("returns system size n + 3", () => {
    const samples =
      createFourPointSamples();

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.diagnostics.systemSize,
      samples.length +
        POLYNOMIAL_DIMENSION,
    );
  });

  it("reports the thin-plate basis function", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.diagnostics.basisFunction,
      "r^2 * ln(r)",
    );
  });

  it("reports first-order polynomial constraints", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.diagnostics.polynomialOrder,
      1,
    );

    assert.strictEqual(
      result.diagnostics.polynomialDimension,
      3,
    );
  });

  it("rejects fewer than three samples", () => {
    const samples =
      createThreePointSamples().slice(
        0,
        2,
      );

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );

    assert.match(
      result.error,
      /Invalid spline interpolation samples/,
    );
  });

  it("rejects an empty sample array", () => {
    const result =
      interpolateSpline(
        [],
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );
  });

  it("rejects null samples", () => {
    const result =
      interpolateSpline(
        null,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );
  });

  it("rejects an invalid target", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 95,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );

    assert.match(
      result.error,
      /Invalid spline interpolation target/,
    );
  });

  it("rejects a missing target", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        null,
      );

    assert.strictEqual(
      result.success,
      false,
    );
  });

  it("rejects an invalid sample value", () => {
    const samples =
      createThreePointSamples();

    samples[1].value = "invalid";

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );
  });

  it("rejects invalid pivot tolerance", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
        {
          pivotTolerance: -1,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );

    assert.match(
      result.error,
      /Unable to solve spline interpolation system/,
    );
  });

  it("rejects collinear sample geometry", () => {
    const result =
      interpolateSpline(
        createCollinearSamples(),
        {
          latitude: 17.710,
          longitude: 83.300,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );

    assert.strictEqual(
      result.error,
      "Invalid spline interpolation geometry.",
    );

    assert.strictEqual(
      result.geometry.reason,
      "collinear_points",
    );

    assert.strictEqual(
      result.geometry.spatialRank,
      1,
    );

    assert.deepStrictEqual(
      result.geometry.duplicatePairs,
      [],
    );
  });

  it("rejects duplicate-location geometry", () => {
    const samples =
      createThreePointSamples();

    samples[1].latitude =
      samples[0].latitude;

    samples[1].longitude =
      samples[0].longitude;

    const result =
      interpolateSpline(
        samples,
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      false,
    );

    assert.strictEqual(
      result.error,
      "Invalid spline interpolation geometry.",
    );

    assert.strictEqual(
      result.geometry.reason,
      "duplicate_locations",
    );

    assert.deepStrictEqual(
      result.geometry.duplicatePairs,
      [[0, 1]],
    );
  });

  it("does not mutate sample input", () => {
    const samples =
      createFourPointSamples();

    const original = clone(samples);

    interpolateSpline(
      samples,
      {
        latitude: 17.705,
        longitude: 83.305,
      },
    );

    assert.deepStrictEqual(
      samples,
      original,
    );
  });

  it("does not mutate target input", () => {
    const samples =
      createFourPointSamples();

    const target = {
      latitude: 17.705,
      longitude: 83.305,
    };

    const original = clone(target);

    interpolateSpline(
      samples,
      target,
    );

    assert.deepStrictEqual(
      target,
      original,
    );
  });

  it("does not mutate nested sample properties", () => {
    const samples =
      createFourPointSamples();

    const originalValues =
      samples.map(
        (sample) => sample.value,
      );

    interpolateSpline(
      samples,
      {
        latitude: 17.705,
        longitude: 83.305,
      },
    );

    assert.deepStrictEqual(
      samples.map(
        (sample) => sample.value,
      ),
      originalValues,
    );
  });

  it("supports the splineInterpolation alias", () => {
    const samples =
      createFourPointSamples();

    const target = {
      latitude: 17.705,
      longitude: 83.305,
    };

    const directResult =
      interpolateSpline(
        samples,
        target,
      );

    const aliasResult =
      splineInterpolation(
        samples,
        target,
      );

    assert.strictEqual(
      aliasResult.success,
      directResult.success,
    );

    if (
      directResult.success &&
      aliasResult.success
    ) {
      assert.ok(
        Math.abs(
          aliasResult.prediction -
            directResult.prediction,
        ) < 1e-10,
      );
    }
  });

  it("uses the default pivot tolerance", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.diagnostics.pivotTolerance,
      DEFAULT_PIVOT_TOLERANCE,
    );
  });

  it("accepts a valid custom pivot tolerance", () => {
    const result =
      interpolateSpline(
        createThreePointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
        {
          pivotTolerance: 1e-13,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    assert.strictEqual(
      result.diagnostics.pivotTolerance,
      1e-13,
    );
  });

  it("returns finite weights", () => {
    const result =
      interpolateSpline(
        createFourPointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    result.weights.forEach(
      (weight) => {
        assert.ok(
          Number.isFinite(weight),
        );
      },
    );
  });

  it("returns finite polynomial coefficients", () => {
    const result =
      interpolateSpline(
        createFourPointSamples(),
        {
          latitude: 17.705,
          longitude: 83.305,
        },
      );

    assert.strictEqual(
      result.success,
      true,
    );

    result.polynomialCoefficients.forEach(
      (coefficient) => {
        assert.ok(
          Number.isFinite(
            coefficient,
          ),
        );
      },
    );
  });
});
