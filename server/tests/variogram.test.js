"use strict";

// ============================================================
// server/tests/variogram.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Variogram Unit Tests
//
// Validates:
//
//   1. Supported variogram models
//   2. Model normalization
//   3. Model parameter validation
//   4. Lag configuration validation
//   5. Pair semivariance
//   6. Experimental semivariogram
//   7. Spherical model
//   8. Exponential model
//   9. Gaussian model
//  10. Generic theoretical model evaluation
//  11. Experimental/model comparison
//
// ============================================================

const {
  SUPPORTED_VARIOGRAM_MODELS,
  DEFAULT_LAG_COUNT,
  DEFAULT_TOLERANCE_RATIO,

  normalizeVariogramModel,

  validateVariogramParameters,
  validateLagSettings,

  calculatePairSemivariance,
  calculateExperimentalSemivariogram,

  calculateStructuredVariance,

  sphericalVariogram,
  exponentialVariogram,
  gaussianVariogram,

  evaluateVariogram,
  evaluateVariogramModel,
} = require("../services/interpolation/variogram");

// ============================================================
// TEST HELPERS
// ============================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertAlmostEqual(
  actual,
  expected,
  tolerance = 1e-10,
) {
  if (
    !Number.isFinite(actual) ||
    Math.abs(actual - expected) > tolerance
  ) {
    throw new Error(
      `Expected ${expected}, received ${actual}.`,
    );
  }
}

function assertThrows(fn, expectedMessage) {
  let thrown = false;

  try {
    fn();
  } catch (error) {
    thrown = true;

    if (
      expectedMessage &&
      !error.message.includes(expectedMessage)
    ) {
      throw new Error(
        `Expected error containing "${expectedMessage}", ` +
          `received "${error.message}".`,
      );
    }
  }

  if (!thrown) {
    throw new Error(
      "Expected function to throw an error.",
    );
  }
}

// ============================================================
// TEST 1 — SUPPORTED MODELS
// ============================================================

function testSupportedModels() {
  assert(
    SUPPORTED_VARIOGRAM_MODELS &&
      typeof SUPPORTED_VARIOGRAM_MODELS ===
        "object",
    "Supported variogram models must be an object.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.spherical,
    "Spherical model must be supported.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.exponential,
    "Exponential model must be supported.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.gaussian,
    "Gaussian model must be supported.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.spherical.key ===
      "spherical",
    "Spherical model key is incorrect.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.exponential.key ===
      "exponential",
    "Exponential model key is incorrect.",
  );

  assert(
    SUPPORTED_VARIOGRAM_MODELS.gaussian.key ===
      "gaussian",
    "Gaussian model key is incorrect.",
  );
}

// ============================================================
// TEST 2 — MODEL NORMALIZATION
// ============================================================

function testNormalizeVariogramModel() {
  const spherical =
    normalizeVariogramModel(
      "spherical",
    );

  assert(
    spherical &&
      spherical.key === "spherical",
    "Spherical model normalization failed.",
  );

  const uppercase =
    normalizeVariogramModel(
      "SPHERICAL",
    );

  assert(
    uppercase &&
      uppercase.key === "spherical",
    "Uppercase spherical normalization failed.",
  );

  const exponential =
    normalizeVariogramModel(
      " Exponential ",
    );

  assert(
    exponential &&
      exponential.key === "exponential",
    "Exponential normalization failed.",
  );

  const gaussian =
    normalizeVariogramModel(
      "GAUSSIAN",
    );

  assert(
    gaussian &&
      gaussian.key === "gaussian",
    "Gaussian normalization failed.",
  );

  assert(
    normalizeVariogramModel(
      "invalid",
    ) === null,
    "Invalid model must normalize to null.",
  );

  assert(
    normalizeVariogramModel(
      null,
    ) === null,
    "Null model must normalize to null.",
  );
}

// ============================================================
// TEST 3 — VARIOGRAM PARAMETER VALIDATION
// ============================================================

function testValidateVariogramParameters() {
  const result =
    validateVariogramParameters({
      nugget: 0.1,
      sill: 1.0,
      range: 1000,
    });

  assert(
    result.valid === true,
    "Valid variogram parameters must be marked valid.",
  );

  assert(
    result.errors.length === 0,
    "Valid variogram parameters must have no errors.",
  );

  assertAlmostEqual(
    result.nugget,
    0.1,
  );

  assertAlmostEqual(
    result.sill,
    1.0,
  );

  assertAlmostEqual(
    result.range,
    1000,
  );

  const negativeNugget =
    validateVariogramParameters({
      nugget: -0.1,
      sill: 1.0,
      range: 1000,
    });

  assert(
    negativeNugget.valid === false,
    "Negative nugget must be invalid.",
  );

  const invalidSill =
    validateVariogramParameters({
      nugget: 0.1,
      sill: 0,
      range: 1000,
    });

  assert(
    invalidSill.valid === false,
    "Zero sill must be invalid.",
  );

  const invalidRange =
    validateVariogramParameters({
      nugget: 0.1,
      sill: 1.0,
      range: 0,
    });

  assert(
    invalidRange.valid === false,
    "Zero range must be invalid.",
  );

  const sillBelowNugget =
    validateVariogramParameters({
      nugget: 1.0,
      sill: 0.5,
      range: 1000,
    });

  assert(
    sillBelowNugget.valid === false,
    "Sill below nugget must be invalid.",
  );
}

// ============================================================
// TEST 4 — LAG SETTINGS
// ============================================================

function testValidateLagSettings() {
  const result =
    validateLagSettings({
      lagCount: DEFAULT_LAG_COUNT,
      toleranceRatio:
        DEFAULT_TOLERANCE_RATIO,
    });

  assert(
    result.valid === true,
    "Valid lag settings must be marked valid.",
  );

  assert(
    result.lagCount === DEFAULT_LAG_COUNT,
    "Lag count was not preserved.",
  );

  assertAlmostEqual(
    result.toleranceRatio,
    DEFAULT_TOLERANCE_RATIO,
  );

  const invalidLagCount =
    validateLagSettings({
      lagCount: 1,
      toleranceRatio: 0.5,
    });

  assert(
    invalidLagCount.valid === false,
    "Lag count below minimum must be invalid.",
  );

  const invalidTolerance =
    validateLagSettings({
      lagCount: 12,
      toleranceRatio: 0,
    });

  assert(
    invalidTolerance.valid === false,
    "Tolerance below minimum must be invalid.",
  );

  const excessiveTolerance =
    validateLagSettings({
      lagCount: 12,
      toleranceRatio: 2,
    });

  assert(
    excessiveTolerance.valid === false,
    "Tolerance above maximum must be invalid.",
  );
}

// ============================================================
// TEST 5 — PAIR SEMIVARIANCE
// ============================================================

function testCalculatePairSemivariance() {
  assertAlmostEqual(
    calculatePairSemivariance(
      10,
      10,
    ),
    0,
  );

  assertAlmostEqual(
    calculatePairSemivariance(
      10,
      12,
    ),
    2,
  );

  assertAlmostEqual(
    calculatePairSemivariance(
      12,
      10,
    ),
    2,
  );

  assertAlmostEqual(
    calculatePairSemivariance(
      5,
      9,
    ),
    8,
  );
}

// ============================================================
// TEST 6 — EXPERIMENTAL SEMIVARIOGRAM
// ============================================================

function testExperimentalSemivariogram() {
  const points = [
    {
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      latitude: 17.7000,
      longitude: 83.3100,
      value: 12,
    },
    {
      latitude: 17.7100,
      longitude: 83.3000,
      value: 14,
    },
    {
      latitude: 17.7100,
      longitude: 83.3100,
      value: 16,
    },
  ];

  const distanceMatrix = [
    [0, 1000, 1100, 1500],
    [1000, 0, 1500, 1100],
    [1100, 1500, 0, 1000],
    [1500, 1100, 1000, 0],
  ];

  const result =
    calculateExperimentalSemivariogram(
      points,
      distanceMatrix,
      {
        lagCount: 3,
        toleranceRatio: 0.5,
      },
    );

  assert(
    result &&
      typeof result === "object",
    "Experimental semivariogram must return an object.",
  );

  assert(
    result.lagCount === 3,
    "Lag count must be 3.",
  );

  assertAlmostEqual(
    result.maximumDistance,
    1500,
  );

  assert(
    result.totalPairCount === 6,
    "Four points must produce six unique point pairs.",
  );

  assert(
    Array.isArray(result.lags),
    "Experimental semivariogram must contain lag definitions.",
  );

  assert(
    result.lags.length === 3,
    "Expected exactly three lag definitions.",
  );

  const totalLagPairs =
    result.lags.reduce(
      (sum, lag) =>
        sum + lag.pairCount,
      0,
    );

  assert(
    totalLagPairs === 6,
    "All six unique point pairs must be assigned to lags.",
  );
}

// ============================================================
// TEST 7 — EXPERIMENTAL SEMIVARIANCE VALUES
// ============================================================

function testExperimentalSemivarianceValues() {
  const points = [
    {
      latitude: 17.7,
      longitude: 83.3,
      value: 10,
    },
    {
      latitude: 17.7,
      longitude: 83.31,
      value: 14,
    },
  ];

  const distanceMatrix = [
    [0, 1000],
    [1000, 0],
  ];

  const result =
    calculateExperimentalSemivariogram(
      points,
      distanceMatrix,
      {
        lagCount: 2,
        toleranceRatio: 0.5,
      },
    );

  const populatedLag =
    result.lags.find(
      (lag) =>
        lag.pairCount === 1,
    );

  assert(
    populatedLag,
    "Expected one populated lag.",
  );

  assertAlmostEqual(
    populatedLag.semivariance,
    8,
  );
}

// ============================================================
// TEST 8 — STRUCTURED VARIANCE
// ============================================================

function testStructuredVariance() {
  assertAlmostEqual(
    calculateStructuredVariance(
      0.1,
      1.0,
    ),
    0.9,
  );

  assertAlmostEqual(
    calculateStructuredVariance(
      0,
      2,
    ),
    2,
  );
}

// ============================================================
// TEST 9 — SPHERICAL VARIOGRAM
// ============================================================

function testSphericalVariogram() {
  const parameters = {
    nugget: 0.1,
    sill: 1.0,
    range: 1000,
  };

  assertAlmostEqual(
    sphericalVariogram(
      0,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    0,
  );

  assertAlmostEqual(
    sphericalVariogram(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    0.71875,
  );

  assertAlmostEqual(
    sphericalVariogram(
      1000,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    1.0,
  );

  assertAlmostEqual(
    sphericalVariogram(
      2000,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    1.0,
  );
}

// ============================================================
// TEST 10 — EXPONENTIAL VARIOGRAM
// ============================================================

function testExponentialVariogram() {
  const parameters = {
    nugget: 0.1,
    sill: 1.0,
    range: 1000,
  };

  assertAlmostEqual(
    exponentialVariogram(
      0,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    0,
  );

  const value =
    exponentialVariogram(
      1000,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  assert(
    value > parameters.nugget,
    "Exponential variogram must increase with distance.",
  );

  assert(
    value < parameters.sill,
    "Exponential variogram should remain below the sill at the practical range.",
  );
}

// ============================================================
// TEST 11 — GAUSSIAN VARIOGRAM
// ============================================================

function testGaussianVariogram() {
  const parameters = {
    nugget: 0.1,
    sill: 1.0,
    range: 1000,
  };

  assertAlmostEqual(
    gaussianVariogram(
      0,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    ),
    0,
  );

  const value500 =
    gaussianVariogram(
      500,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  const value1000 =
    gaussianVariogram(
      1000,
      parameters.nugget,
      parameters.sill,
      parameters.range,
    );

  assert(
    value500 > parameters.nugget,
    "Gaussian variogram must increase with distance.",
  );

  assert(
    value1000 > value500,
    "Gaussian variogram must increase toward the sill.",
  );

  assert(
    value1000 < parameters.sill,
    "Gaussian variogram should remain below the sill.",
  );
}

// ============================================================
// TEST 12 — GENERIC VARIOGRAM EVALUATION
// ============================================================

function testEvaluateVariogram() {
  const parameters = {
    nugget: 0.1,
    sill: 1.0,
    range: 1000,
  };

  const spherical =
    evaluateVariogram(
      "spherical",
      500,
      parameters,
    );

  const exponential =
    evaluateVariogram(
      "exponential",
      500,
      parameters,
    );

  const gaussian =
    evaluateVariogram(
      "gaussian",
      500,
      parameters,
    );

  assert(
    Number.isFinite(spherical),
    "Spherical evaluation must return a finite number.",
  );

  assert(
    Number.isFinite(exponential),
    "Exponential evaluation must return a finite number.",
  );

  assert(
    Number.isFinite(gaussian),
    "Gaussian evaluation must return a finite number.",
  );

  assert(
    evaluateVariogram(
      "invalid",
      500,
      parameters,
    ) === null,
    "Invalid variogram model must return null.",
  );
}

// ============================================================
// TEST 13 — MODEL EVALUATION AGAINST EXPERIMENTAL DATA
// ============================================================

function testEvaluateVariogramModel() {
  const experimental = {
    lagCount: 3,

    maximumDistance: 3000,

    toleranceRatio: 0.5,

    totalPairCount: 3,

    lags: [
      {
        lagNumber: 1,
        distance: 500,
        semivariance: 0.2,
        pairCount: 1,
        lowerBound: 0,
        upperBound: 1000,
      },

      {
        lagNumber: 2,
        distance: 1500,
        semivariance: 0.5,
        pairCount: 1,
        lowerBound: 1000,
        upperBound: 2000,
      },

      {
        lagNumber: 3,
        distance: 2500,
        semivariance: 0.8,
        pairCount: 1,
        lowerBound: 2000,
        upperBound: 3000,
      },
    ],
  };

  const parameters = {
    nugget: 0.1,
    sill: 1.0,
    range: 2000,
  };

  const result =
    evaluateVariogramModel(
      experimental,
      "spherical",
      parameters,
    );

  assert(
    result &&
      typeof result === "object",
    "Model evaluation must return an object.",
  );

  assert(
    result.model === "spherical",
    "Evaluated model must be spherical.",
  );

  assert(
    result.parameters,
    "Model evaluation must contain parameters.",
  );

  assertAlmostEqual(
    result.parameters.nugget,
    0.1,
  );

  assertAlmostEqual(
    result.parameters.sill,
    1.0,
  );

  assertAlmostEqual(
    result.parameters.range,
    2000,
  );

  assert(
    Array.isArray(result.lags),
    "Model evaluation must contain a lag array.",
  );

  assert(
    result.lags.length === 3,
    "Model evaluation must preserve all experimental lags.",
  );

  result.lags.forEach(
    (lag) => {
      assert(
        Number.isFinite(lag.distance),
        "Evaluated distance must be finite.",
      );

      assert(
        Number.isFinite(
          lag.observedSemivariance,
        ),
        "Observed semivariance must be finite.",
      );

      assert(
        Number.isFinite(
          lag.modeledSemivariance,
        ),
        "Modeled semivariance must be finite.",
      );

      assert(
        Number.isInteger(
          lag.pairCount,
        ),
        "Pair count must be an integer.",
      );
    },
  );
}

// ============================================================
// TEST RUNNER
// ============================================================

const tests = [
  [
    "Supported variogram models",
    testSupportedModels,
  ],

  [
    "Variogram model normalization",
    testNormalizeVariogramModel,
  ],

  [
    "Variogram parameter validation",
    testValidateVariogramParameters,
  ],

  [
    "Lag settings validation",
    testValidateLagSettings,
  ],

  [
    "Pair semivariance",
    testCalculatePairSemivariance,
  ],

  [
    "Experimental semivariogram",
    testExperimentalSemivariogram,
  ],

  [
    "Experimental semivariance values",
    testExperimentalSemivarianceValues,
  ],

  [
    "Structured variance",
    testStructuredVariance,
  ],

  [
    "Spherical variogram",
    testSphericalVariogram,
  ],

  [
    "Exponential variogram",
    testExponentialVariogram,
  ],

  [
    "Gaussian variogram",
    testGaussianVariogram,
  ],

  [
    "Generic variogram evaluation",
    testEvaluateVariogram,
  ],

  [
    "Experimental/model evaluation",
    testEvaluateVariogramModel,
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  try {
    test();

    console.log(
      `PASS: ${name}`,
    );

    passed += 1;
  } catch (error) {
    console.error(
      `FAIL: ${name}`,
    );

    console.error(
      `  ${error.message}`,
    );

    process.exitCode = 1;
  }
}

console.log(
  `\nVariogram tests: ${passed}/${tests.length} passed.`,
);

if (passed !== tests.length) {
  process.exitCode = 1;
}
