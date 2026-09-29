"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  loadAnalyzedSoilObservations,
  buildRepositoryAgriculturalRiskResult,
} = require("../services/agriculturalRiskIntegrationService");

const { pool } = require("../config/db");

// ============================================================
// Real repository integration
//
// IMPORTANT:
// The resolver below supplies deterministic dimensionless test
// contributions solely to verify integration plumbing.
//
// These values are NOT agronomic risk scores.
// ============================================================

function createDeterministicRiskInputResolver() {
  return ({ analysis }) => {
    const nitrogen =
      analysis.values.nitrogen.value;

    const phosphorus =
      analysis.values.phosphorus.value;

    return [
      {
        parameter: "nitrogen_test_contribution",
        unit: "dimensionless",
        value: nitrogen / 1000,
        weight: 1,
      },

      {
        parameter: "phosphorus_test_contribution",
        unit: "dimensionless",
        value: phosphorus / 100,
        weight: 1,
      },
    ];
  };
}

// ============================================================
// Repository-backed observation loading
// ============================================================

test("loadAnalyzedSoilObservations loads real repository observations", async () => {
  const observations =
    await loadAnalyzedSoilObservations();

  assert.ok(
    Array.isArray(observations),
  );

  assert.equal(
    observations.length,
    9,
  );

  for (const observation of observations) {
    assert.equal(
      typeof observation.observationId,
      "string",
    );

    assert.ok(
      observation.observationId.trim(),
    );

    assert.ok(
      observation.analysis &&
      typeof observation.analysis === "object",
    );

    assert.ok(
      observation.analysis.values &&
      typeof observation.analysis.values === "object",
    );

    const values =
      observation.analysis.values;

    for (const parameter of [
      "pH",
      "nitrogen",
      "phosphorus",
      "potassium",
      "organicCarbon",
      "electricalConductivity",
    ]) {
      assert.ok(
        values[parameter] &&
        typeof values[parameter] === "object",
        `${observation.observationId} ${parameter} result is required`,
      );

      assert.equal(
        typeof values[parameter].unit,
        "string",
        `${observation.observationId} ${parameter} unit must be preserved`,
      );

      assert.ok(
        values[parameter].value === null ||
        Number.isFinite(values[parameter].value),
        `${observation.observationId} ${parameter} value must be null or finite`,
      );
    }
  }
});

// ============================================================
// Full repository → analysis → risk integration
// ============================================================

test("buildRepositoryAgriculturalRiskResult integrates all real soil observations", async () => {
  const result =
    await buildRepositoryAgriculturalRiskResult(
      createDeterministicRiskInputResolver(),
    );

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
    9,
  );

  assert.equal(
    result.observations.length,
    9,
  );

  const observationIds =
    result.observations.map(
      (observation) =>
        observation.observationId,
    );

  assert.equal(
    new Set(observationIds).size,
    9,
  );

  for (const observation of result.observations) {
    assert.ok(
      Array.isArray(
        observation.inputs,
      ),
    );

    assert.equal(
      observation.inputs.length,
      2,
    );

    assert.ok(
      Number.isFinite(
        observation.riskIndex,
      ),
    );

    assert.ok(
      observation.riskIndex >= 0,
    );

    for (const input of observation.inputs) {
      assert.equal(
        input.unit,
        "dimensionless",
      );

      assert.ok(
        Number.isFinite(input.value),
      );

      assert.ok(
        input.value >= 0,
      );

      assert.ok(
        Number.isFinite(input.weight),
      );

      assert.ok(
        input.weight >= 0,
      );
    }
  }
});

// ============================================================
// Scientific boundary verification
// ============================================================

test("repository integration preserves authoritative soil analysis units", async () => {
  const observations =
    await loadAnalyzedSoilObservations();

  for (const observation of observations) {
    assert.equal(
      observation.analysis.values.nitrogen.unit,
      "kg/ha",
    );

    assert.equal(
      observation.analysis.values.phosphorus.unit,
      "kg/ha",
    );

    assert.equal(
      observation.analysis.values.potassium.unit,
      "kg/ha",
    );

    assert.equal(
      observation.analysis.values.organicCarbon.unit,
      "%",
    );

    assert.equal(
      observation.analysis.values
        .electricalConductivity.unit,
      "dS/m",
    );
  }
});

// ============================================================
// Resolver contract
// ============================================================

test("repository integration requires an explicit risk input resolver", async () => {
  await assert.rejects(
    () =>
      buildRepositoryAgriculturalRiskResult(),
    /riskInputResolver must be a function/,
  );
});

test.after(async () => {
  await pool.end();
});