"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AGRICULTURAL_RISK_INTEGRATION_VERSION,
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateObservationId,
  validateRiskInput,
  validateAnalysisResult,
  buildRiskInputs,
  buildIntegratedRiskObservation,
  buildIntegratedRiskResult,
} = require("../services/agriculturalRiskIntegrationService");

// ============================================================
// Fixtures
// ============================================================

function createAnalysis(overrides = {}) {
  return {
    standard:
      "Government of India Soil Health Card / Soil Testing Manual",

    version: "Baseline",

    soilTexture: "Loamy",

    values: {
      pH: {
        value: 6.5,
        unit: "pH",
        classification: "Neutral",
      },

      nitrogen: {
        value: 190,
        unit: "kg/ha",
        classification: "Low",
      },

      phosphorus: {
        value: 16,
        unit: "kg/ha",
        classification: "Medium",
      },

      potassium: {
        value: 220,
        unit: "kg/ha",
        classification: "Medium",
      },

      organicCarbon: {
        value: 0.5,
        unit: "%",
        classification: "Low",
      },

      electricalConductivity: {
        value: 0.6,
        unit: "dS/m",
        classification: "Very Slightly Saline",
      },
    },

    overallFertility: "Moderate",

    ...overrides,
  };
}

function createRiskInputs() {
  return [
    {
      parameter: "pH",
      unit: "dimensionless",
      value: 0.20,
      weight: 1,
    },

    {
      parameter: "nitrogen",
      unit: "dimensionless",
      value: 0.40,
      weight: 2,
    },

    {
      parameter: "electrical_conductivity",
      unit: "dimensionless",
      value: 0.60,
      weight: 1,
    },
  ];
}

// ============================================================
// Constants / definitions
// ============================================================

test("integration version is stable", () => {
  assert.equal(
    AGRICULTURAL_RISK_INTEGRATION_VERSION,
    "1.0",
  );
});

test("parameter definitions preserve authoritative soil units", () => {
  assert.deepEqual(
    PARAMETER_DEFINITIONS.pH,
    {
      sourceKey: "pH",
      unit: "pH",
    },
  );

  assert.deepEqual(
    PARAMETER_DEFINITIONS.nitrogen,
    {
      sourceKey: "nitrogen",
      unit: "kg/ha",
    },
  );

  assert.deepEqual(
    PARAMETER_DEFINITIONS.phosphorus,
    {
      sourceKey: "phosphorus",
      unit: "kg/ha",
    },
  );

  assert.deepEqual(
    PARAMETER_DEFINITIONS.potassium,
    {
      sourceKey: "potassium",
      unit: "kg/ha",
    },
  );

  assert.deepEqual(
    PARAMETER_DEFINITIONS.organicCarbon,
    {
      sourceKey: "organicCarbon",
      unit: "%",
    },
  );

  assert.deepEqual(
    PARAMETER_DEFINITIONS.electricalConductivity,
    {
      sourceKey: "electricalConductivity",
      unit: "dS/m",
    },
  );
});

// ============================================================
// Numeric validation
// ============================================================

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(
    isFiniteNumber(0),
    true,
  );

  assert.equal(
    isFiniteNumber(1.25),
    true,
  );
});

test("isFiniteNumber rejects non-finite values", () => {
  assert.equal(
    isFiniteNumber(NaN),
    false,
  );

  assert.equal(
    isFiniteNumber(Infinity),
    false,
  );

  assert.equal(
    isFiniteNumber("1"),
    false,
  );

  assert.equal(
    isFiniteNumber(null),
    false,
  );
});

// ============================================================
// Observation ID validation
// ============================================================

test("validateObservationId accepts non-empty observation IDs", () => {
  assert.equal(
    validateObservationId("S-001"),
    true,
  );
});

test("validateObservationId rejects missing IDs", () => {
  assert.throws(
    () => validateObservationId(""),
    /observationId is required/,
  );

  assert.throws(
    () => validateObservationId(null),
    /observationId is required/,
  );
});

// ============================================================
// Risk input validation
// ============================================================

test("validateRiskInput accepts a valid dimensionless risk input", () => {
  assert.equal(
    validateRiskInput(
      {
        parameter: "nitrogen",
        unit: "dimensionless",
        value: 0.5,
        weight: 1,
      },
      0,
    ),
    true,
  );
});

test("validateRiskInput rejects missing parameter", () => {
  assert.throws(
    () =>
      validateRiskInput(
        {
          unit: "dimensionless",
          value: 0.5,
          weight: 1,
        },
        0,
      ),
    /parameter is required/,
  );
});

test("validateRiskInput rejects non-finite value", () => {
  assert.throws(
    () =>
      validateRiskInput(
        {
          parameter: "nitrogen",
          unit: "dimensionless",
          value: NaN,
          weight: 1,
        },
        0,
      ),
    /value must be finite/,
  );
});

test("validateRiskInput rejects negative value", () => {
  assert.throws(
    () =>
      validateRiskInput(
        {
          parameter: "nitrogen",
          unit: "dimensionless",
          value: -0.1,
          weight: 1,
        },
        0,
      ),
    /value must be non-negative/,
  );
});

test("validateRiskInput rejects negative weight", () => {
  assert.throws(
    () =>
      validateRiskInput(
        {
          parameter: "nitrogen",
          unit: "dimensionless",
          value: 0.5,
          weight: -1,
        },
        0,
      ),
    /weight must be non-negative/,
  );
});

// ============================================================
// Analysis validation
// ============================================================

test("validateAnalysisResult accepts authoritative analysis output", () => {
  assert.equal(
    validateAnalysisResult(
      createAnalysis(),
    ),
    true,
  );
});

test("validateAnalysisResult rejects missing analysis", () => {
  assert.throws(
    () => validateAnalysisResult(null),
    /analysis is required/,
  );
});

test("validateAnalysisResult rejects missing values", () => {
  assert.throws(
    () =>
      validateAnalysisResult({
        version: "Baseline",
      }),
    /analysis values are required/,
  );
});

// ============================================================
// Risk input construction
// ============================================================

test("buildRiskInputs preserves explicitly supplied inputs", () => {
  const inputs = createRiskInputs();

  const result =
    buildRiskInputs(inputs);

  assert.deepEqual(
    result,
    inputs,
  );
});

test("buildRiskInputs rejects an empty input array", () => {
  assert.throws(
    () => buildRiskInputs([]),
    /requires at least one risk input/,
  );
});

test("buildRiskInputs rejects duplicate parameters", () => {
  assert.throws(
    () =>
      buildRiskInputs([
        {
          parameter: "nitrogen",
          unit: "dimensionless",
          value: 0.2,
          weight: 1,
        },
        {
          parameter: "nitrogen",
          unit: "dimensionless",
          value: 0.4,
          weight: 1,
        },
      ]),
    /Duplicate agricultural risk integration parameter/,
  );
});

test("buildRiskInputs does not convert raw soil units automatically", () => {
  const inputs =
    buildRiskInputs([
      {
        parameter: "nitrogen",
        unit: "dimensionless",
        value: 0.75,
        weight: 2,
      },
    ]);

  assert.equal(
    inputs[0].value,
    0.75,
  );

  assert.equal(
    inputs[0].unit,
    "dimensionless",
  );
});

// ============================================================
// Single observation integration
// ============================================================

test("buildIntegratedRiskObservation combines authoritative analysis with explicit risk inputs", () => {
  const analysis =
    createAnalysis();

  const riskInputs =
    createRiskInputs();

  const result =
    buildIntegratedRiskObservation(
      "S-001",
      analysis,
      riskInputs,
    );

  assert.equal(
    result.observationId,
    "S-001",
  );

  assert.deepEqual(
    result.analysis,
    analysis,
  );

  assert.deepEqual(
    result.riskInputs,
    riskInputs,
  );
});

test("buildIntegratedRiskObservation rejects missing analysis", () => {
  assert.throws(
    () =>
      buildIntegratedRiskObservation(
        "S-001",
        null,
        createRiskInputs(),
      ),
    /analysis is required/,
  );
});

// ============================================================
// Multi-observation integration
// ============================================================

test("buildIntegratedRiskResult produces the agricultural risk contract", () => {
  const result =
    buildIntegratedRiskResult([
      {
        observationId: "S-002",

        analysis:
          createAnalysis(),

        riskInputs: [
          {
            parameter: "nitrogen",
            unit: "dimensionless",
            value: 0.4,
            weight: 1,
          },
        ],
      },

      {
        observationId: "S-001",

        analysis:
          createAnalysis(),

        riskInputs: [
          {
            parameter: "nitrogen",
            unit: "dimensionless",
            value: 0.2,
            weight: 1,
          },
        ],
      },
    ]);

  assert.equal(
    result.type,
    "agricultural_risk",
  );

  assert.equal(
    result.version,
    "1.0",
  );

  assert.equal(
    result.method,
    "weighted_risk_index",
  );

  assert.equal(
    result.observationCount,
    2,
  );

  assert.deepEqual(
    result.observations.map(
      (observation) =>
        observation.observationId,
    ),
    [
      "S-001",
      "S-002",
    ],
  );

  assert.equal(
    result.observations[0].riskIndex,
    0.2,
  );

  assert.equal(
    result.observations[1].riskIndex,
    0.4,
  );
});

test("buildIntegratedRiskResult calculates weighted risk from explicit dimensionless inputs", () => {
  const result =
    buildIntegratedRiskResult([
      {
        observationId: "S-001",

        analysis:
          createAnalysis(),

        riskInputs: [
          {
            parameter: "pH",
            unit: "dimensionless",
            value: 0.2,
            weight: 1,
          },
          {
            parameter: "nitrogen",
            unit: "dimensionless",
            value: 0.8,
            weight: 3,
          },
        ],
      },
    ]);

  assert.ok(
    Math.abs(
        result.observations[0].riskIndex - 0.65,
    ) < 1e-12,
    );
});

test("buildIntegratedRiskResult rejects duplicate observation IDs", () => {
  const observation = {
    observationId: "S-001",

    analysis:
      createAnalysis(),

    riskInputs: [
      {
        parameter: "nitrogen",
        unit: "dimensionless",
        value: 0.5,
        weight: 1,
      },
    ],
  };

  assert.throws(
    () =>
      buildIntegratedRiskResult([
        observation,
        {
          ...observation,
          analysis:
            createAnalysis(),
        },
      ]),
    /Duplicate agricultural risk integration observation/,
  );
});

test("buildIntegratedRiskResult rejects observations without risk inputs", () => {
  assert.throws(
    () =>
      buildIntegratedRiskResult([
        {
          observationId: "S-001",
          analysis:
            createAnalysis(),
        },
      ]),
    /riskInputs must be an array/,
  );
});

test("buildIntegratedRiskResult preserves the authoritative analysis boundary", () => {
  const analysis =
    createAnalysis();

  const result =
    buildIntegratedRiskResult([
      {
        observationId: "S-001",

        analysis,

        riskInputs: [
          {
            parameter: "nitrogen",
            unit: "dimensionless",
            value: 0.35,
            weight: 1,
          },
        ],
      },
    ]);

  assert.deepEqual(
    analysis.values.nitrogen,
    {
      value: 190,
      unit: "kg/ha",
      classification: "Low",
    },
  );

  assert.equal(
    result.observations[0].inputs[0].value,
    0.35,
  );

  assert.equal(
    result.observations[0].inputs[0].unit,
    "dimensionless",
  );
});
