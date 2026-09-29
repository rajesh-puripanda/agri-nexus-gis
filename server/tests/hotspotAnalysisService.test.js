"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PARAMETER_DEFINITIONS,
  isFiniteNumber,
  validateParameter,
  validateRadius,
  extractValidObservations,
  buildSpatialWeights,
  calculateGiStar,
  calculatePopulationStatistics,
  buildHotspotAnalysisResult,
} = require("../services/hotspotAnalysisService");

function buildObservation(
  id,
  latitude,
  longitude,
  nitrogen,
) {
  return {
    observationId: id,
    latitude,
    longitude,
    values: {
      nitrogen: {
        value: nitrogen,
        unit: "kg/ha",
        classification: "Medium",
      },
    },
  };
}

function buildObservations() {
  return [
    buildObservation(
      "S-001",
      17.70000,
      83.30000,
      100,
    ),

    buildObservation(
      "S-002",
      17.70000,
      83.30100,
      110,
    ),

    buildObservation(
      "S-003",
      17.70000,
      83.30200,
      120,
    ),

    buildObservation(
      "S-004",
      17.70000,
      83.31000,
      200,
    ),
  ];
}

// ============================================================
// CONSTANTS / HELPERS
// ============================================================

test("PARAMETER_DEFINITIONS preserves nitrogen metadata", () => {
  assert.deepEqual(
    PARAMETER_DEFINITIONS.nitrogen,
    {
      sourceKey: "nitrogen",
      unit: "kg/ha",
    },
  );
});

test("isFiniteNumber accepts finite numbers", () => {
  assert.equal(isFiniteNumber(10), true);
  assert.equal(isFiniteNumber(10.5), true);
});

test("isFiniteNumber rejects non-finite values", () => {
  assert.equal(isFiniteNumber(NaN), false);
  assert.equal(isFiniteNumber(Infinity), false);
  assert.equal(isFiniteNumber("10"), false);
});

// ============================================================
// PARAMETER / RADIUS VALIDATION
// ============================================================

test("validateParameter accepts supported parameter", () => {
  assert.equal(
    validateParameter("nitrogen"),
    true,
  );
});

test("validateParameter rejects missing parameter", () => {
  assert.throws(
    () => validateParameter(""),
    /parameter is required/,
  );
});

test("validateParameter rejects unsupported parameter", () => {
  assert.throws(
    () => validateParameter("texture"),
    /Unsupported hotspot analysis parameter/,
  );
});

test("validateRadius accepts positive finite radius", () => {
  assert.equal(
    validateRadius(500),
    true,
  );
});

test("validateRadius rejects zero", () => {
  assert.throws(
    () => validateRadius(0),
    /radiusMetres must be positive and finite/,
  );
});

test("validateRadius rejects negative radius", () => {
  assert.throws(
    () => validateRadius(-10),
    /radiusMetres must be positive and finite/,
  );
});

test("validateRadius rejects non-finite radius", () => {
  assert.throws(
    () => validateRadius(Infinity),
    /radiusMetres must be positive and finite/,
  );
});

// ============================================================
// OBSERVATION EXTRACTION
// ============================================================

test("extractValidObservations extracts authoritative parameter values", () => {
  const result =
    extractValidObservations(
      buildObservations(),
      "nitrogen",
    );

  assert.equal(result.length, 4);
  assert.equal(result[0].observationId, "S-001");
  assert.equal(result[0].value, 100);
});

test("extractValidObservations excludes missing parameter values", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    {
      observationId: "S-002",
      latitude: 17.70,
      longitude: 83.301,
      values: {},
    },
  ];

  const result =
    extractValidObservations(
      observations,
      "nitrogen",
    );

  assert.equal(result.length, 1);
});

test("extractValidObservations excludes invalid coordinates", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-002",
      NaN,
      83.301,
      110,
    ),
  ];

  const result =
    extractValidObservations(
      observations,
      "nitrogen",
    );

  assert.equal(result.length, 1);
});

test("extractValidObservations excludes non-finite values", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-002",
      17.70,
      83.301,
      NaN,
    ),
  ];

  const result =
    extractValidObservations(
      observations,
      "nitrogen",
    );

  assert.equal(result.length, 1);
});

test("extractValidObservations rejects duplicate observation IDs", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-001",
      17.70,
      83.301,
      110,
    ),
  ];

  assert.throws(
    () =>
      extractValidObservations(
        observations,
        "nitrogen",
      ),
    /Duplicate hotspot observation/,
  );
});

// ============================================================
// SPATIAL WEIGHTS
// ============================================================

test("buildSpatialWeights includes self", () => {
  const observations =
    extractValidObservations(
      buildObservations(),
      "nitrogen",
    );

  const weights =
    buildSpatialWeights(
      observations,
      200,
    );

  assert.equal(
    weights[0].weights[0],
    1,
  );

  assert.ok(
    weights[0].neighborCount >= 1,
  );
});

test("buildSpatialWeights uses fixed radius", () => {
  const observations =
    extractValidObservations(
      buildObservations(),
      "nitrogen",
    );

  const weights =
    buildSpatialWeights(
      observations,
      50,
    );

  assert.equal(
    weights[0].weights[0],
    1,
  );

  assert.equal(
    weights[0].weights[3],
    0,
  );
});

test("buildSpatialWeights is symmetric", () => {
  const observations =
    extractValidObservations(
      buildObservations(),
      "nitrogen",
    );

  const weights =
    buildSpatialWeights(
      observations,
      200,
    );

  for (let i = 0; i < weights.length; i += 1) {
    for (
      let j = 0;
      j < weights.length;
      j += 1
    ) {
      assert.equal(
        weights[i].weights[j],
        weights[j].weights[i],
      );
    }
  }
});

// ============================================================
// POPULATION STATISTICS
// ============================================================

test("calculatePopulationStatistics calculates mean", () => {
  const result =
    calculatePopulationStatistics([
      100,
      110,
      120,
    ]);

  assert.equal(
    result.mean,
    110,
  );
});

test("calculatePopulationStatistics calculates finite standard deviation", () => {
  const result =
    calculatePopulationStatistics([
      100,
      110,
      120,
    ]);

  assert.ok(
    Number.isFinite(
      result.standardDeviation,
    ),
  );

  assert.ok(
    result.standardDeviation > 0,
  );
});

test("calculatePopulationStatistics rejects fewer than two observations", () => {
  assert.throws(
    () =>
      calculatePopulationStatistics([
        100,
      ]),
    /at least two valid observations/,
  );
});

test("calculatePopulationStatistics rejects zero variance", () => {
  assert.throws(
    () =>
      calculatePopulationStatistics([
        100,
        100,
        100,
      ]),
    /non-zero population variance/,
  );
});

// ============================================================
// GI*
// ============================================================

test("calculateGiStar returns finite Gi* for valid weights", () => {
  const values = [
    100,
    110,
    120,
    200,
  ];

  const statistics =
    calculatePopulationStatistics(values);

  const giStar =
    calculateGiStar(
      values,
      [1, 1, 1, 0],
      statistics.mean,
      statistics.standardDeviation,
    );

  assert.ok(
    Number.isFinite(giStar),
  );
});

test("calculateGiStar returns null for degenerate weights", () => {
  const values = [
    100,
    110,
    120,
  ];

  const statistics =
    calculatePopulationStatistics(values);

  const giStar =
    calculateGiStar(
      values,
      [1, 1, 1],
      statistics.mean,
      statistics.standardDeviation,
    );

  assert.equal(giStar, null);
});

test("calculateGiStar rejects mismatched arrays", () => {
  assert.throws(
    () =>
      calculateGiStar(
        [100, 110],
        [1],
        105,
        5,
      ),
    /equal length/,
  );
});

// ============================================================
// COMPLETE RESULT
// ============================================================

test("buildHotspotAnalysisResult builds Getis-Ord Gi* result", () => {
  const result =
    buildHotspotAnalysisResult(
      buildObservations(),
      "nitrogen",
      200,
    );

  assert.equal(
    result.type,
    "hotspot_analysis",
  );

  assert.equal(
    result.version,
    "1.0",
  );

  assert.equal(
    result.method,
    "getis_ord_gi_star",
  );

  assert.deepEqual(
    result.parameter,
    {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
  );

  assert.equal(
    result.radiusMetres,
    200,
  );

  assert.equal(
    result.observationCount,
    4,
  );

  assert.equal(
    result.analyzedObservationCount,
    result.observations.length,
  );
});

test("buildHotspotAnalysisResult returns finite Gi* values", () => {
  const result =
    buildHotspotAnalysisResult(
      buildObservations(),
      "nitrogen",
      200,
    );

  for (const observation of result.observations) {
    assert.ok(
      Number.isFinite(
        observation.giStar,
      ),
    );

    assert.ok(
      Number.isFinite(
        observation.value,
      ),
    );

    assert.ok(
      Number.isInteger(
        observation.neighborCount,
      ),
    );

    assert.ok(
      observation.neighborCount >= 1,
    );
  }
});

test("buildHotspotAnalysisResult preserves observation IDs", () => {
  const result =
    buildHotspotAnalysisResult(
      buildObservations(),
      "nitrogen",
      200,
    );

  assert.deepEqual(
    result.observations.map(
      (observation) =>
        observation.observationId,
    ),
    [
      "S-001",
      "S-002",
      "S-003",
      "S-004",
    ],
  );
});

test("buildHotspotAnalysisResult excludes observations with missing selected values", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-002",
      17.70,
      83.301,
      110,
    ),

    buildObservation(
      "S-003",
      17.70,
      83.302,
      120,
    ),

    {
      observationId: "S-004",
      latitude: 17.70,
      longitude: 83.31,
      values: {},
    },
  ];

  const result =
    buildHotspotAnalysisResult(
      observations,
      "nitrogen",
      200,
    );

  assert.equal(
    result.observationCount,
    3,
  );
});

test("buildHotspotAnalysisResult rejects insufficient valid observations", () => {
  assert.throws(
    () =>
      buildHotspotAnalysisResult(
        [
          buildObservation(
            "S-001",
            17.70,
            83.30,
            100,
          ),
        ],
        "nitrogen",
        500,
      ),
    /at least two valid observations/,
  );
});

test("buildHotspotAnalysisResult rejects zero radius", () => {
  assert.throws(
    () =>
      buildHotspotAnalysisResult(
        buildObservations(),
        "nitrogen",
        0,
      ),
    /radiusMetres must be positive and finite/,
  );
});

test("buildHotspotAnalysisResult rejects zero-variance population", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-002",
      17.70,
      83.301,
      100,
    ),

    buildObservation(
      "S-003",
      17.70,
      83.302,
      100,
    ),
  ];

  assert.throws(
    () =>
      buildHotspotAnalysisResult(
        observations,
        "nitrogen",
        500,
      ),
    /non-zero population variance/,
  );
});

test("buildHotspotAnalysisResult can exclude degenerate Gi* observations", () => {
  const observations = [
    buildObservation(
      "S-001",
      17.70,
      83.30,
      100,
    ),

    buildObservation(
      "S-002",
      17.70,
      83.301,
      110,
    ),

    buildObservation(
      "S-003",
      17.70,
      83.302,
      120,
    ),
  ];

  const result =
    buildHotspotAnalysisResult(
      observations,
      "nitrogen",
      1,
    );

  assert.ok(
    result.analyzedObservationCount >= 1,
  );

  assert.equal(
    result.analyzedObservationCount,
    result.observations.length,
  );
});

test("buildHotspotAnalysisResult preserves parameter units for pH", () => {
  const observations =
    buildObservations().map(
      (observation, index) => ({
        ...observation,
        values: {
          pH: {
            value: 6 + index * 0.2,
            unit: "pH",
            classification: "Medium",
          },
        },
      }),
    );

  const result =
    buildHotspotAnalysisResult(
      observations,
      "pH",
      200,
    );

  assert.deepEqual(
    result.parameter,
    {
      parameter: "pH",
      unit: "pH",
    },
  );
});

test("buildHotspotAnalysisResult is deterministic", () => {
  const observations =
    buildObservations();

  const first =
    buildHotspotAnalysisResult(
      observations,
      "nitrogen",
      200,
    );

  const second =
    buildHotspotAnalysisResult(
      observations,
      "nitrogen",
      200,
    );

  assert.deepEqual(
    first,
    second,
  );
});
