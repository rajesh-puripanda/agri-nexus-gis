"use strict";

// ============================================================
// server/services/agriculturalRiskIntegrationService.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.7.3 — Agricultural Risk Real-data Integration
//
// Purpose:
// - Bridge authoritative soil-analysis results to the
//   agricultural risk calculation service.
// - Preserve soil-analysis scientific authority.
// - Require explicitly supplied dimensionless risk inputs.
// - Support real repository-backed soil observations.
//
// IMPORTANT:
// - This service does NOT invent agronomic thresholds.
// - This service does NOT interpret raw soil units as risk.
// - This service does NOT classify soil.
// - This service does NOT assign risk direction.
// - This service does NOT assign risk weights implicitly.
//
// Scientific flow:
//
//   soilRepository
//        ↓
//   soilAnalysisService
//        ↓
//   this integration service
//        ↓
//   agriculturalRiskService
//
// The caller/model supplies the dimensionless, non-negative
// risk contribution for each selected parameter.
//
// ============================================================

const {
  getAllSoilSamples,
} = require("../repositories/soilRepository");

const {
  analyzeSample,
} = require("./soilAnalysisService");

const {
  buildAgriculturalRiskResult,
} = require("./agriculturalRiskService");

// ============================================================
// Constants
// ============================================================

const AGRICULTURAL_RISK_INTEGRATION_VERSION = "1.0";

const PARAMETER_DEFINITIONS = Object.freeze({
  pH: {
    sourceKey: "pH",
    unit: "pH",
  },

  nitrogen: {
    sourceKey: "nitrogen",
    unit: "kg/ha",
  },

  phosphorus: {
    sourceKey: "phosphorus",
    unit: "kg/ha",
  },

  potassium: {
    sourceKey: "potassium",
    unit: "kg/ha",
  },

  organicCarbon: {
    sourceKey: "organicCarbon",
    unit: "%",
  },

  electricalConductivity: {
    sourceKey: "electricalConductivity",
    unit: "dS/m",
  },
});

// ============================================================
// Validation helpers
// ============================================================

function isFiniteNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function validateObservationId(observationId) {
  if (
    typeof observationId !== "string" ||
    !observationId.trim()
  ) {
    throw new Error(
      "Agricultural risk integration observationId is required",
    );
  }

  return true;
}

function validateRiskInput(input, index) {
  if (!input || typeof input !== "object") {
    throw new Error(
      `Agricultural risk integration input ${index} is required`,
    );
  }

  if (
    typeof input.parameter !== "string" ||
    !input.parameter.trim()
  ) {
    throw new Error(
      `Agricultural risk integration input ${index} parameter is required`,
    );
  }

  if (
    typeof input.unit !== "string" ||
    !input.unit.trim()
  ) {
    throw new Error(
      `Agricultural risk integration input ${index} unit is required`,
    );
  }

  if (!isFiniteNumber(input.value)) {
    throw new Error(
      `Agricultural risk integration input ${index} value must be finite`,
    );
  }

  if (input.value < 0) {
    throw new Error(
      `Agricultural risk integration input ${index} value must be non-negative`,
    );
  }

  if (!isFiniteNumber(input.weight)) {
    throw new Error(
      `Agricultural risk integration input ${index} weight must be finite`,
    );
  }

  if (input.weight < 0) {
    throw new Error(
      `Agricultural risk integration input ${index} weight must be non-negative`,
    );
  }

  return true;
}

// ============================================================
// Authoritative analysis validation
// ============================================================

function validateAnalysisResult(analysis) {
  if (!analysis || typeof analysis !== "object") {
    throw new Error(
      "Agricultural risk integration analysis is required",
    );
  }

  if (
    !analysis.values ||
    typeof analysis.values !== "object"
  ) {
    throw new Error(
      "Agricultural risk integration analysis values are required",
    );
  }

  return true;
}

// ============================================================
// Risk input construction
//
// The supplied riskInputs are deliberately kept separate from
// authoritative soil values.
//
// This prevents raw pH, nutrient, organic-carbon, and EC units
// from being silently interpreted as comparable risk values.
// ============================================================

function buildRiskInputs(riskInputs) {
  if (!Array.isArray(riskInputs)) {
    throw new Error(
      "Agricultural risk integration riskInputs must be an array",
    );
  }

  if (riskInputs.length === 0) {
    throw new Error(
      "Agricultural risk integration requires at least one risk input",
    );
  }

  const parameters = new Set();

  const normalizedInputs = riskInputs.map(
    (input, index) => {
      validateRiskInput(input, index);

      if (parameters.has(input.parameter)) {
        throw new Error(
          `Duplicate agricultural risk integration parameter: ${input.parameter}`,
        );
      }

      parameters.add(input.parameter);

      return {
        parameter: input.parameter,
        unit: input.unit,
        value: input.value,
        weight: input.weight,
      };
    },
  );

  return normalizedInputs;
}

// ============================================================
// Single observation integration
//
// analysis:
//   authoritative result from soilAnalysisService.analyzeSample
//
// riskInputs:
//   explicitly supplied dimensionless risk contributions
// ============================================================

function buildIntegratedRiskObservation(
  observationId,
  analysis,
  riskInputs,
) {
  validateObservationId(observationId);
  validateAnalysisResult(analysis);

  const inputs = buildRiskInputs(riskInputs);

  return {
    observationId,
    analysis,
    riskInputs: inputs,
  };
}

// ============================================================
// Multi-observation integration
// ============================================================
//
// Each observation must provide:
// - observationId
// - analysis
// - riskInputs
//
// The riskInputs are already dimensionless and non-negative.
// No normalization is performed here.
//
// ============================================================

function buildIntegratedRiskResult(observations) {
  if (!Array.isArray(observations)) {
    throw new Error(
      "Agricultural risk integration observations must be an array",
    );
  }

  const observationIds = new Set();

  const riskObservations = observations.map(
    (observation, index) => {
      if (
        !observation ||
        typeof observation !== "object"
      ) {
        throw new Error(
          `Agricultural risk integration observation ${index} is required`,
        );
      }

      validateObservationId(
        observation.observationId,
      );

      if (
        observationIds.has(
          observation.observationId,
        )
      ) {
        throw new Error(
          `Duplicate agricultural risk integration observation: ${observation.observationId}`,
        );
      }

      observationIds.add(
        observation.observationId,
      );

      const integrated =
        buildIntegratedRiskObservation(
          observation.observationId,
          observation.analysis,
          observation.riskInputs,
        );

      return {
        observationId:
          integrated.observationId,

        inputs:
          integrated.riskInputs,
      };
    },
  );

  return buildAgriculturalRiskResult(
    riskObservations,
  );
}

// ============================================================
// Repository-backed authoritative analysis
// ============================================================

async function loadAnalyzedSoilObservations() {
  const samples =
    await getAllSoilSamples();

  if (!Array.isArray(samples)) {
    throw new Error(
      "Agricultural risk integration soil repository result must be an array",
    );
  }

  return samples.map((sample) => ({
    observationId:
      typeof sample.sample_code === "string" &&
      sample.sample_code.trim()
        ? sample.sample_code
        : String(sample.id),

    analysis:
      analyzeSample(sample),
  }));
}

// ============================================================
// Repository-backed integration
//
// riskInputResolver receives:
//
// {
//   observationId,
//   analysis
// }
//
// and MUST return an array containing explicit
// dimensionless, non-negative risk contributions.
//
// The resolver is intentionally supplied by the caller so that
// this integration layer never invents agronomic meaning.
// ============================================================

async function buildRepositoryAgriculturalRiskResult(
  riskInputResolver,
) {
  if (
    typeof riskInputResolver !== "function"
  ) {
    throw new Error(
      "Agricultural risk integration riskInputResolver must be a function",
    );
  }

  const analyzedObservations =
    await loadAnalyzedSoilObservations();

  const observations =
    analyzedObservations.map(
      (observation) => ({
        observationId:
          observation.observationId,

        analysis:
          observation.analysis,

        riskInputs:
          riskInputResolver({
            observationId:
              observation.observationId,

            analysis:
              observation.analysis,
          }),
      }),
    );

  return buildIntegratedRiskResult(
    observations,
  );
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  AGRICULTURAL_RISK_INTEGRATION_VERSION,

  PARAMETER_DEFINITIONS,

  isFiniteNumber,

  validateObservationId,

  validateRiskInput,

  validateAnalysisResult,

  buildRiskInputs,

  buildIntegratedRiskObservation,

  buildIntegratedRiskResult,

  loadAnalyzedSoilObservations,

  buildRepositoryAgriculturalRiskResult,
};
