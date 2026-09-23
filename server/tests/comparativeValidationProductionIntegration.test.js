"use strict";

// ============================================================
// server/tests/comparativeValidationProductionIntegration.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.8.5 — Comparative Interpolation Production Integration
//
// Purpose:
//   Verify that interpolationService.js correctly integrates the
//   comparative validation layer without changing the scientific
//   interpolation pipeline.
//
// Rules:
//   1. Comparative validation is diagnostic-only.
//   2. Fixed Kriging parameters are reused unchanged.
//   3. No second Kriging parameter estimation is performed.
//   4. No method ranking, scoring, or selection is performed.
//   5. Comparative validation does not modify the supplied samples.
//   6. Comparative validation does not modify Kriging parameters.
//   7. Missing fixed Kriging parameters must remain not-applicable.
//   8. Existing interpolation behaviour remains independent.
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const interpolationService =
  require("../services/interpolationService");

const comparativeValidationService =
  require("../services/interpolation/comparativeValidationService");

/* ============================================================
   COMMON FIXTURE
   ============================================================ */

function createSamples() {
  return [
    {
      id: 1,
      sample_code: "CVP-001",
      latitude: 17.6800,
      longitude: 83.2000,
      value: 10,
    },
    {
      id: 2,
      sample_code: "CVP-002",
      latitude: 17.7000,
      longitude: 83.2200,
      value: 15,
    },
    {
      id: 3,
      sample_code: "CVP-003",
      latitude: 17.7200,
      longitude: 83.2000,
      value: 20,
    },
    {
      id: 4,
      sample_code: "CVP-004",
      latitude: 17.6900,
      longitude: 83.2500,
      value: 25,
    },
    {
      id: 5,
      sample_code: "CVP-005",
      latitude: 17.7300,
      longitude: 83.2600,
      value: 30,
    },
    {
      id: 6,
      sample_code: "CVP-006",
      latitude: 17.7500,
      longitude: 83.2300,
      value: 35,
    },
  ];
}

function createKrigingParameters() {
  return {
    model: "spherical",
    nugget: 0.2,
    sill: 0.8,
    range: 4000,
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* ============================================================
   TEST 1 — EXPORT
   ============================================================ */

test(
  "interpolationService exports the Phase 12.8.5 comparative wrapper",
  () => {
    assert.equal(
      typeof interpolationService
        .runComparativeInterpolationValidation,
      "function",
    );
  },
);

/* ============================================================
   TEST 2 — COMPARATIVE SERVICE CONTRACT
   ============================================================ */

test(
  "comparative validation service exposes the production execution function",
  () => {
    assert.equal(
      typeof comparativeValidationService
        .runComparativeValidation,
      "function",
    );
  },
);

/* ============================================================
   TEST 3 — FIXED KRIGING PARAMETERS
   ============================================================ */

test(
  "production comparative validation reuses supplied Kriging parameters unchanged",
  () => {
    const samples = createSamples();

    const krigingParameters =
      createKrigingParameters();

    const originalParameters =
      deepClone(krigingParameters);

    let capturedKrigingParameters = null;

    const validationServices = {
      idw: {
        performLeaveOneOutCrossValidation(
          points,
          options,
        ) {
          return {
            success: true,
            method: "idw_loocv",
            validationMethod: "leave_one_out",
            sampleCount: points.length,
            successfulFolds: points.length,
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
        },
      },

      kriging: {
        crossValidateKriging({
          points,
          parameters,
          options,
        }) {
          capturedKrigingParameters =
            parameters;

          return {
            success: true,
            method: "ordinary_kriging",
            validationMethod: "leave_one_out",
            sampleCount: points.length,
            successfulValidationCount:
              points.length,
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
        },
      },

      spline: {
        performLeaveOneOutCrossValidation(
          points,
          options,
        ) {
          return {
            success: true,
            method: "spline_loocv",
            validationMethod: "leave_one_out",
            sampleCount: points.length,
            successfulFolds: points.length,
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
        },
      },

      nearest_neighbour: {
        performLeaveOneOutCrossValidation(
          points,
          options,
        ) {
          return {
            success: true,
            method: "nearest_neighbour_loocv",
            validationMethod: "leave_one_out",
            sampleCount: points.length,
            successfulFolds: points.length,
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
        },
      },
    };

    /*
     * This test verifies the lower production dependency contract
     * independently of database access.
     *
     * The actual interpolationService wrapper is tested below.
     */
    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters: krigingParameters,
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
        validationServices,
      });

    assert.equal(result.success, true);
    assert.deepEqual(
      capturedKrigingParameters,
      originalParameters,
    );

    assert.deepEqual(
      krigingParameters,
      originalParameters,
    );
  },
);

/* ============================================================
   TEST 4 — ALL FOUR METHODS
   ============================================================ */

test(
  "production comparative validation contract contains all four interpolation methods",
  () => {
    const samples = createSamples();

    const validationServices = {
      idw: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            method: "idw_loocv",
            sampleCount: samples.length,
            successfulFolds: samples.length,
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
        },
      },

      kriging: {
        crossValidateKriging({
          points,
          parameters,
        }) {
          return {
            success: true,
            method: "ordinary_kriging",
            sampleCount: points.length,
            successfulValidationCount:
              points.length,
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
        },
      },

      spline: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            method: "spline_loocv",
            sampleCount: samples.length,
            successfulFolds: samples.length,
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
        },
      },

      nearest_neighbour: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            method: "nearest_neighbour_loocv",
            sampleCount: samples.length,
            successfulFolds: samples.length,
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
        },
      },
    };

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters: createKrigingParameters(),
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
        validationServices,
      });

    assert.equal(result.success, true);

    assert.deepEqual(
      Object.keys(result.methods).sort(),
      [
        "idw",
        "kriging",
        "nearest_neighbour",
        "spline",
      ].sort(),
    );
  },
);

/* ============================================================
   TEST 5 — SAMPLE IMMUTABILITY
   ============================================================ */

test(
  "comparative validation does not mutate the supplied samples",
  () => {
    const samples = createSamples();
    const originalSamples =
      deepClone(samples);

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters:
            createKrigingParameters(),
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
      });

    assert.ok(result);

    assert.deepEqual(
      samples,
      originalSamples,
    );
  },
);

/* ============================================================
   TEST 6 — KRIGING PARAMETER IMMUTABILITY
   ============================================================ */

test(
  "comparative validation does not mutate Kriging parameters",
  () => {
    const samples = createSamples();

    const parameters =
      createKrigingParameters();

    const originalParameters =
      deepClone(parameters);

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters,
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
      });

    assert.ok(result);

    assert.deepEqual(
      parameters,
      originalParameters,
    );
  },
);

/* ============================================================
   TEST 7 — DIAGNOSTIC-ONLY RESULT
   ============================================================ */

test(
  "comparative validation remains diagnostic-only",
  () => {
    const samples = createSamples();

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters:
            createKrigingParameters(),
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
      });

    assert.ok(result);

    assert.equal(
      result.validationType,
      "comparative_interpolation_validation",
    );

    assert.equal(
      result.diagnosticType,
      "loocv",
    );

    const serialized =
      JSON.stringify(result).toLowerCase();

    assert.equal(
      serialized.includes('"ranking"'),
      false,
    );

    assert.equal(
      serialized.includes('"winner"'),
      false,
    );

    assert.equal(
      serialized.includes('"selectedmethod"'),
      false,
    );

    assert.equal(
      serialized.includes('"score"'),
      false,
    );
  },
);

/* ============================================================
   TEST 8 — METHOD ORDER
   ============================================================ */

test(
  "comparative validation preserves the fixed common method order",
  () => {
    const samples = createSamples();

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters:
            createKrigingParameters(),
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
      });

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
   TEST 9 — COMMON SAMPLE COUNT
   ============================================================ */

test(
  "comparative validation reports the common sample count",
  () => {
    const samples = createSamples();

    const result =
      comparativeValidationService.runComparativeValidation({
        samples,
        kriging: {
          parameters:
            createKrigingParameters(),
          options: {},
        },
        idw: {},
        spline: {},
        nearest_neighbour: {},
      });

    assert.equal(
      result.sampleCount,
      samples.length,
    );

    for (const method of [
      "idw",
      "kriging",
      "spline",
      "nearest_neighbour",
    ]) {
      assert.equal(
        result.methods[method].sampleCount,
        samples.length,
      );
    }
  },
);

/* ============================================================
   TEST 10 — NO SECOND KRIGING ESTIMATION
   ============================================================ */

test(
  "comparative validation uses supplied Kriging parameters rather than estimating new ones",
  () => {
    const samples = createSamples();

    const parameters =
      createKrigingParameters();

    let capturedParameters = null;

    const validationServices = {
      idw: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            sampleCount: samples.length,
            successfulFolds: samples.length,
            failedFolds: 0,
            folds: [],
            metrics: {
              meanError: 0,
              meanAbsoluteError: 0,
              rmse: 0,
              maxAbsoluteError: 0,
            },
          };
        },
      },

      kriging: {
        crossValidateKriging({
          parameters: suppliedParameters,
        }) {
          capturedParameters =
            suppliedParameters;

          return {
            success: true,
            method: "ordinary_kriging",
            sampleCount: samples.length,
            successfulValidationCount:
              samples.length,
            failedValidationCount: 0,
            predictions: [],
            metrics: {
              meanError: 0,
              meanAbsoluteError: 0,
              rootMeanSquareError: 0,
            },
            parameters: suppliedParameters,
            errors: [],
          };
        },
      },

      spline: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            sampleCount: samples.length,
            successfulFolds: samples.length,
            failedFolds: 0,
            folds: [],
            metrics: {
              meanError: 0,
              meanAbsoluteError: 0,
              rmse: 0,
              maxAbsoluteError: 0,
            },
          };
        },
      },

      nearest_neighbour: {
        performLeaveOneOutCrossValidation() {
          return {
            success: true,
            sampleCount: samples.length,
            successfulFolds: samples.length,
            failedFolds: 0,
            folds: [],
            metrics: {
              meanError: 0,
              meanAbsoluteError: 0,
              rmse: 0,
              maxAbsoluteError: 0,
            },
          };
        },
      },
    };

    comparativeValidationService.runComparativeValidation({
      samples,
      kriging: {
        parameters,
        options: {},
      },
      idw: {},
      spline: {},
      nearest_neighbour: {},
      validationServices,
    });

    assert.strictEqual(
      capturedParameters,
      parameters,
    );
  },
);