"use strict";

// ============================================================
// server/tests/krigingPredictionDiagnosticsService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.5.2  Kriging Prediction Diagnostics
//
// Test coverage:
//   1. Export contract
//   2. Numeric validation
//   3. Prediction residual
//   4. Absolute error
//   5. Squared error
//   6. Relative error
//   7. Relative error percentage
//   8. Over-prediction
//   9. Zero observed value
//  10. Both-zero values
//  11. Invalid observed value
//  12. Invalid predicted value
//  13. Both values invalid
//  14. Input immutability
//  15. Deterministic calculation
//  16. Error normalization
//
// ============================================================

const assert = require("node:assert/strict");
const test = require("node:test");

const diagnosticsService = require(
  "../services/interpolation/krigingPredictionDiagnosticsService",
);


/* ============================================================
   EXPORT CONTRACT
   ============================================================ */

test("exports the complete prediction diagnostics contract", () => {
  assert.equal(
    typeof diagnosticsService.isFiniteNumber,
    "function",
  );

  assert.equal(
    typeof diagnosticsService.normalizeDiagnosticError,
    "function",
  );

  assert.equal(
    typeof diagnosticsService.validatePredictionDiagnosticInput,
    "function",
  );

  assert.equal(
    typeof diagnosticsService.calculatePredictionDiagnostics,
    "function",
  );
});


/* ============================================================
   NUMERIC VALIDATION
   ============================================================ */

test("accepts finite observed and predicted values", () => {
  const result =
    diagnosticsService.validatePredictionDiagnosticInput({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});


test("rejects non-finite observed value", () => {
  const result =
    diagnosticsService.validatePredictionDiagnosticInput({
      observedValue: NaN,
      predictedValue: 18,
    });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      /observed value must be a finite number/i.test(error),
    ),
  );
});


test("rejects non-finite predicted value", () => {
  const result =
    diagnosticsService.validatePredictionDiagnosticInput({
      observedValue: 20,
      predictedValue: Infinity,
    });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      /predicted value must be a finite number/i.test(error),
    ),
  );
});


/* ============================================================
   BASIC DIAGNOSTICS
   ============================================================ */

test("calculates prediction residual using predicted minus observed", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.success, true);
  assert.equal(result.predictionResidual, -2);
});


test("calculates absolute error", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.absoluteError, 2);
});


test("calculates squared error", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.squaredError, 4);
});


test("calculates relative error", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.relativeError, 0.1);
});


test("calculates relative error percentage", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: 18,
    });

  assert.equal(result.relativeErrorPercent, 10);
});


/* ============================================================
   OVER-PREDICTION
   ============================================================ */

test("preserves positive residual for over-prediction", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 10,
      predictedValue: 12,
    });

  assert.equal(result.predictionResidual, 2);
  assert.equal(result.absoluteError, 2);
  assert.equal(result.squaredError, 4);
  assert.equal(result.relativeError, 0.2);
  assert.equal(result.relativeErrorPercent, 20);
});


/* ============================================================
   ZERO OBSERVED VALUE
   ============================================================ */

test("returns null relative error when observed value is zero", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 0,
      predictedValue: 5,
    });

  assert.equal(result.success, true);
  assert.equal(result.predictionResidual, 5);
  assert.equal(result.absoluteError, 5);
  assert.equal(result.squaredError, 25);
  assert.equal(result.relativeError, null);
  assert.equal(result.relativeErrorPercent, null);

  assert.ok(
    result.warnings.some((warning) =>
      /relative error is undefined/i.test(warning),
    ),
  );
});


test("returns zero errors when both observed and predicted values are zero", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 0,
      predictedValue: 0,
    });

  assert.equal(result.success, true);
  assert.equal(result.predictionResidual, 0);
  assert.equal(result.absoluteError, 0);
  assert.equal(result.squaredError, 0);
  assert.equal(result.relativeError, null);
  assert.equal(result.relativeErrorPercent, null);
});


/* ============================================================
   INVALID INPUT
   ============================================================ */

test("returns failure for invalid observed value", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: NaN,
      predictedValue: 18,
    });

  assert.equal(result.success, false);
  assert.equal(result.observedValue, null);
  assert.equal(result.predictedValue, 18);
  assert.equal(result.predictionResidual, null);
  assert.equal(result.absoluteError, null);
  assert.equal(result.squaredError, null);
  assert.equal(result.relativeError, null);
  assert.equal(result.relativeErrorPercent, null);
  assert.ok(result.errors.length > 0);
});


test("returns failure for invalid predicted value", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: 20,
      predictedValue: Infinity,
    });

  assert.equal(result.success, false);
  assert.equal(result.observedValue, 20);
  assert.equal(result.predictedValue, null);
  assert.equal(result.predictionResidual, null);
  assert.equal(result.absoluteError, null);
  assert.equal(result.squaredError, null);
  assert.equal(result.relativeError, null);
  assert.equal(result.relativeErrorPercent, null);
  assert.ok(result.errors.length > 0);
});


test("returns failure when both values are invalid", () => {
  const result =
    diagnosticsService.calculatePredictionDiagnostics({
      observedValue: NaN,
      predictedValue: Infinity,
    });

  assert.equal(result.success, false);
  assert.equal(result.observedValue, null);
  assert.equal(result.predictedValue, null);
  assert.equal(result.predictionResidual, null);
  assert.equal(result.absoluteError, null);
  assert.equal(result.squaredError, null);
  assert.equal(result.relativeError, null);
  assert.equal(result.relativeErrorPercent, null);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.warnings, []);
});


/* ============================================================
   IMMUTABILITY
   ============================================================ */

test("diagnostic calculation does not mutate the input", () => {
  const input = {
    observedValue: 20,
    predictedValue: 18,
  };

  const original =
    structuredClone(input);

  diagnosticsService.calculatePredictionDiagnostics(
    input,
  );

  assert.deepEqual(input, original);
});


/* ============================================================
   DETERMINISTIC RESULT
   ============================================================ */

test("returns deterministic diagnostics for identical input", () => {
  const input = {
    observedValue: 37.5,
    predictedValue: 34.25,
  };

  const first =
    diagnosticsService.calculatePredictionDiagnostics(
      input,
    );

  const second =
    diagnosticsService.calculatePredictionDiagnostics(
      input,
    );

  assert.deepEqual(first, second);
});


/* ============================================================
   ERROR NORMALIZATION
   ============================================================ */

test("normalizes Error instances", () => {
  assert.equal(
    diagnosticsService.normalizeDiagnosticError(
      new Error("Diagnostic failure."),
    ),
    "Diagnostic failure.",
  );
});


test("normalizes string errors", () => {
  assert.equal(
    diagnosticsService.normalizeDiagnosticError(
      "Diagnostic failure.",
    ),
    "Diagnostic failure.",
  );
});


test("returns fallback for unknown error values", () => {
  assert.equal(
    diagnosticsService.normalizeDiagnosticError(
      { code: "UNKNOWN" },
    ),
    "Kriging prediction diagnostics failed.",
  );
});




