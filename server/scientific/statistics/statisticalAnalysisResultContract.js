// ============================================================
// server/scientific/statistics/statisticalAnalysisResultContract.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.1 — Statistical Analysis Foundation
//
// Responsibility:
//   - Validate descriptive statistical analysis results
//   - Preserve parameter and unit provenance
//   - No statistical calculation
//   - No agricultural interpretation
//   - No scoring, ranking, weighting, or prediction
//
// ============================================================

"use strict";

const REQUIRED_STATISTICS = [
  "count",
  "minimum",
  "maximum",
  "mean",
  "median",
  "variance",
  "standardDeviation",
];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateStatisticalParameter(parameter) {
  if (!parameter || typeof parameter !== "object") {
    throw new Error("Statistical parameter result is required");
  }

  if (typeof parameter.parameter !== "string" || !parameter.parameter.trim()) {
    throw new Error("Statistical parameter name is required");
  }

  if (typeof parameter.unit !== "string" || !parameter.unit.trim()) {
    throw new Error("Statistical parameter unit is required");
  }

  if (!Number.isInteger(parameter.sampleCount) || parameter.sampleCount < 0) {
    throw new Error("Statistical sample count must be a non-negative integer");
  }

  if (!parameter.statistics || typeof parameter.statistics !== "object") {
    throw new Error("Statistical values are required");
  }

  for (const name of REQUIRED_STATISTICS) {
    if (name === "count") {
      if (parameter.statistics.count !== parameter.sampleCount) {
        throw new Error("Statistical count must equal sampleCount");
      }

      continue;
    }

    if (parameter.sampleCount === 0) {
      if (parameter.statistics[name] !== null) {
        throw new Error(
          `Statistical value '${name}' must be null when sampleCount is zero`,
        );
      }
    } else if (!isFiniteNumber(parameter.statistics[name])) {
      throw new Error(`Statistical value '${name}' must be finite`);
    }
  }

  return true;
}

function validateStatisticalAnalysisResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Statistical analysis result is required");
  }

  if (result.type !== "statistical_analysis") {
    throw new Error("Invalid statistical analysis result type");
  }

  if (typeof result.version !== "string" || !result.version.trim()) {
    throw new Error("Statistical analysis result version is required");
  }

  if (!Array.isArray(result.parameters)) {
    throw new Error("Statistical analysis parameters must be an array");
  }

  result.parameters.forEach(validateStatisticalParameter);

  return true;
}

module.exports = {
  REQUIRED_STATISTICS,
  validateStatisticalParameter,
  validateStatisticalAnalysisResult,
};
