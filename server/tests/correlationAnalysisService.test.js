// ============================================================
// server/tests/correlationAnalysisService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.2 — Correlation Analysis
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractPairedValues,
  calculatePearsonCorrelation,
  buildCorrelationResult,
} = require("../services/correlationAnalysisService");

const {
  validateCorrelationAnalysisResult,
} = require(
  "../scientific/statistics/correlationAnalysisResultContract",
);

// ============================================================
// PAIR EXTRACTION
// ============================================================

test("extractPairedValues reads authoritative normalized values", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.0,
          unit: "pH",
          classification: "Acidic",
        },
        nitrogen: {
          value: 100,
          unit: "kg/ha",
          classification: "Low",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
          classification: "Neutral",
        },
        nitrogen: {
          value: 200,
          unit: "kg/ha",
          classification: "Medium",
        },
      },
    },
  ];

  assert.deepEqual(
    extractPairedValues(
      observations,
      "pH",
      "nitrogen",
    ),
    [
      { a: 6.0, b: 100 },
      { a: 7.0, b: 200 },
    ],
  );
});

test("extractPairedValues excludes observations missing either parameter", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.0,
          unit: "pH",
        },
        nitrogen: {
          value: 100,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: null,
          unit: "pH",
        },
        nitrogen: {
          value: 200,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
        },
      },
    },
  ];

  assert.deepEqual(
    extractPairedValues(
      observations,
      "pH",
      "nitrogen",
    ),
    [
      { a: 6.0, b: 100 },
    ],
  );
});

test("extractPairedValues excludes non-finite authoritative values", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.0,
          unit: "pH",
        },
        nitrogen: {
          value: 100,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: NaN,
          unit: "pH",
        },
        nitrogen: {
          value: 200,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
        },
        nitrogen: {
          value: Infinity,
          unit: "kg/ha",
        },
      },
    },
  ];

  assert.deepEqual(
    extractPairedValues(
      observations,
      "pH",
      "nitrogen",
    ),
    [
      { a: 6.0, b: 100 },
    ],
  );
});

// ============================================================
// PEARSON CORRELATION
// ============================================================

test("calculatePearsonCorrelation returns perfect positive correlation", () => {
  assert.equal(
    calculatePearsonCorrelation([
      { a: 1, b: 2 },
      { a: 2, b: 4 },
      { a: 3, b: 6 },
      { a: 4, b: 8 },
    ]),
    1,
  );
});

test("calculatePearsonCorrelation returns perfect negative correlation", () => {
  assert.equal(
    calculatePearsonCorrelation([
      { a: 1, b: 8 },
      { a: 2, b: 6 },
      { a: 3, b: 4 },
      { a: 4, b: 2 },
    ]),
    -1,
  );
});

test("calculatePearsonCorrelation calculates a known coefficient", () => {
  const result = calculatePearsonCorrelation([
    { a: 1, b: 2 },
    { a: 2, b: 4 },
    { a: 3, b: 5 },
  ]);

  assert.ok(Math.abs(result - 0.9819805061) < 1e-10);
});

test("calculatePearsonCorrelation returns null for insufficient pairs", () => {
  assert.equal(
    calculatePearsonCorrelation([
      { a: 1, b: 2 },
    ]),
    null,
  );
});

test("calculatePearsonCorrelation returns null for empty pairs", () => {
  assert.equal(
    calculatePearsonCorrelation([]),
    null,
  );
});

test("calculatePearsonCorrelation returns null when parameter A has zero variance", () => {
  assert.equal(
    calculatePearsonCorrelation([
      { a: 5, b: 1 },
      { a: 5, b: 2 },
      { a: 5, b: 3 },
    ]),
    null,
  );
});

test("calculatePearsonCorrelation returns null when parameter B has zero variance", () => {
  assert.equal(
    calculatePearsonCorrelation([
      { a: 1, b: 5 },
      { a: 2, b: 5 },
      { a: 3, b: 5 },
    ]),
    null,
  );
});

// ============================================================
// COMPLETE CORRELATION RESULT
// ============================================================

test("buildCorrelationResult produces a validated Pearson result", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.0,
          unit: "pH",
          classification: "Acidic",
        },
        nitrogen: {
          value: 100,
          unit: "kg/ha",
          classification: "Low",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
          classification: "Neutral",
        },
        nitrogen: {
          value: 200,
          unit: "kg/ha",
          classification: "Medium",
        },
      },
    },
    {
      values: {
        pH: {
          value: 8.0,
          unit: "pH",
          classification: "Alkaline",
        },
        nitrogen: {
          value: 300,
          unit: "kg/ha",
          classification: "High",
        },
      },
    },
  ];

  const result = buildCorrelationResult(
    observations,
    "pH",
    "nitrogen",
  );

  assert.equal(result.type, "correlation_analysis");
  assert.equal(result.version, "1.0");
  assert.equal(result.method, "pearson");

  assert.deepEqual(result.parameterA, {
    parameter: "pH",
    unit: "pH",
  });

  assert.deepEqual(result.parameterB, {
    parameter: "nitrogen",
    unit: "kg/ha",
  });

  assert.equal(result.pairCount, 3);
  assert.equal(result.correlation, 1);

  assert.equal(
    validateCorrelationAnalysisResult(result),
    true,
  );
});

// ============================================================
// RESULT WITH UNDEFINED CORRELATION
// ============================================================

test("buildCorrelationResult returns null correlation for zero variance", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
        },
        nitrogen: {
          value: 100,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
        },
        nitrogen: {
          value: 200,
          unit: "kg/ha",
        },
      },
    },
    {
      values: {
        pH: {
          value: 7.0,
          unit: "pH",
        },
        nitrogen: {
          value: 300,
          unit: "kg/ha",
        },
      },
    },
  ];

  const result = buildCorrelationResult(
    observations,
    "pH",
    "nitrogen",
  );

  assert.equal(result.pairCount, 3);
  assert.equal(result.correlation, null);
});

// ============================================================
// VALIDATION
// ============================================================

test("buildCorrelationResult rejects unsupported parameters", () => {
  assert.throws(
    () =>
      buildCorrelationResult(
        [],
        "unsupported",
        "nitrogen",
      ),
    /Unsupported statistical correlation parameter/,
  );
});

test("buildCorrelationResult rejects identical parameters", () => {
  assert.throws(
    () =>
      buildCorrelationResult(
        [],
        "pH",
        "pH",
      ),
    /Correlation parameters must be different/,
  );
});

test("buildCorrelationResult rejects non-array observations", () => {
  assert.throws(
    () =>
      buildCorrelationResult(
        null,
        "pH",
        "nitrogen",
      ),
    /Correlation observations must be an array/,
  );
});

test("correlation result contract rejects invalid coefficient", () => {
  const result = {
    type: "correlation_analysis",
    version: "1.0",
    method: "pearson",
    parameterA: {
      parameter: "pH",
      unit: "pH",
    },
    parameterB: {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
    pairCount: 3,
    correlation: 1.5,
  };

  assert.throws(
    () => validateCorrelationAnalysisResult(result),
    /Correlation must be between -1 and 1/,
  );
});

test("correlation result contract requires null coefficient below two pairs", () => {
  const result = {
    type: "correlation_analysis",
    version: "1.0",
    method: "pearson",
    parameterA: {
      parameter: "pH",
      unit: "pH",
    },
    parameterB: {
      parameter: "nitrogen",
      unit: "kg/ha",
    },
    pairCount: 1,
    correlation: 0.5,
  };

  assert.throws(
    () => validateCorrelationAnalysisResult(result),
    /Correlation must be null when pairCount is less than two/,
  );
});