"use strict";

// ============================================================
// server/tests/krigingCrossValidationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.1  Kriging Cross-Validation Foundation
//
// Test coverage:
//   1. Export contract
//   2. Input validation
//   3. Minimum sample requirement
//   4. LOOCV fold generation
//   5. Validation metrics
//   6. Successful Kriging delegation
//   7. Fixed parameters across folds
//   8. Failed-fold preservation
//   9. All-fold failure
//  10. Input immutability
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const crossValidationService = require(
  "../services/interpolation/krigingCrossValidationService",
);

const krigingInterpolation = require(
  "../services/interpolation/krigingInterpolation",
);

/* ============================================================
   TEST FIXTURES
   ============================================================ */

function createPoints() {
  return [
    {
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      latitude: 17.7100,
      longitude: 83.3100,
      value: 20,
    },
    {
      latitude: 17.7200,
      longitude: 83.3200,
      value: 30,
    },
    {
      latitude: 17.7300,
      longitude: 83.3300,
      value: 40,
    },
  ];
}

function createParameters() {
  return {
    model: "spherical",
    nugget: 0.1,
    sill: 1.0,
    range: 2000,
  };
}

/* ============================================================
   EXPORT CONTRACT
   ============================================================ */

test("exports the complete Kriging cross-validation contract", () => {
  assert.equal(
    crossValidationService.VALIDATION_METHOD,
    "leave_one_out",
  );

  assert.equal(
    crossValidationService.METHOD,
    "ordinary_kriging",
  );

  assert.equal(
    crossValidationService.MIN_SAMPLE_COUNT,
    3,
  );

  assert.equal(
    typeof crossValidationService.normalizeError,
    "function",
  );

  assert.equal(
    typeof crossValidationService.validateCrossValidationInput,
    "function",
  );

  assert.equal(
    typeof crossValidationService.generateLeaveOneOutFolds,
    "function",
  );

  assert.equal(
    typeof crossValidationService.calculateValidationMetrics,
    "function",
  );

  assert.equal(
    typeof crossValidationService.validateSingleFold,
    "function",
  );

  assert.equal(
    typeof crossValidationService.crossValidateKriging,
    "function",
  );
});

/* ============================================================
   INPUT VALIDATION
   ============================================================ */

test("rejects non-array sample points", () => {
  const result =
    crossValidationService.validateCrossValidationInput({
      points: null,
      parameters: createParameters(),
    });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      /sample points must be an array/i.test(error),
    ),
  );
  assert.equal(result.count, 0);
});

test("rejects fewer than three original samples", () => {
  const result =
    crossValidationService.validateCrossValidationInput({
      points: createPoints().slice(0, 2),
      parameters: createParameters(),
    });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      /at least 3 sample points/i.test(error),
    ),
  );
  assert.equal(result.count, 2);
});

test("rejects missing Kriging parameters", () => {
  const result =
    crossValidationService.validateCrossValidationInput({
      points: createPoints(),
    });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      /kriging parameters must be an object/i.test(error),
    ),
  );
});

test("accepts valid LOOCV input", () => {
  const result =
    crossValidationService.validateCrossValidationInput({
      points: createPoints(),
      parameters: createParameters(),
    });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.count, 4);
});

/* ============================================================
   LOOCV FOLD GENERATION
   ============================================================ */

test("generates exactly one fold per observation", () => {
  const points = createPoints();

  const folds =
    crossValidationService.generateLeaveOneOutFolds(points);

  assert.equal(folds.length, points.length);
});

test("each LOOCV fold excludes exactly its held-out observation", () => {
  const points = createPoints();

  const folds =
    crossValidationService.generateLeaveOneOutFolds(points);

  folds.forEach((fold, index) => {
    assert.equal(fold.index, index);
    assert.equal(fold.trainingPoints.length, points.length - 1);
    assert.equal(fold.sample, points[index]);

    assert.equal(
      fold.trainingPoints.includes(points[index]),
      false,
    );

    points.forEach((point, candidateIndex) => {
      if (candidateIndex !== index) {
        assert.equal(
          fold.trainingPoints.includes(point),
          true,
        );
      }
    });
  });
});

test("LOOCV fold generation does not mutate the input array", () => {
  const points = createPoints();
  const original = structuredClone(points);

  crossValidationService.generateLeaveOneOutFolds(points);

  assert.deepEqual(points, original);
});

/* ============================================================
   METRICS
   ============================================================ */

test("calculates ME, MAE and RMSE from successful folds only", () => {
  const predictions = [
    {
      success: true,
      residual: 2,
      absoluteError: 2,
      squaredError: 4,
    },
    {
      success: true,
      residual: -1,
      absoluteError: 1,
      squaredError: 1,
    },
    {
      success: false,
      residual: null,
      absoluteError: null,
      squaredError: null,
    },
  ];

  const metrics =
    crossValidationService.calculateValidationMetrics(
      predictions,
    );

  assert.equal(metrics.meanError, 0.5);
  assert.equal(metrics.meanAbsoluteError, 1.5);
  assert.ok(
    Math.abs(
      metrics.rootMeanSquareError -
        Math.sqrt(2.5),
    ) < 1e-12,
  );
});

test("returns null metrics when all folds fail", () => {
  const metrics =
    crossValidationService.calculateValidationMetrics([
      {
        success: false,
        residual: null,
        absoluteError: null,
        squaredError: null,
      },
      {
        success: false,
        residual: null,
        absoluteError: null,
        squaredError: null,
      },
    ]);

  assert.deepEqual(metrics, {
    meanError: null,
    meanAbsoluteError: null,
    rootMeanSquareError: null,
  });
});

/* ============================================================
   SINGLE-FOLD DELEGATION
   ============================================================ */

test("delegates a validation fold to interpolateKriging", () => {
  const points = createPoints();
  const parameters = createParameters();

  const fold =
    crossValidationService.generateLeaveOneOutFolds(
      points,
    )[0];

  const original =
    krigingInterpolation.interpolateKriging;

  let callCount = 0;

  krigingInterpolation.interpolateKriging = (
    trainingPoints,
    target,
    suppliedParameters,
    options,
  ) => {
    callCount += 1;

    assert.equal(trainingPoints.length, 3);
    assert.deepEqual(target, {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
    });
    assert.deepEqual(
      suppliedParameters,
      parameters,
    );
    assert.deepEqual(options, {});

    return {
      success: true,
      method: "ordinary_kriging",
      predictedValue: 12.5,
    };
  };

  try {
    const result =
      crossValidationService.validateSingleFold(
        fold,
        parameters,
      );

    assert.equal(callCount, 1);
    assert.equal(result.success, true);
    assert.equal(result.observedValue, 10);
    assert.equal(result.predictedValue, 12.5);
    assert.equal(result.residual, 2.5);
    assert.equal(result.absoluteError, 2.5);
    assert.equal(result.squaredError, 6.25);
    assert.equal(result.trainingSampleCount, 3);
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

test("passes validation options through to interpolateKriging", () => {
  const points = createPoints();
  const parameters = createParameters();

  const fold =
    crossValidationService.generateLeaveOneOutFolds(
      points,
    )[0];

  const original =
    krigingInterpolation.interpolateKriging;

  const options = {
    weightTolerance: 1e-10,
    residualTolerance: 1e-9,
    pivotTolerance: 1e-12,
  };

  let receivedOptions = null;

  krigingInterpolation.interpolateKriging = (
    trainingPoints,
    target,
    suppliedParameters,
    suppliedOptions,
  ) => {
    receivedOptions = suppliedOptions;

    return {
      success: true,
      predictedValue: 11,
    };
  };

  try {
    const result =
      crossValidationService.validateSingleFold(
        fold,
        parameters,
        options,
      );

    assert.equal(result.success, true);
    assert.deepEqual(
      receivedOptions,
      options,
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

/* ============================================================
   SUCCESSFUL LOOCV
   ============================================================ */

test("performs complete LOOCV and returns one prediction per sample", () => {
  const points = createPoints();
  const parameters = createParameters();

  const original =
    krigingInterpolation.interpolateKriging;

  krigingInterpolation.interpolateKriging = (
    trainingPoints,
    target,
    suppliedParameters,
  ) => {
    assert.equal(
      trainingPoints.length,
      points.length - 1,
    );

    assert.deepEqual(
      suppliedParameters,
      parameters,
    );

    return {
      success: true,
      method: "ordinary_kriging",
      predictedValue:
        Number(
          trainingPoints.reduce(
            (sum, point) => sum + point.value,
            0,
          ),
        ) / trainingPoints.length,
    };
  };

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, true);
    assert.equal(
      result.method,
      "ordinary_kriging",
    );
    assert.equal(
      result.validationMethod,
      "leave_one_out",
    );
    assert.equal(result.sampleCount, 4);
    assert.equal(
      result.successfulValidationCount,
      4,
    );
    assert.equal(
      result.failedValidationCount,
      0,
    );
    assert.equal(
      result.predictions.length,
      4,
    );

    result.predictions.forEach(
      (prediction, index) => {
        assert.equal(prediction.success, true);
        assert.equal(
          prediction.index,
          index,
        );
        assert.equal(
          prediction.trainingSampleCount,
          3,
        );
        assert.ok(
          Number.isFinite(
            prediction.predictedValue,
          ),
        );
        assert.ok(
          Number.isFinite(
            prediction.residual,
          ),
        );
        assert.ok(
          Number.isFinite(
            prediction.absoluteError,
          ),
        );
        assert.ok(
          Number.isFinite(
            prediction.squaredError,
          ),
        );
      },
    );

    assert.ok(
      Number.isFinite(
        result.metrics.meanError,
      ),
    );
    assert.ok(
      Number.isFinite(
        result.metrics.meanAbsoluteError,
      ),
    );
    assert.ok(
      Number.isFinite(
        result.metrics.rootMeanSquareError,
      ),
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

/* ============================================================
   FIXED PARAMETERS
   ============================================================ */

test("uses the same fixed Kriging parameters across every fold", () => {
  const points = createPoints();
  const parameters = createParameters();

  const original =
    krigingInterpolation.interpolateKriging;

  const receivedParameters = [];

  krigingInterpolation.interpolateKriging = (
    trainingPoints,
    target,
    suppliedParameters,
  ) => {
    receivedParameters.push(
      suppliedParameters,
    );

    return {
      success: true,
      predictedValue: 25,
    };
  };

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, true);
    assert.equal(
      receivedParameters.length,
      points.length,
    );

    receivedParameters.forEach(
      (suppliedParameters) => {
        assert.deepEqual(
          suppliedParameters,
          parameters,
        );
        assert.equal(
          suppliedParameters,
          parameters,
        );
      },
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

/* ============================================================
   FAILED FOLDS
   ============================================================ */

test("preserves a failed validation fold", () => {
  const points = createPoints();
  const parameters = createParameters();

  const original =
    krigingInterpolation.interpolateKriging;

  let callCount = 0;

  krigingInterpolation.interpolateKriging = () => {
    callCount += 1;

    if (callCount === 2) {
      return {
        success: false,
        error: "Simulated Kriging failure.",
        errors: [
          "Simulated Kriging failure.",
        ],
      };
    }

    return {
      success: true,
      predictedValue: 25,
    };
  };

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, true);
    assert.equal(
      result.successfulValidationCount,
      3,
    );
    assert.equal(
      result.failedValidationCount,
      1,
    );
    assert.equal(
      result.predictions.length,
      4,
    );

    const failed =
      result.predictions.find(
        (prediction) =>
          prediction.success === false,
      );

    assert.ok(failed);
    assert.equal(
      failed.predictedValue,
      null,
    );
    assert.equal(
      failed.residual,
      null,
    );
    assert.equal(
      failed.absoluteError,
      null,
    );
    assert.equal(
      failed.squaredError,
      null,
    );
    assert.equal(
      failed.error,
      "Simulated Kriging failure.",
    );

    assert.ok(
      Number.isFinite(
        result.metrics.meanError,
      ),
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

test("returns failure when every validation fold fails", () => {
  const points = createPoints();
  const parameters = createParameters();

  const original =
    krigingInterpolation.interpolateKriging;

  krigingInterpolation.interpolateKriging =
    () => ({
      success: false,
      error: "Simulated total failure.",
      errors: [
        "Simulated total failure.",
      ],
    });

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, false);
    assert.equal(
      result.successfulValidationCount,
      0,
    );
    assert.equal(
      result.failedValidationCount,
      points.length,
    );
    assert.equal(
      result.predictions.length,
      points.length,
    );

    assert.deepEqual(
      result.metrics,
      {
        meanError: null,
        meanAbsoluteError: null,
        rootMeanSquareError: null,
      },
    );

    assert.ok(
      result.errors.some((error) =>
        /simulated total failure/i.test(error),
      ),
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

/* ============================================================
   INPUT IMMUTABILITY
   ============================================================ */

test("cross-validation does not mutate points or parameters", () => {
  const points = createPoints();
  const parameters = createParameters();

  const originalPoints =
    structuredClone(points);

  const originalParameters =
    structuredClone(parameters);

  const original =
    krigingInterpolation.interpolateKriging;

  krigingInterpolation.interpolateKriging =
    () => ({
      success: true,
      predictedValue: 25,
    });

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, true);
    assert.deepEqual(
      points,
      originalPoints,
    );
    assert.deepEqual(
      parameters,
      originalParameters,
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});

/* ============================================================
   METRIC CONSISTENCY
   ============================================================ */

test("aggregate metrics equal metrics calculated from successful folds", () => {
  const points = createPoints();
  const parameters = createParameters();

  const original =
    krigingInterpolation.interpolateKriging;

  let callCount = 0;

  krigingInterpolation.interpolateKriging = () => {
    callCount += 1;

    if (callCount === 4) {
      return {
        success: false,
        error: "Intentional fold failure.",
        errors: [
          "Intentional fold failure.",
        ],
      };
    }

    return {
      success: true,
      predictedValue: 24,
    };
  };

  try {
    const result =
      crossValidationService.crossValidateKriging({
        points,
        parameters,
      });

    assert.equal(result.success, true);
    assert.equal(
      result.successfulValidationCount,
      3,
    );
    assert.equal(
      result.failedValidationCount,
      1,
    );

    const expectedMetrics =
      crossValidationService.calculateValidationMetrics(
        result.predictions,
      );

    assert.deepEqual(
      result.metrics,
      expectedMetrics,
    );
  } finally {
    krigingInterpolation.interpolateKriging =
      original;
  }
});
