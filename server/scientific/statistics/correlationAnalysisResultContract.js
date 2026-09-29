// ============================================================
// server/scientific/statistics/correlationAnalysisResultContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.2 — Correlation Analysis
//
// Responsibility:
//   - Validate Pearson correlation analysis results
//   - Preserve parameter and unit provenance
//   - Validate pair-count and coefficient integrity
//
// Does NOT:
//   - Calculate correlation
//   - Interpret correlation strength
//   - Infer causality
//   - Produce agricultural recommendations
//   - Apply weighting or scoring
//   - Perform prediction
//   - Perform risk modelling
//
// ============================================================

"use strict";

const REQUIRED_METHOD = "pearson";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateParameterDescriptor(parameter, name) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error(`${name} is required`);
  }

  if (typeof parameter.parameter !== "string" || !parameter.parameter.trim()) {
    throw new Error(`${name} parameter name is required`);
  }

  if (typeof parameter.unit !== "string" || !parameter.unit.trim()) {
    throw new Error(`${name} parameter unit is required`);
  }

  return true;
}

function validateCorrelationAnalysisResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Correlation analysis result is required");
  }

  if (result.type !== "correlation_analysis") {
    throw new Error("Invalid correlation analysis result type");
  }

  if (typeof result.version !== "string" || !result.version.trim()) {
    throw new Error("Correlation analysis result version is required");
  }

  if (result.method !== REQUIRED_METHOD) {
    throw new Error("Correlation analysis method must be pearson");
  }

  validateParameterDescriptor(result.parameterA, "Correlation parameterA");
  validateParameterDescriptor(result.parameterB, "Correlation parameterB");

  if (result.parameterA.parameter === result.parameterB.parameter) {
    throw new Error("Correlation parameters must be different");
  }

  if (
    !Number.isInteger(result.pairCount) ||
    result.pairCount < 0
  ) {
    throw new Error("Correlation pairCount must be a non-negative integer");
  }

  if (result.pairCount < 2) {
    if (result.correlation !== null) {
      throw new Error(
        "Correlation must be null when pairCount is less than two",
      );
    }
  } else if (result.correlation !== null) {
    if (!isFiniteNumber(result.correlation)) {
      throw new Error("Correlation must be finite or null");
    }

    if (result.correlation < -1 || result.correlation > 1) {
      throw new Error("Correlation must be between -1 and 1");
    }
  }

  return true;
}

module.exports = {
  REQUIRED_METHOD,
  validateParameterDescriptor,
  validateCorrelationAnalysisResult,
};