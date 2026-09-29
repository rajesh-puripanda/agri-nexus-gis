// ============================================================
// server/tests/statisticalAnalysisService.test.js
// ============================================================
//
// AgriNexus GIS
//
// Phase 9.1 — Statistical Analysis Foundation Tests
// Phase 9.1.1 — Authoritative Input Alignment
//
// ============================================================

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateMean,
  calculateMedian,
  calculateVariance,
  calculateStatistics,
  extractNumericValues,
  analyzeStatistics,
} = require("../services/statisticalAnalysisService");

// ============================================================
// BASIC STATISTICS
// ============================================================

test("mean calculates the arithmetic mean", () => {
  assert.equal(calculateMean([10, 20, 30]), 20);
});

test("median returns the middle value", () => {
  assert.equal(calculateMedian([30, 10, 20]), 20);
});

test("median averages the two middle values for even populations", () => {
  assert.equal(calculateMedian([10, 20, 30, 40]), 25);
});

test("variance uses the population denominator", () => {
  assert.equal(calculateVariance([10, 20, 30], 20), 200 / 3);
});

test("calculateStatistics returns complete descriptive statistics", () => {
  const result = calculateStatistics([10, 20, 30]);

  assert.equal(result.count, 3);
  assert.equal(result.minimum, 10);
  assert.equal(result.maximum, 30);
  assert.equal(result.mean, 20);
  assert.equal(result.median, 20);
  assert.equal(result.variance, 200 / 3);
  assert.equal(result.standardDeviation, Math.sqrt(200 / 3));
});

// ============================================================
// EMPTY DATA
// ============================================================

test("calculateStatistics returns null statistics for empty input", () => {
  assert.deepEqual(calculateStatistics([]), {
    count: 0,
    minimum: null,
    maximum: null,
    mean: null,
    median: null,
    variance: null,
    standardDeviation: null,
  });
});

// ============================================================
// AUTHORITATIVE OBSERVATION INPUT
// ============================================================

test("extractNumericValues reads authoritative normalized values", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.5,
          unit: "pH",
          classification: "Neutral",
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
      },
    },
  ];

  assert.deepEqual(
    extractNumericValues(observations, "pH"),
    [6.5, 7.0],
  );
});

test("extractNumericValues excludes unavailable authoritative values", () => {
  const observations = [
    {
      values: {
        pH: {
          value: 6.5,
          unit: "pH",
          classification: "Neutral",
        },
      },
    },
    {
      values: {
        pH: {
          value: null,
          unit: "pH",
          classification: null,
        },
      },
    },
    {
      values: {
        pH: {
          value: undefined,
          unit: "pH",
          classification: null,
        },
      },
    },
    {
      values: {},
    },
  ];

  assert.deepEqual(
    extractNumericValues(observations, "pH"),
    [6.5],
  );
});

test("extractNumericValues preserves authoritative numeric nitrogen values", () => {
  const observations = [
    {
      values: {
        nitrogen: {
          value: 100,
          unit: "kg/ha",
          classification: "Low",
        },
      },
    },
    {
      values: {
        nitrogen: {
          value: 200,
          unit: "kg/ha",
          classification: "Medium",
        },
      },
    },
    {
      values: {
        nitrogen: {
          value: 300,
          unit: "kg/ha",
          classification: "Medium",
        },
      },
    },
  ];

  assert.deepEqual(
    extractNumericValues(observations, "nitrogen"),
    [100, 200, 300],
  );
});

// ============================================================
// COMPLETE STATISTICAL RESULT
// ============================================================

test("analyzeStatistics produces a validated statistical result", () => {
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
        phosphorus: {
          value: 10,
          unit: "kg/ha",
          classification: "Medium",
        },
        potassium: {
          value: 200,
          unit: "kg/ha",
          classification: "Medium",
        },
        organicCarbon: {
          value: 0.5,
          unit: "%",
          classification: "Medium",
        },
        electricalConductivity: {
          value: 0.3,
          unit: "dS/m",
          classification: "Non-saline",
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
        phosphorus: {
          value: 20,
          unit: "kg/ha",
          classification: "Medium",
        },
        potassium: {
          value: 300,
          unit: "kg/ha",
          classification: "High",
        },
        organicCarbon: {
          value: 0.7,
          unit: "%",
          classification: "Medium",
        },
        electricalConductivity: {
          value: 0.5,
          unit: "dS/m",
          classification: "Very slightly saline",
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
          classification: "Medium",
        },
        phosphorus: {
          value: 30,
          unit: "kg/ha",
          classification: "High",
        },
        potassium: {
          value: 400,
          unit: "kg/ha",
          classification: "High",
        },
        organicCarbon: {
          value: 0.9,
          unit: "%",
          classification: "High",
        },
        electricalConductivity: {
          value: 0.7,
          unit: "dS/m",
          classification: "Very slightly saline",
        },
      },
    },
  ];

  const result = analyzeStatistics(observations);

  assert.equal(result.type, "statistical_analysis");
  assert.equal(result.version, "1.0");
  assert.equal(result.parameters.length, 6);

  const pH = result.parameters.find(
    (parameter) => parameter.parameter === "pH",
  );

  assert.ok(pH);
  assert.equal(pH.unit, "pH");
  assert.equal(pH.sampleCount, 3);
  assert.equal(pH.statistics.mean, 7);
  assert.equal(pH.statistics.median, 7);
});

// ============================================================
// PARAMETER SELECTION
// ============================================================

test("analyzeStatistics supports explicit parameter selection", () => {
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

  const result = analyzeStatistics(observations, ["pH"]);

  assert.equal(result.parameters.length, 1);
  assert.equal(result.parameters[0].parameter, "pH");
});

// ============================================================
// MISSING PARAMETER DATA
// ============================================================

test("analyzeStatistics preserves zero sample count when all values are missing", () => {
  const observations = [
    {
      values: {
        pH: {
          value: null,
          unit: "pH",
          classification: null,
        },
      },
    },
    {
      values: {
        pH: {
          value: undefined,
          unit: "pH",
          classification: null,
        },
      },
    },
    {
      values: {},
    },
  ];

  const result = analyzeStatistics(observations, ["pH"]);

  assert.equal(result.parameters[0].sampleCount, 0);
  assert.equal(result.parameters[0].statistics.count, 0);
  assert.equal(result.parameters[0].statistics.mean, null);
  assert.equal(result.parameters[0].statistics.standardDeviation, null);
});

// ============================================================
// INVALID INPUT
// ============================================================

test("analyzeStatistics rejects non-array observations", () => {
  assert.throws(
    () => analyzeStatistics(null),
    /Statistical observations must be an array/,
  );
});

test("analyzeStatistics rejects an empty parameter selection", () => {
  assert.throws(
    () => analyzeStatistics([], []),
    /Statistical parameters are required/,
  );
});

test("analyzeStatistics rejects unsupported parameters", () => {
  assert.throws(
    () => analyzeStatistics([{ values: {} }], ["temperature"]),
    /Unsupported statistical parameter: temperature/,
  );
});
