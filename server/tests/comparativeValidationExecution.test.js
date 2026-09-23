"use strict";

// ============================================================
// server/tests/comparativeValidationExecution.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.3 — Common Comparative Validation Service
// Execution Tests
//
// Responsibilities:
//   1. Verify execution delegation to all four LOOCV services
//   2. Verify Kriging parameters are passed unchanged
//   3. Verify method-specific options are forwarded
//   4. Verify failures are isolated
//   5. Verify final results use the common contract
//   6. Verify input immutability
//   7. Verify deterministic execution structure
//
// Scientific rules:
//   - No interpolation mathematics is implemented here
//   - No method is ranked
//   - No method is scored
//   - No method is selected
//   - No acceptance threshold is introduced
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const comparativeValidationService =
  require(
    "../services/interpolation/comparativeValidationService",
  );

/* ============================================================
   TEST FIXTURES
   ============================================================ */

function createSamples() {
  return [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.71234,
      longitude: 83.30125,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.72234,
      longitude: 83.31125,
      value: 20,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.73234,
      longitude: 83.32125,
      value: 30,
    },
    {
      id: 4,
      sample_code: "S-004",
      latitude: 17.74234,
      longitude: 83.33125,
      value: 40,
    },
  ];
}

function createKrigingParameters() {
  return {
    model: "spherical",
    nugget: 0.2,
    sill: 0.8,
    range: 4000,
    structuredVariance: 0.6,
  };
}

function createSuccessfulResult(
  method,
  sampleCount,
) {
  return {
    success: true,
    status: "complete",
    method,
    validationMethod: "leave_one_out",
    sampleCount,
    successfulFolds: sampleCount,
    failedFolds: 0,
    folds: [],
    metrics: {
      meanError: 0,
      meanAbsoluteError: 0,
      rmse: 0,
      maxAbsoluteError: 0,
    },
    errors: [],
  };
}

function createKrigingSuccessfulResult(
  sampleCount,
  parameters,
) {
  return {
    success: true,
    method: "ordinary_kriging",
    validationMethod: "leave_one_out",
    sampleCount,
    successfulValidationCount: sampleCount,
    failedValidationCount: 0,
    predictions: [],
    metrics: {
      meanError: 0,
      meanAbsoluteError: 0,
      rootMeanSquareError: 0,
    },
    parameters,
    errors: [],
  };
}

function createValidationServices(
  overrides = {},
) {
  return {
    idw: {
      performLeaveOneOutCrossValidation:
        overrides.idw ??
        (() =>
          createSuccessfulResult(
            "idw",
            4,
          )),
    },

    kriging: {
      crossValidateKriging:
        overrides.kriging ??
        (() =>
          createKrigingSuccessfulResult(
            4,
            createKrigingParameters(),
          )),
    },

    spline: {
      performLeaveOneOutCrossValidation:
        overrides.spline ??
        (() =>
          createSuccessfulResult(
            "thin_plate_spline_loocv",
            4,
          )),
    },

    nearest_neighbour: {
      performLeaveOneOutCrossValidation:
        overrides.nearest_neighbour ??
        (() =>
          createSuccessfulResult(
            "nearest_neighbour_loocv",
            4,
          )),
    },
  };
}

/* ============================================================
   BASIC EXECUTION
   ============================================================ */

test(
  "runComparativeValidation invokes all four LOOCV services",
  () => {
    const samples = createSamples();

    const calls = {
      idw: 0,
      kriging: 0,
      spline: 0,
      nearest_neighbour: 0,
    };

    const services =
      createValidationServices({
        idw: () => {
          calls.idw += 1;

          return createSuccessfulResult(
            "idw",
            samples.length,
          );
        },

        kriging: () => {
          calls.kriging += 1;

          return createKrigingSuccessfulResult(
            samples.length,
            createKrigingParameters(),
          );
        },

        spline: () => {
          calls.spline += 1;

          return createSuccessfulResult(
            "thin_plate_spline_loocv",
            samples.length,
          );
        },

        nearest_neighbour: () => {
          calls.nearest_neighbour += 1;

          return createSuccessfulResult(
            "nearest_neighbour_loocv",
            samples.length,
          );
        },
      });

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples,
          validationServices: services,
        },
      );

    assert.equal(
      calls.idw,
      1,
    );

    assert.equal(
      calls.kriging,
      1,
    );

    assert.equal(
      calls.spline,
      1,
    );

    assert.equal(
      calls.nearest_neighbour,
      1,
    );

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.status,
      "complete",
    );
  },
);

/* ============================================================
   COMMON RESULT CONTRACT
   ============================================================ */

test(
  "runComparativeValidation returns all four normalized methods",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices:
            createValidationServices(),
        },
      );

    assert.deepEqual(
      Object.keys(result.methods).sort(),
      [
        "idw",
        "kriging",
        "nearest_neighbour",
        "spline",
      ],
    );

    for (const method of Object.values(
      result.methods,
    )) {
      assert.equal(
        method.diagnosticType,
        "loocv",
      );

      assert.equal(
        method.applicable,
        true,
      );

      assert.equal(
        method.status,
        "complete",
      );
    }
  },
);

/* ============================================================
   KRIGING PARAMETER PRESERVATION
   ============================================================ */

test(
  "runComparativeValidation passes Kriging parameters unchanged",
  () => {
    const samples = createSamples();

    const krigingParameters =
      createKrigingParameters();

    let receivedParameters = null;

    const services =
      createValidationServices({
        kriging: ({
          points,
          parameters,
          options,
        }) => {
          assert.strictEqual(
            points,
            samples,
          );

          receivedParameters =
            parameters;

          assert.deepEqual(
            options,
            {
              solverTolerance: 1e-10,
            },
          );

          return createKrigingSuccessfulResult(
            samples.length,
            parameters,
          );
        },
      });

    comparativeValidationService.runComparativeValidation(
      {
        samples,

        kriging: {
          parameters:
            krigingParameters,

          options: {
            solverTolerance: 1e-10,
          },
        },

        validationServices: services,
      },
    );

    assert.strictEqual(
      receivedParameters,
      krigingParameters,
    );
  },
);

/* ============================================================
   METHOD-SPECIFIC OPTIONS
   ============================================================ */

test(
  "runComparativeValidation forwards method-specific options",
  () => {
    const samples = createSamples();

    const idwOptions = {
      power: 2.5,
    };

    const splineOptions = {
      tolerance: 1e-9,
    };

    const nearestNeighbourOptions = {
      diagnosticMode: true,
    };

    let receivedIdwOptions;
    let receivedSplineOptions;
    let receivedNearestNeighbourOptions;

    const services =
      createValidationServices({
        idw: (
          receivedSamples,
          options,
        ) => {
          assert.strictEqual(
            receivedSamples,
            samples,
          );

          receivedIdwOptions =
            options;

          return createSuccessfulResult(
            "idw",
            samples.length,
          );
        },

        spline: (
          receivedSamples,
          options,
        ) => {
          assert.strictEqual(
            receivedSamples,
            samples,
          );

          receivedSplineOptions =
            options;

          return createSuccessfulResult(
            "thin_plate_spline_loocv",
            samples.length,
          );
        },

        nearest_neighbour: (
          receivedSamples,
          options,
        ) => {
          assert.strictEqual(
            receivedSamples,
            samples,
          );

          receivedNearestNeighbourOptions =
            options;

          return createSuccessfulResult(
            "nearest_neighbour_loocv",
            samples.length,
          );
        },
      });

    comparativeValidationService.runComparativeValidation(
      {
        samples,
        idwOptions,
        splineOptions,
        nearestNeighbourOptions,
        validationServices: services,
      },
    );

    assert.strictEqual(
      receivedIdwOptions,
      idwOptions,
    );

    assert.strictEqual(
      receivedSplineOptions,
      splineOptions,
    );

    assert.strictEqual(
      receivedNearestNeighbourOptions,
      nearestNeighbourOptions,
    );
  },
);

/* ============================================================
   FAILURE ISOLATION
   ============================================================ */

test(
  "runComparativeValidation isolates a failing method",
  () => {
    const samples = createSamples();

    const services =
      createValidationServices({
        idw: () => {
          throw new Error(
            "IDW execution failure",
          );
        },
      });

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples,
          validationServices: services,
        },
      );

    assert.equal(
      result.status,
      "completed_with_failures",
    );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.methods.idw.status,
      "failed",
    );

    assert.equal(
      result.methods.kriging.status,
      "complete",
    );

    assert.equal(
      result.methods.spline.status,
      "complete",
    );

    assert.equal(
      result.methods.nearest_neighbour.status,
      "complete",
    );

    assert.equal(
      result.executionErrors.length,
      1,
    );

    assert.equal(
      result.executionErrors[0].method,
      "idw",
    );

    assert.equal(
      result.executionErrors[0].error,
      "IDW execution failure",
    );
  },
);

/* ============================================================
   MULTIPLE FAILURES
   ============================================================ */

test(
  "runComparativeValidation preserves multiple execution failures",
  () => {
    const services =
      createValidationServices({
        idw: () => {
          throw new Error(
            "IDW failed",
          );
        },

        spline: () => {
          throw new Error(
            "Spline failed",
          );
        },
      });

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices: services,
        },
      );

    assert.equal(
      result.success,
      false,
    );

    assert.equal(
      result.status,
      "completed_with_failures",
    );

    assert.equal(
      result.executionErrors.length,
      2,
    );

    assert.deepEqual(
      result.executionErrors.map(
        (entry) => entry.method,
      ),
      [
        "idw",
        "spline",
      ],
    );

    assert.equal(
      result.methods.kriging.status,
      "complete",
    );

    assert.equal(
      result.methods.nearest_neighbour.status,
      "complete",
    );
  },
);

/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

test(
  "runComparativeValidation normalizes thrown string errors",
  () => {
    const services =
      createValidationServices({
        idw: () => {
          throw "IDW string failure";
        },
      });

    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices: services,
        },
      );

    assert.equal(
      result.methods.idw.status,
      "failed",
    );

    assert.equal(
      result.executionErrors[0].error,
      "IDW string failure",
    );
  },
);

/* ============================================================
   RESULT NORMALIZATION
   ============================================================ */

test(
  "runComparativeValidation normalizes Kriging metric names",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),

          validationServices:
            createValidationServices({
              kriging: ({
                parameters,
              }) => ({
                success: true,
                method:
                  "ordinary_kriging",
                validationMethod:
                  "leave_one_out",
                sampleCount: 4,
                successfulValidationCount:
                  4,
                failedValidationCount: 0,
                predictions: [],
                metrics: {
                  meanError: 1,
                  meanAbsoluteError: 2,
                  rootMeanSquareError: 3,
                },
                parameters,
              }),
            }),
        },
      );

    assert.deepEqual(
      result.methods.kriging.metrics,
      {
        meanError: 1,
        meanAbsoluteError: 2,
        rmse: 3,
        maxAbsoluteError: null,
      },
    );

    assert.equal(
      result.methods.kriging.successfulFolds,
      4,
    );

    assert.equal(
      result.methods.kriging.failedFolds,
      0,
    );
  },
);

/* ============================================================
   SAMPLE COUNT
   ============================================================ */

test(
  "runComparativeValidation preserves the common sample count",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices:
            createValidationServices(),
        },
      );

    assert.equal(
      result.sampleCount,
      4,
    );

    for (const method of Object.values(
      result.methods,
    )) {
      assert.equal(
        method.sampleCount,
        4,
      );
    }
  },
);

/* ============================================================
   SUMMARY
   ============================================================ */

test(
  "runComparativeValidation reports factual method availability",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices:
            createValidationServices(),
        },
      );

    assert.deepEqual(
      result.summary,
      {
        methodCount: 4,
        applicableMethodCount: 4,
        completeMethodCount: 4,
        failedMethodCount: 0,
        notApplicableMethodCount: 0,
      },
    );
  },
);

/* ============================================================
   INPUT IMMUTABILITY
   ============================================================ */

test(
  "runComparativeValidation does not mutate samples",
  () => {
    const samples =
      createSamples();

    const original =
      JSON.parse(
        JSON.stringify(samples),
      );

    comparativeValidationService.runComparativeValidation(
      {
        samples,
        validationServices:
          createValidationServices(),
      },
    );

    assert.deepEqual(
      samples,
      original,
    );
  },
);

test(
  "runComparativeValidation does not mutate Kriging parameters",
  () => {
    const samples =
      createSamples();

    const parameters =
      createKrigingParameters();

    const original =
      JSON.parse(
        JSON.stringify(parameters),
      );

    comparativeValidationService.runComparativeValidation(
      {
        samples,

        kriging: {
          parameters,
        },

        validationServices:
          createValidationServices(),
      },
    );

    assert.deepEqual(
      parameters,
      original,
    );
  },
);

/* ============================================================
   DETERMINISTIC METHOD ORDER
   ============================================================ */

test(
  "runComparativeValidation returns methods in the fixed common contract",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices:
            createValidationServices(),
        },
      );

    assert.deepEqual(
      Object.keys(result.methods),
      [
        "idw",
        "kriging",
        "spline",
        "nearest_neighbour",
      ],
    );
  },
);

/* ============================================================
   NO RANKING OR SELECTION
   ============================================================ */

test(
  "runComparativeValidation does not add ranking or selection fields",
  () => {
    const result =
      comparativeValidationService.runComparativeValidation(
        {
          samples: createSamples(),
          validationServices:
            createValidationServices(),
        },
      );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "ranking",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "score",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "selectedMethod",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "preferredMethod",
      ),
      false,
    );
  },
);
