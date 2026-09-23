"use strict";

// ============================================================
// server/tests/historicalComparisonService.test.js
// Soil Analysis GIS — Phase 10.4.2
// Historical Comparison Service Regression Suite
// ============================================================

const assert = require("assert");

const service = require("../services/historicalComparisonService");
const repository = require("../repositories/historicalRepository");

const {
  API_PHASE,
  STAGE_ORDER,
  PARAMETERS,
  validateRequest,
  calculateChange,
  buildClassificationTransition,
  getHistoricalComparison,
} = service;

const DATASET = {
  id: 2,
  dataset_code: "H2",
  dataset_name: "Visakhapatnam Kharif Rice Soil Fertility Dataset",
  publication_year: 2020,
  status: "active",
};

const ROWS = [
  {
    id: 1,
    dataset_id: 2,
    dataset_code: "H2",
    dataset_name: DATASET.dataset_name,
    publication_year: 2020,
    status: "active",
    sample_code: "H2-PADERU-01-BEFORE",
    mandal: "Paderu",
    site_no: 1,
    latitude: 18.0,
    longitude: 83.0,
    stage: "Before sowing",
    collection_period_start: "2018-05-07",
    collection_period_end: "2018-05-13",
    depth_from_cm: 0,
    depth_to_cm: 15,
    source_status: "verified",
    ph: 6.0,
    nitrogen: 200,
    phosphorus: 8,
    potassium: 100,
    organic_carbon: 5,
    electrical_conductivity: 0.3,
  },
  {
    id: 2,
    dataset_id: 2,
    dataset_code: "H2",
    dataset_name: DATASET.dataset_name,
    publication_year: 2020,
    status: "active",
    sample_code: "H2-PADERU-01-DURING",
    mandal: "Paderu",
    site_no: 1,
    latitude: 18.0,
    longitude: 83.0,
    stage: "During growth",
    collection_period_start: "2018-08-11",
    collection_period_end: "2018-08-16",
    depth_from_cm: 0,
    depth_to_cm: 15,
    source_status: "verified",
    ph: 6.5,
    nitrogen: 300,
    phosphorus: 15,
    potassium: 200,
    organic_carbon: 7,
    electrical_conductivity: 0.5,
  },
  {
    id: 3,
    dataset_id: 2,
    dataset_code: "H2",
    dataset_name: DATASET.dataset_name,
    publication_year: 2020,
    status: "active",
    sample_code: "H2-PADERU-01-AFTER",
    mandal: "Paderu",
    site_no: 1,
    latitude: 18.0,
    longitude: 83.0,
    stage: "After harvesting",
    collection_period_start: "2018-11-06",
    collection_period_end: "2018-11-11",
    depth_from_cm: 0,
    depth_to_cm: 15,
    source_status: "verified",
    ph: 7.0,
    nitrogen: 400,
    phosphorus: 30,
    potassium: 300,
    organic_carbon: 9,
    electrical_conductivity: 1.0,
  },
];

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const current of tests) {
    try {
      await current.fn();
      passed += 1;
      console.log(`PASS: ${current.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL: ${current.name}`);
      console.error(`      ${error.message}`);
    }
  }

  console.log("");
  console.log("============================================================");
  console.log("Historical Comparison Service Regression Summary");
  console.log("============================================================");
  console.log(`Tests: ${passed + failed}`);
  console.log(`Pass:  ${passed}`);
  console.log(`Fail:  ${failed}`);
  console.log("============================================================");

  if (failed > 0) process.exitCode = 1;
}

async function withMocks(
  { dataset = DATASET, rows = ROWS, exclusions = [] } = {},
  fn,
) {
  const originalDataset = repository.getHistoricalDatasetByCode;
  const originalRows = repository.getHistoricalSiteObservations;
  const originalExclusions = repository.getHistoricalSiteExclusions;

  try {
    repository.getHistoricalDatasetByCode = async () => dataset;
    repository.getHistoricalSiteObservations = async () => rows;
    repository.getHistoricalSiteExclusions = async () => exclusions;

    return await fn();
  } finally {
    repository.getHistoricalDatasetByCode = originalDataset;
    repository.getHistoricalSiteObservations = originalRows;
    repository.getHistoricalSiteExclusions = originalExclusions;
  }
}

async function getTestComparison(rows = ROWS, parameter = "ph") {
  return getHistoricalComparison({
    datasetCode: "H2",
    mandal: "Paderu",
    siteNo: 1,
    parameter,
  });
}

// ============================================================
// CONTRACT / CONSTANTS
// ============================================================

test("API phase is 10.4", () => {
  assert.strictEqual(API_PHASE, "10.4");
});

test("stage order is correct", () => {
  assert.deepStrictEqual(STAGE_ORDER, [
    "Before sowing",
    "During growth",
    "After harvesting",
  ]);
});

test("six historical parameters are supported", () => {
  assert.deepStrictEqual(Object.keys(PARAMETERS), [
    "ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon",
    "electrical_conductivity",
  ]);
});

// ============================================================
// VALIDATION
// ============================================================

test("valid request passes validation", () => {
  assert.strictEqual(
    validateRequest({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      parameter: "ph",
    }),
    null,
  );
});

test("missing dataset is rejected", () => {
  assert.ok(
    validateRequest({
      mandal: "Paderu",
      siteNo: 1,
      parameter: "ph",
    }),
  );
});

test("invalid site number is rejected", () => {
  assert.ok(
    validateRequest({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 0,
      parameter: "ph",
    }),
  );
});

test("unsupported parameter is rejected", () => {
  assert.ok(
    validateRequest({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      parameter: "calcium",
    }),
  );
});

test("less than two stages is rejected", () => {
  assert.ok(
    validateRequest({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      parameter: "ph",
      stages: ["Before sowing"],
    }),
  );
});

// ============================================================
// CHANGE CALCULATIONS
// ============================================================

test("absolute change is calculated correctly", () => {
  const result = calculateChange(10, 15);

  assert.strictEqual(result.absoluteChange, 5);
  assert.strictEqual(result.percentageChange, 50);
  assert.strictEqual(result.comparisonEligible, true);
});

test("negative change is preserved", () => {
  const result = calculateChange(20, 15);

  assert.strictEqual(result.absoluteChange, -5);
  assert.strictEqual(result.percentageChange, -25);
});

test("zero starting value has null percentage change", () => {
  const result = calculateChange(0, 10);

  assert.strictEqual(result.absoluteChange, 10);
  assert.strictEqual(result.percentageChange, null);
  assert.strictEqual(result.comparisonEligible, true);
});

test("missing value makes comparison ineligible", () => {
  const result = calculateChange(null, 10);

  assert.strictEqual(result.absoluteChange, null);
  assert.strictEqual(result.percentageChange, null);
  assert.strictEqual(result.comparisonEligible, false);
});

test("classification transition detects change", () => {
  assert.deepStrictEqual(buildClassificationTransition("Low", "Medium"), {
    from: "Low",
    to: "Medium",
    changed: true,
  });
});

test("unchanged classification is detected", () => {
  assert.deepStrictEqual(buildClassificationTransition("Medium", "Medium"), {
    from: "Medium",
    to: "Medium",
    changed: false,
  });
});

// ============================================================
// END-TO-END
// ============================================================

test("successful H2 site comparison", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.phase, "10.4");
  });
});

test("successful comparison is eligible", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.eligible, true);
    assert.strictEqual(result.comparison.eligibilityReason, null);
  });
});

test("dataset metadata is returned", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.dataset.code, "H2");
    assert.strictEqual(result.comparison.dataset.publicationYear, 2020);
  });
});

test("site metadata is returned", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.site.mandal, "Paderu");
    assert.strictEqual(result.comparison.site.siteNo, 1);
    assert.strictEqual(result.comparison.site.latitude, 18);
    assert.strictEqual(result.comparison.site.longitude, 83);
  });
});

test("depth compatibility is reported", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.deepStrictEqual(result.comparison.depth, {
      fromCm: 0,
      toCm: 15,
      compatible: true,
    });
  });
});

test("three stage observations are returned in chronological order", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.deepStrictEqual(
      result.comparison.observations.map((x) => x.stage),
      ["Before sowing", "During growth", "After harvesting"],
    );
  });
});

test("backend classification is returned", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(
      result.comparison.observations[0].classification,
      "Acidic",
    );

    assert.strictEqual(
      result.comparison.observations[1].classification,
      "Neutral",
    );
  });
});

test("two sequential changes are returned", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.changes.length, 2);

    assert.strictEqual(result.comparison.changes[0].fromStage, "Before sowing");

    assert.strictEqual(result.comparison.changes[0].toStage, "During growth");
  });
});

test("change calculation is correct", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    const change = result.comparison.changes[0];

    assert.strictEqual(change.fromValue, 6);
    assert.strictEqual(change.toValue, 6.5);
    assert.strictEqual(change.absoluteChange, 0.5);
    assert.strictEqual(change.percentageChange, 8.333333);
    assert.strictEqual(change.comparisonEligible, true);
  });
});

test("classification transition is returned", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.deepStrictEqual(
      result.comparison.changes[0].classificationTransition,
      {
        from: "Acidic",
        to: "Neutral",
        changed: true,
      },
    );
  });
});

// ============================================================
// STAGE FILTER
// ============================================================

test("explicit stages can be selected", async () => {
  await withMocks({}, async () => {
    const result = await getHistoricalComparison({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      parameter: "ph",
      stages: ["Before sowing", "After harvesting"],
    });

    assert.deepStrictEqual(
      result.comparison.observations.map((x) => x.stage),
      ["Before sowing", "After harvesting"],
    );

    assert.strictEqual(result.comparison.changes.length, 1);
  });
});

test("missing requested stage is rejected", async () => {
  await withMocks(
    {
      rows: ROWS.slice(0, 2),
    },
    async () => {
      const result = await getHistoricalComparison({
        datasetCode: "H2",
        mandal: "Paderu",
        siteNo: 1,
        parameter: "ph",
        stages: ["Before sowing", "After harvesting"],
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, "STAGE_NOT_FOUND");
    },
  );
});

// ============================================================
// MISSING DATA
// ============================================================

test("missing measurement makes change ineligible", async () => {
  const rows = ROWS.map((row) => ({ ...row }));
  rows[1].ph = null;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.eligible, true);

    assert.strictEqual(result.comparison.changes[0].comparisonEligible, false);

    assert.strictEqual(result.comparison.changes[0].absoluteChange, null);

    assert.strictEqual(
      result.comparison.changes[0].reason,
      "Missing parameter value.",
    );
  });
});

test("zero starting value keeps change eligible", async () => {
  const rows = ROWS.map((row) => ({ ...row }));

  rows[0].ph = 0;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    const change = result.comparison.changes[0];

    assert.strictEqual(result.comparison.eligible, true);

    assert.strictEqual(change.comparisonEligible, true);

    assert.strictEqual(change.absoluteChange, 6.5);

    assert.strictEqual(change.percentageChange, null);
  });
});

// ============================================================
// DEPTH COMPATIBILITY
// ============================================================

test("incompatible depths make comparison ineligible", async () => {
  const rows = ROWS.map((row) => ({ ...row }));

  rows[2].depth_to_cm = 30;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, false);

    assert.strictEqual(result.comparison.eligible, false);

    assert.strictEqual(
      result.comparison.eligibilityReason,
      "Sampling depths are incompatible.",
    );

    assert.strictEqual(result.comparison.changes[0].comparisonEligible, false);

    assert.strictEqual(
      result.comparison.changes[0].reason,
      "Sampling depths are incompatible.",
    );
  });
});

test("missing depth_from makes comparison ineligible", async () => {
  const rows = ROWS.map((row) => ({ ...row }));

  rows[1].depth_from_cm = null;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, false);

    assert.strictEqual(result.comparison.eligible, false);

    assert.strictEqual(
      result.comparison.eligibilityReason,
      "Sampling depths are incompatible.",
    );
  });
});

test("missing depth_to makes comparison ineligible", async () => {
  const rows = ROWS.map((row) => ({ ...row }));

  rows[1].depth_to_cm = null;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, false);

    assert.strictEqual(result.comparison.eligible, false);

    assert.strictEqual(
      result.comparison.eligibilityReason,
      "Sampling depths are incompatible.",
    );
  });
});

test("both observations with missing depths remain ineligible", async () => {
  const rows = ROWS.slice(0, 2).map((row) => ({
    ...row,
    depth_from_cm: null,
    depth_to_cm: null,
  }));

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, false);

    assert.strictEqual(result.comparison.eligible, false);

    assert.strictEqual(
      result.comparison.eligibilityReason,
      "Sampling depths are incompatible.",
    );
  });
});

test("one valid depth and one missing depth are incompatible", async () => {
  const rows = ROWS.slice(0, 2).map((row) => ({
    ...row,
  }));

  rows[1].depth_from_cm = null;
  rows[1].depth_to_cm = null;

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, false);

    assert.strictEqual(result.comparison.eligible, false);
  });
});

test("compatible depths make whole comparison eligible", async () => {
  const rows = ROWS.slice(0, 2).map((row) => ({
    ...row,
    depth_from_cm: 0,
    depth_to_cm: 15,
  }));

  await withMocks({ rows }, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.comparison.depth.compatible, true);

    assert.strictEqual(result.comparison.eligible, true);

    assert.strictEqual(result.comparison.eligibilityReason, null);
  });
});

// ============================================================
// EXCLUSION / ERRORS
// ============================================================

test("excluded site is rejected", async () => {
  await withMocks(
    {
      exclusions: [
        {
          id: 1,
          dataset_code: "H2",
          source_sample_reference: "Anakapalle Site 3",
          mandal: "Anakapalle",
          site_no: 3,
          stage: "Before sowing",
          reason: "Coordinate requires independent verification.",
        },
      ],
    },
    async () => {
      const result = await getHistoricalComparison({
        datasetCode: "H2",
        mandal: "Anakapalle",
        siteNo: 3,
        parameter: "ph",
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.code, "SITE_EXCLUDED");
    },
  );
});

test("missing dataset is reported", async () => {
  await withMocks({ dataset: null }, async () => {
    const result = await getHistoricalComparison({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 1,
      parameter: "ph",
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, "DATASET_NOT_FOUND");
  });
});

test("missing site is reported", async () => {
  await withMocks({ rows: [] }, async () => {
    const result = await getHistoricalComparison({
      datasetCode: "H2",
      mandal: "Paderu",
      siteNo: 99,
      parameter: "ph",
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, "SITE_NOT_FOUND");
  });
});

// ============================================================
// METADATA
// ============================================================

test("backend calculation metadata is exposed", async () => {
  await withMocks({}, async () => {
    const result = await getTestComparison();

    assert.strictEqual(result.metadata.classificationLocation, "backend");

    assert.strictEqual(result.metadata.calculationLocation, "backend");

    assert.strictEqual(result.metadata.source, "historical_database");

    assert.ok(result.metadata.generatedAt);
  });
});

// ============================================================
// RUN
// ============================================================

runTests().catch((error) => {
  console.error("");
  console.error("Historical Comparison Service regression suite failed.");
  console.error(error);
  process.exitCode = 1;
});
