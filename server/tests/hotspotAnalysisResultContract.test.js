"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  REQUIRED_METHOD,
  isFiniteNumber,
  validateParameterDescriptor,
  validateObservationResult,
  validateHotspotAnalysisResult,
} = require("../scientific/statistics/hotspotAnalysisResultContract");

function createParameter() {
  return {
    parameter: "nitrogen",
    unit: "kg/ha",
  };
}

function createObservation(
  observationId = "S-001",
  overrides = {},
) {
  return {
    observationId,
    latitude: 17.71234,
    longitude: 83.30125,
    value: 215,
    neighborCount: 8,
    giStar: 2.41,
    ...overrides,
  };
}

function createResult(overrides = {}) {
  const observations = [
    createObservation("S-001"),
    createObservation("S-002", {
      latitude: 17.713,
      longitude: 83.302,
      value: 240,
      neighborCount: 7,
      giStar: -1.27,
    }),
  ];

  return {
    type: "hotspot_analysis",
    version: "1.0",
    method: REQUIRED_METHOD,
    parameter: createParameter(),
    radiusMetres: 500,
    observationCount: 2,
    analyzedObservationCount: 2,
    observations,
    ...overrides,
  };
}

test("REQUIRED_METHOD is getis_ord_gi_star", () => {
  assert.equal(
    REQUIRED_METHOD,
    "getis_ord_gi_star",
  );
});

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(isFiniteNumber(10), true);
  assert.equal(isFiniteNumber(-3.5), true);
  assert.equal(isFiniteNumber(0), true);
});

test("isFiniteNumber rejects non-finite values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber(-Infinity), false);
  assert.equal(isFiniteNumber("10"), false);
});

test("valid parameter descriptor is accepted", () => {
  assert.equal(
    validateParameterDescriptor(createParameter()),
    true,
  );
});

test("parameter descriptor is required", () => {
  assert.throws(
    () => validateParameterDescriptor(null),
    /Hotspot parameter is required/,
  );
});

test("parameter descriptor requires parameter name", () => {
  assert.throws(
    () =>
      validateParameterDescriptor({
        unit: "kg/ha",
      }),
    /Hotspot parameter name is required/,
  );
});

test("parameter descriptor requires unit", () => {
  assert.throws(
    () =>
      validateParameterDescriptor({
        parameter: "nitrogen",
      }),
    /Hotspot parameter unit is required/,
  );
});

test("valid observation result is accepted", () => {
  assert.equal(
    validateObservationResult(
      createObservation(),
      0,
    ),
    true,
  );
});

test("observation requires observation identifier", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("", {}),
        0,
      ),
    /observationId is required/,
  );
});

test("observation rejects non-finite latitude", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          latitude: NaN,
        }),
        0,
      ),
    /latitude must be finite/,
  );
});

test("observation rejects non-finite longitude", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          longitude: Infinity,
        }),
        0,
      ),
    /longitude must be finite/,
  );
});

test("observation rejects non-finite value", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          value: NaN,
        }),
        0,
      ),
    /value must be finite/,
  );
});

test("observation requires positive neighbor count", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          neighborCount: 0,
        }),
        0,
      ),
    /neighborCount must be a positive integer/,
  );
});

test("observation rejects fractional neighbor count", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          neighborCount: 2.5,
        }),
        0,
      ),
    /neighborCount must be a positive integer/,
  );
});

test("observation rejects non-finite Gi-star statistic", () => {
  assert.throws(
    () =>
      validateObservationResult(
        createObservation("S-001", {
          giStar: Infinity,
        }),
        0,
      ),
    /giStar must be finite/,
  );
});

test("valid complete hotspot result is accepted", () => {
  assert.equal(
    validateHotspotAnalysisResult(
      createResult(),
    ),
    true,
  );
});

test("result is required", () => {
  assert.throws(
    () => validateHotspotAnalysisResult(null),
    /Hotspot analysis result is required/,
  );
});

test("result rejects incorrect type", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          type: "cluster_analysis",
        }),
      ),
    /Invalid hotspot analysis result type/,
  );
});

test("result rejects incorrect method", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          method: "kmeans",
        }),
      ),
    /method must be getis_ord_gi_star/,
  );
});

test("result requires version", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          version: "",
        }),
      ),
    /version is required/,
  );
});

test("result rejects non-positive radius", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          radiusMetres: 0,
        }),
      ),
    /radiusMetres must be positive and finite/,
  );
});

test("result rejects non-finite radius", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          radiusMetres: NaN,
        }),
      ),
    /radiusMetres must be positive and finite/,
  );
});

test("result rejects negative observation count", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          observationCount: -1,
        }),
      ),
    /observationCount must be non-negative/,
  );
});

test("result rejects analyzed observations above total observations", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          observationCount: 1,
          analyzedObservationCount: 2,
        }),
      ),
    /Analyzed observation count cannot exceed observation count/,
  );
});

test("result requires observation array", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          observations: null,
        }),
      ),
    /observations must be an array/,
  );
});

test("result requires observation count to match analyzed count", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          analyzedObservationCount: 1,
        }),
      ),
    /Hotspot observation count must match analyzedObservationCount/,
  );
});

test("result rejects duplicate observation identifiers", () => {
  assert.throws(
    () =>
      validateHotspotAnalysisResult(
        createResult({
          observations: [
            createObservation("S-001"),
            createObservation("S-001"),
          ],
        }),
      ),
    /Duplicate hotspot observation: S-001/,
  );
});

test("result preserves selected parameter and unit", () => {
  const result = createResult();

  assert.equal(
    validateHotspotAnalysisResult(result),
    true,
  );

  assert.equal(
    result.parameter.parameter,
    "nitrogen",
  );

  assert.equal(
    result.parameter.unit,
    "kg/ha",
  );
});

test("result supports a single analyzed observation", () => {
  const result = createResult({
    observationCount: 1,
    analyzedObservationCount: 1,
    observations: [
      createObservation("S-001"),
    ],
  });

  assert.equal(
    validateHotspotAnalysisResult(result),
    true,
  );
});