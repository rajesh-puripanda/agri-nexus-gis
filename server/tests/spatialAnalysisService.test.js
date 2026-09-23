// ============================================================
// server/tests/spatialAnalysisService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.5 — Regression & Performance Validation
//
// Service under test:
//   server/services/spatialAnalysisService.js
//
// Architectural rules:
//   - Scientific thresholds remain in soilAnalysisService.
//   - IDW mathematics remains in interpolationService.
//   - Texture is never interpolated.
//   - Category labels are never interpolated.
//   - Continuous values are interpolated first.
//   - Existing backend classifiers are applied after interpolation.
//   - Overall fertility uses N/P/K/OC only.
//   - Missing data remains unavailable.
//   - Outside sample extent does not produce classifications.
//   - Nearest-sample context uses Haversine distance.
//   - HTTP/controller logic is outside this service.
//
// ============================================================

"use strict";

const assert = require("assert");

const spatialAnalysisService = require("../services/spatialAnalysisService");
const soilRepository = require("../repositories/soilRepository");

const {
  API_PHASE,
  SPATIAL_PARAMETERS,
  DEFAULT_POWER,
  EARTH_RADIUS_METERS,
  validateCoordinate,
  calculateSampleExtent,
  isWithinSampleExtent,
  calculateContextDistance,
  formatContextDistance,
  findNearestSample,
  buildParameterPoints,
  calculateSpatialParameter,
  calculateOverallFertility,
  prepareSpatialAnalysis,
  getSpatialAnalysis,
} = spatialAnalysisService;

// ============================================================
// TEST DATA
// ============================================================

const SAMPLE_DATA = [
  {
    id: 1,
    sample_code: "S-001",
    latitude: 17.71234,
    longitude: 83.30125,
    ph: 6.8,
    nitrogen: 350,
    phosphorus: 20,
    potassium: 200,
    organic_carbon: 0.65,
    electrical_conductivity: 0.3,
    soil_texture: "Loamy",
  },

  {
    id: 2,
    sample_code: "S-002",
    latitude: 17.72,
    longitude: 83.31,
    ph: 6.2,
    nitrogen: 250,
    phosphorus: 8,
    potassium: 100,
    organic_carbon: 0.4,
    electrical_conductivity: 0.9,
    soil_texture: "Clay",
  },

  {
    id: 3,
    sample_code: "S-003",
    latitude: 17.7,
    longitude: 83.29,
    ph: 7.8,
    nitrogen: 600,
    phosphorus: 55,
    potassium: 650,
    organic_carbon: 0.9,
    electrical_conductivity: 1.7,
    soil_texture: "Sandy",
  },

  {
    id: 4,
    sample_code: "S-004",
    latitude: null,
    longitude: null,
    ph: 6.9,
    nitrogen: 400,
    phosphorus: 20,
    potassium: 200,
    organic_carbon: 0.6,
    electrical_conductivity: 0.3,
    soil_texture: "Loamy",
  },
];

// ============================================================
// TEST RUNNER
// ============================================================
//
// Tests are registered first and executed sequentially.
//
// This is important because several tests temporarily replace
// soilRepository.getAllSoilSamples. Running them concurrently
// can cause one test's mock to affect another test.
//
// ============================================================

const tests = [];

function test(name, fn) {
  tests.push({
    name,
    fn,
    async: false,
  });
}

function asyncTest(name, fn) {
  tests.push({
    name,
    fn,
    async: true,
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const currentTest of tests) {
    try {
      await currentTest.fn();

      passed += 1;
      console.log(`PASS: ${currentTest.name}`);
    } catch (error) {
      failed += 1;

      console.error(`FAIL: ${currentTest.name}`);
      console.error(`      ${error.message}`);
    }
  }

  console.log("");
  console.log("============================================================");
  console.log("Spatial Analysis Service Regression Summary");
  console.log("============================================================");
  console.log(`Tests: ${passed + failed}`);
  console.log(`Pass:  ${passed}`);
  console.log(`Fail: ${failed}`);
  console.log("============================================================");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

// ============================================================
// ASSERTION HELPERS
// ============================================================

function expectThrows(fn, expectedMessage) {
  let thrown = false;

  try {
    fn();
  } catch (error) {
    thrown = true;

    if (expectedMessage) {
      const message = [
        error?.message,
        ...(Array.isArray(error?.validationErrors)
          ? error.validationErrors
          : []),
      ].join(" | ");

      assert.ok(
        message.includes(expectedMessage),
        `Expected error details to include "${expectedMessage}", received "${message}".`,
      );
    }
  }

  assert.ok(thrown, "Expected function to throw.");
}

// ============================================================
// REPOSITORY MOCK HELPERS
// ============================================================

async function withMockedSamples(samples, fn) {
  const original = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => samples;

    return await fn();
  } finally {
    soilRepository.getAllSoilSamples = original;
  }
}

// ============================================================
// LOAD
// ============================================================

console.log("Spatial Analysis Service regression suite loaded.");
console.log("");

// ============================================================
// PUBLIC API / CONSTANTS
// ============================================================

test("API phase is 10.2", () => {
  assert.strictEqual(API_PHASE, "10.2");
});

test("Earth radius is 6371000 meters", () => {
  assert.strictEqual(EARTH_RADIUS_METERS, 6371000);
});

test("default interpolation power is numeric", () => {
  assert.ok(Number.isFinite(DEFAULT_POWER));
});

test("spatial parameter definitions are exported", () => {
  assert.ok(SPATIAL_PARAMETERS);

  for (const key of [
    "pH",
    "nitrogen",
    "phosphorus",
    "potassium",
    "organicCarbon",
    "electricalConductivity",
  ]) {
    assert.ok(SPATIAL_PARAMETERS[key]);
  }
});

test("pH parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.pH.key,
      interpolationKey: SPATIAL_PARAMETERS.pH.interpolationKey,
      label: SPATIAL_PARAMETERS.pH.label,
      unit: SPATIAL_PARAMETERS.pH.unit,
    },
    {
      key: "pH",
      interpolationKey: "ph",
      label: "pH",
      unit: "pH",
    },
  );
});

test("nitrogen parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.nitrogen.key,
      interpolationKey: SPATIAL_PARAMETERS.nitrogen.interpolationKey,
      label: SPATIAL_PARAMETERS.nitrogen.label,
      unit: SPATIAL_PARAMETERS.nitrogen.unit,
    },
    {
      key: "nitrogen",
      interpolationKey: "nitrogen",
      label: "Nitrogen",
      unit: "kg/ha",
    },
  );
});

test("phosphorus parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.phosphorus.key,
      interpolationKey: SPATIAL_PARAMETERS.phosphorus.interpolationKey,
      label: SPATIAL_PARAMETERS.phosphorus.label,
      unit: SPATIAL_PARAMETERS.phosphorus.unit,
    },
    {
      key: "phosphorus",
      interpolationKey: "phosphorus",
      label: "Phosphorus",
      unit: "kg/ha",
    },
  );
});

test("potassium parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.potassium.key,
      interpolationKey: SPATIAL_PARAMETERS.potassium.interpolationKey,
      label: SPATIAL_PARAMETERS.potassium.label,
      unit: "kg/ha",
    },
    {
      key: "potassium",
      interpolationKey: "potassium",
      label: "Potassium",
      unit: "kg/ha",
    },
  );
});

test("organic carbon parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.organicCarbon.key,
      interpolationKey: SPATIAL_PARAMETERS.organicCarbon.interpolationKey,
      label: SPATIAL_PARAMETERS.organicCarbon.label,
      unit: SPATIAL_PARAMETERS.organicCarbon.unit,
    },
    {
      key: "organicCarbon",
      interpolationKey: "organic_carbon",
      label: "Organic Carbon",
      unit: "%",
    },
  );
});

test("electrical conductivity parameter definition is correct", () => {
  assert.deepStrictEqual(
    {
      key: SPATIAL_PARAMETERS.electricalConductivity.key,
      interpolationKey:
        SPATIAL_PARAMETERS.electricalConductivity.interpolationKey,
      label: SPATIAL_PARAMETERS.electricalConductivity.label,
      unit: SPATIAL_PARAMETERS.electricalConductivity.unit,
    },
    {
      key: "electricalConductivity",
      interpolationKey: "electrical_conductivity",
      label: "Electrical Conductivity",
      unit: "dS/m",
    },
  );
});

// ============================================================
// COORDINATE VALIDATION
// ============================================================

test("valid coordinates are accepted", () => {
  assert.deepStrictEqual(validateCoordinate(17.71234, 83.30125), {
    latitude: 17.71234,
    longitude: 83.30125,
  });
});

test("numeric coordinate strings are normalized", () => {
  assert.deepStrictEqual(validateCoordinate("17.71234", "83.30125"), {
    latitude: 17.71234,
    longitude: 83.30125,
  });
});

test("latitude below -90 is rejected", () => {
  expectThrows(
    () => validateCoordinate(-91, 83.30125),
    "Latitude must be between -90 and 90",
  );
});

test("latitude above 90 is rejected", () => {
  expectThrows(
    () => validateCoordinate(91, 83.30125),
    "Latitude must be between -90 and 90",
  );
});

test("longitude below -180 is rejected", () => {
  expectThrows(
    () => validateCoordinate(17.71234, -181),
    "Longitude must be between -180 and 180",
  );
});

test("longitude above 180 is rejected", () => {
  expectThrows(
    () => validateCoordinate(17.71234, 181),
    "Longitude must be between -180 and 180",
  );
});

test("non-numeric latitude is rejected", () => {
  expectThrows(
    () => validateCoordinate("invalid", 83.30125),
    "Latitude must be a valid numeric value",
  );
});

test("non-numeric longitude is rejected", () => {
  expectThrows(
    () => validateCoordinate(17.71234, "invalid"),
    "Longitude must be a valid numeric value",
  );
});

test("NaN latitude is rejected", () => {
  expectThrows(
    () => validateCoordinate(NaN, 83.30125),
    "Latitude must be a valid numeric value",
  );
});

test("NaN longitude is rejected", () => {
  expectThrows(
    () => validateCoordinate(17.71234, NaN),
    "Longitude must be a valid numeric value",
  );
});

test("boundary coordinates -90 and 180 are accepted", () => {
  assert.deepStrictEqual(validateCoordinate(-90, 180), {
    latitude: -90,
    longitude: 180,
  });
});

// ============================================================
// SAMPLE EXTENT
// ============================================================

test("calculateSampleExtent returns raw sample bounds", () => {
  assert.deepStrictEqual(calculateSampleExtent(SAMPLE_DATA), {
    minLatitude: 17.7,
    maxLatitude: 17.72,
    minLongitude: 83.29,
    maxLongitude: 83.31,
  });
});

test("calculateSampleExtent ignores invalid coordinates", () => {
  assert.deepStrictEqual(
    calculateSampleExtent([
      {
        latitude: 17.71234,
        longitude: 83.30125,
      },
      {
        latitude: 18.5,
        longitude: null,
      },
      {
        latitude: null,
        longitude: 83.4,
      },
    ]),
    {
      minLatitude: 17.71234,
      maxLatitude: 17.71234,
      minLongitude: 83.30125,
      maxLongitude: 83.30125,
    },
  );
});

test("calculateSampleExtent returns null without valid coordinates", () => {
  assert.strictEqual(
    calculateSampleExtent([
      {
        latitude: null,
        longitude: null,
      },
      {
        latitude: 91,
        longitude: 83,
      },
      {
        latitude: 17,
        longitude: 181,
      },
    ]),
    null,
  );
});

test("sample extent is not padded", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.strictEqual(extent.minLatitude, 17.7);
  assert.strictEqual(extent.maxLatitude, 17.72);
  assert.strictEqual(extent.minLongitude, 83.29);
  assert.strictEqual(extent.maxLongitude, 83.31);
});

// ============================================================
// SAMPLE EXTENT CONTAINMENT
// ============================================================

test("coordinate inside sample extent returns true", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.strictEqual(isWithinSampleExtent(17.71, 83.3, extent), true);
});

test("coordinate on sample extent boundary returns true", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.strictEqual(isWithinSampleExtent(17.7, 83.29, extent), true);

  assert.strictEqual(isWithinSampleExtent(17.72, 83.31, extent), true);
});

test("coordinate outside latitude extent returns false", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.strictEqual(isWithinSampleExtent(17.75, 83.3, extent), false);
});

test("coordinate outside longitude extent returns false", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.strictEqual(isWithinSampleExtent(17.71, 83.35, extent), false);
});

test("null extent returns false", () => {
  assert.strictEqual(isWithinSampleExtent(17.71, 83.3, null), false);
});

// ============================================================
// HAVERSINE CONTEXT DISTANCE
// ============================================================

test("distance between identical coordinates is zero", () => {
  const distance = calculateContextDistance(
    17.71234,
    83.30125,
    17.71234,
    83.30125,
  );

  assert.ok(Math.abs(distance) < 0.000001);
});

test("context distance is symmetric", () => {
  const forward = calculateContextDistance(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA[1].latitude,
    SAMPLE_DATA[1].longitude,
  );

  const reverse = calculateContextDistance(
    SAMPLE_DATA[1].latitude,
    SAMPLE_DATA[1].longitude,
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
  );

  assert.ok(Math.abs(forward - reverse) < 0.000001);
});

test("context distance returns null for invalid first coordinate", () => {
  assert.strictEqual(
    calculateContextDistance(91, 83.30125, 17.71234, 83.30125),
    null,
  );
});

test("context distance returns null for invalid second coordinate", () => {
  assert.strictEqual(
    calculateContextDistance(17.71234, 83.30125, 91, 83.30125),
    null,
  );
});

test("context distance returns positive ground distance", () => {
  const distance = calculateContextDistance(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA[1].latitude,
    SAMPLE_DATA[1].longitude,
  );

  assert.ok(Number.isFinite(distance));
  assert.ok(distance > 0);
});

// ============================================================
// DISTANCE PRESENTATION
// ============================================================

test("distance below one kilometre is presented in metres", () => {
  assert.deepStrictEqual(formatContextDistance(500), {
    distance: 500,
    distanceUnit: "m",
  });
});

test("distance exactly one kilometre is presented in kilometres", () => {
  assert.deepStrictEqual(formatContextDistance(1000), {
    distance: 1,
    distanceUnit: "km",
  });
});

test("distance above one kilometre is presented in kilometres", () => {
  assert.deepStrictEqual(formatContextDistance(2500), {
    distance: 2.5,
    distanceUnit: "km",
  });
});

test("invalid distance is unavailable", () => {
  assert.deepStrictEqual(formatContextDistance(null), {
    distance: null,
    distanceUnit: null,
  });

  assert.deepStrictEqual(formatContextDistance(NaN), {
    distance: null,
    distanceUnit: null,
  });
});

// ============================================================
// NEAREST SAMPLE
// ============================================================

test("findNearestSample returns exact sample", () => {
  const result = findNearestSample(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA,
  );

  assert.ok(result);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.sample_code, "S-001");
  assert.strictEqual(result.latitude, SAMPLE_DATA[0].latitude);
  assert.strictEqual(result.longitude, SAMPLE_DATA[0].longitude);
  assert.strictEqual(result.distance, 0);
  assert.strictEqual(result.distanceUnit, "m");
});

test("findNearestSample selects geographically nearest sample", () => {
  const result = findNearestSample(17.712, 83.301, SAMPLE_DATA);

  assert.ok(result);
  assert.strictEqual(result.sample_code, "S-001");
});

test("findNearestSample ignores invalid-coordinate samples", () => {
  assert.strictEqual(
    findNearestSample(17.71234, 83.30125, [SAMPLE_DATA[3]]),
    null,
  );
});

test("findNearestSample returns null when no samples exist", () => {
  assert.strictEqual(findNearestSample(17.71234, 83.30125, []), null);
});

test("nearest sample short distance uses metres", () => {
  const result = findNearestSample(17.712, 83.301, SAMPLE_DATA);

  assert.ok(result);
  assert.strictEqual(result.distanceUnit, "m");
  assert.ok(Number.isFinite(result.distance));
});

// ============================================================
// PARAMETER POINT EXTRACTION
// ============================================================

test("buildParameterPoints extracts nitrogen points", () => {
  const points = buildParameterPoints(SAMPLE_DATA, SPATIAL_PARAMETERS.nitrogen);

  assert.strictEqual(points.length, 3);

  assert.deepStrictEqual(points[0], {
    id: 1,
    sample_code: "S-001",
    latitude: 17.71234,
    longitude: 83.30125,
    value: 350,
  });
});

test("buildParameterPoints excludes invalid-coordinate samples", () => {
  const points = buildParameterPoints(SAMPLE_DATA, SPATIAL_PARAMETERS.nitrogen);

  assert.ok(!points.some((point) => point.sample_code === "S-004"));
});

test("buildParameterPoints excludes missing measurements", () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      nitrogen: null,
    },
    SAMPLE_DATA[1],
  ];

  const points = buildParameterPoints(samples, SPATIAL_PARAMETERS.nitrogen);

  assert.deepStrictEqual(
    points.map((point) => point.sample_code),
    ["S-002"],
  );
});

test("buildParameterPoints converts numeric strings", () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      nitrogen: "350",
    },
  ];

  const points = buildParameterPoints(samples, SPATIAL_PARAMETERS.nitrogen);

  assert.strictEqual(points[0].value, 350);
});

test("buildParameterPoints preserves source identity", () => {
  const points = buildParameterPoints(
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.phosphorus,
  );

  assert.deepStrictEqual(
    points.map((point) => point.sample_code),
    ["S-001", "S-002", "S-003"],
  );
});

// ============================================================
// SPATIAL PARAMETER
// ============================================================

test("exact source point returns sample source type", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.strictEqual(result.available, true);
  assert.strictEqual(result.sourceType, "sample");
  assert.strictEqual(result.value, 350);
  assert.strictEqual(result.unit, "kg/ha");
});

test("exact S-001 nitrogen classification is Medium", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.strictEqual(result.classification, "Medium");
});

test("exact S-002 phosphorus classification is Low", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[1].latitude,
    SAMPLE_DATA[1].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.phosphorus,
  );

  assert.strictEqual(result.value, 8);
  assert.strictEqual(result.classification, "Low");
});

test("exact S-003 phosphorus classification is Very High", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[2].latitude,
    SAMPLE_DATA[2].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.phosphorus,
  );

  assert.strictEqual(result.value, 55);
  assert.strictEqual(result.classification, "Very High");
});

test("exact S-003 EC classification is Strongly saline", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[2].latitude,
    SAMPLE_DATA[2].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.electricalConductivity,
  );

  assert.strictEqual(result.value, 1.7);
  assert.strictEqual(result.unit, "dS/m");
  assert.strictEqual(result.classification, "Strongly saline");
});

test("organic carbon preserves backend spatial precision", () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      organic_carbon: 0.6549,
    },
  ];

  const result = calculateSpatialParameter(
    samples[0].latitude,
    samples[0].longitude,
    samples,
    SPATIAL_PARAMETERS.organicCarbon,
  );

  // spatialAnalysisService.roundValue() uses six decimals.
  assert.strictEqual(result.value, 0.6549);
});

test("missing parameter data returns unavailable", () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      nitrogen: null,
    },
  ];

  const result = calculateSpatialParameter(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    samples,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.deepStrictEqual(result, {
    value: null,
    unit: "kg/ha",
    classification: null,
    sourceType: null,
    available: false,
  });
});

test("invalid source coordinates produce unavailable parameter result", () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      latitude: null,
      longitude: null,
    },
  ];

  const result = calculateSpatialParameter(
    17.71234,
    83.30125,
    samples,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.deepStrictEqual(result, {
    value: null,
    unit: "kg/ha",
    classification: null,
    sourceType: null,
    available: false,
  });
});

test("interpolation produces continuous value before classification", () => {
  const result = calculateSpatialParameter(
    17.71,
    83.3,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.strictEqual(result.available, true);
  assert.ok(Number.isFinite(result.value));
  assert.ok(result.classification);
});

test("spatial parameter uses backend classification output", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.strictEqual(result.classification, "Medium");
});

test("spatial parameter exposes no local threshold metadata", () => {
  const result = calculateSpatialParameter(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA,
    SPATIAL_PARAMETERS.nitrogen,
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(result, "min"),
    false,
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(result, "max"),
    false,
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(result, "threshold"),
    false,
  );
});

// ============================================================
// OVERALL FERTILITY
// ============================================================

test("medium N/P/K/OC produces Moderate / Good fertility", () => {
  const analysis = {
    nitrogen: { classification: "Medium" },
    phosphorus: { classification: "Medium" },
    potassium: { classification: "Medium" },
    organicCarbon: { classification: "Medium" },
  };

  assert.strictEqual(calculateOverallFertility(analysis), "Moderate / Good");
});

test("high N/P/K/OC produces High fertility", () => {
  const analysis = {
    nitrogen: { classification: "High" },
    phosphorus: { classification: "Very High" },
    potassium: { classification: "High" },
    organicCarbon: { classification: "High" },
  };

  assert.strictEqual(calculateOverallFertility(analysis), "High");
});

test("low nutrient classifications produce Low fertility", () => {
  const analysis = {
    nitrogen: { classification: "Low" },
    phosphorus: { classification: "Low" },
    potassium: { classification: "Low" },
    organicCarbon: { classification: "Low" },
  };

  assert.strictEqual(calculateOverallFertility(analysis), "Low");
});

test("missing N/P/K/OC classifications produce Unavailable fertility", () => {
  const analysis = {
    nitrogen: { classification: null },
    phosphorus: { classification: null },
    potassium: { classification: null },
    organicCarbon: { classification: null },
  };

  assert.strictEqual(calculateOverallFertility(analysis), "Unavailable");
});

test("pH and EC are not required for overall fertility", () => {
  const analysis = {
    nitrogen: { classification: "Medium" },
    phosphorus: { classification: "Medium" },
    potassium: { classification: "Medium" },
    organicCarbon: { classification: "Medium" },
    pH: { classification: "Acidic" },
    electricalConductivity: {
      classification: "Strongly saline",
    },
  };

  assert.strictEqual(calculateOverallFertility(analysis), "Moderate / Good");
});

// ============================================================
// END-TO-END SAMPLE CONTEXT
// ============================================================

asyncTest(
  "getSpatialAnalysis returns successful exact-sample analysis",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.phase, "10.2");

      assert.deepStrictEqual(result.location, {
        latitude: SAMPLE_DATA[0].latitude,
        longitude: SAMPLE_DATA[0].longitude,
      });
    });
  },
);

asyncTest(
  "getSpatialAnalysis identifies point within sample extent",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      assert.strictEqual(result.spatialContext.withinSampleExtent, true);
    });
  },
);

asyncTest("getSpatialAnalysis returns raw sample extent metadata", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.deepStrictEqual(result.spatialContext.sampleExtent, {
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.29,
      maxLongitude: 83.31,
    });
  });
});

asyncTest("getSpatialAnalysis returns nearest sample context", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    const nearest = result.spatialContext.nearestSample;

    assert.ok(nearest);
    assert.strictEqual(nearest.sample_code, "S-001");
    assert.strictEqual(nearest.distance, 0);
    assert.strictEqual(nearest.distanceUnit, "m");
  });
});

asyncTest(
  "getSpatialAnalysis returns nearest-sample soil texture",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      assert.strictEqual(result.sampleContext.soilTexture, "Loamy");
    });
  },
);

asyncTest("getSpatialAnalysis does not interpolate soil texture", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(17.71, 83.3);

    assert.strictEqual(result.sampleContext.soilTexture, "Loamy");

    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(
        result.interpolatedAnalysis,
        "soilTexture",
      ),
      false,
    );
  });
});

// ============================================================
// END-TO-END ANALYTICAL PARAMETERS
// ============================================================

asyncTest(
  "getSpatialAnalysis returns all six analytical parameters",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      for (const key of [
        "pH",
        "nitrogen",
        "phosphorus",
        "potassium",
        "organicCarbon",
        "electricalConductivity",
      ]) {
        assert.ok(result.interpolatedAnalysis[key]);
      }

      assert.ok(result.interpolatedAnalysis.overallFertility);
    });
  },
);

asyncTest(
  "getSpatialAnalysis classifies exact S-001 nitrogen as Medium",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      const nitrogen = result.interpolatedAnalysis.nitrogen;

      assert.strictEqual(nitrogen.value, 350);
      assert.strictEqual(nitrogen.classification, "Medium");
      assert.strictEqual(nitrogen.sourceType, "sample");
    });
  },
);

asyncTest(
  "getSpatialAnalysis classifies exact S-003 EC as Strongly saline",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[2].latitude,
        SAMPLE_DATA[2].longitude,
      );

      const ec = result.interpolatedAnalysis.electricalConductivity;

      assert.strictEqual(ec.value, 1.7);
      assert.strictEqual(ec.classification, "Strongly saline");
      assert.strictEqual(ec.sourceType, "sample");
    });
  },
);

asyncTest(
  "getSpatialAnalysis calculates overall fertility from N/P/K/OC",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(
        SAMPLE_DATA[0].latitude,
        SAMPLE_DATA[0].longitude,
      );

      assert.strictEqual(
        result.interpolatedAnalysis.overallFertility,
        "Moderate / Good",
      );
    });
  },
);

// ============================================================
// OUTSIDE SAMPLE EXTENT
// ============================================================

asyncTest("outside coordinate is marked outside sample extent", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(18.0, 84.0);

    assert.strictEqual(result.spatialContext.withinSampleExtent, false);
  });
});

asyncTest(
  "outside sample extent returns unavailable analytical values",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(18.0, 84.0);

      for (const key of [
        "pH",
        "nitrogen",
        "phosphorus",
        "potassium",
        "organicCarbon",
        "electricalConductivity",
      ]) {
        const parameter = result.interpolatedAnalysis[key];

        assert.strictEqual(parameter.value, null);
        assert.strictEqual(parameter.classification, null);
        assert.strictEqual(parameter.sourceType, null);
        assert.strictEqual(parameter.available, false);
      }
    });
  },
);

asyncTest(
  "outside sample extent does not classify unavailable values as Low",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(18.0, 84.0);

      for (const key of [
        "pH",
        "nitrogen",
        "phosphorus",
        "potassium",
        "organicCarbon",
        "electricalConductivity",
      ]) {
        assert.notStrictEqual(
          result.interpolatedAnalysis[key].classification,
          "Low",
        );
      }
    });
  },
);

asyncTest(
  "outside sample extent overall fertility is Unavailable",
  async () => {
    await withMockedSamples(SAMPLE_DATA, async () => {
      const result = await getSpatialAnalysis(18.0, 84.0);

      assert.strictEqual(
        result.interpolatedAnalysis.overallFertility,
        "Unavailable",
      );
    });
  },
);

// ============================================================
// EMPTY / INVALID REPOSITORY DATA
// ============================================================

asyncTest("empty repository result produces 404", async () => {
  await withMockedSamples([], async () => {
    await assert.rejects(
      () => getSpatialAnalysis(17.71234, 83.30125),
      (error) => {
        assert.strictEqual(error.statusCode, 404);

        assert.ok(
          error.message.includes(
            "No soil samples are available for spatial analysis",
          ),
        );

        return true;
      },
    );
  });
});

asyncTest("non-array repository result produces 404", async () => {
  await withMockedSamples(null, async () => {
    await assert.rejects(
      () => getSpatialAnalysis(17.71234, 83.30125),
      (error) => {
        assert.strictEqual(error.statusCode, 404);
        return true;
      },
    );
  });
});

asyncTest(
  "repository with no valid sample coordinates produces 422",
  async () => {
    const invalidSamples = [
      {
        id: 100,
        sample_code: "INVALID-001",
        latitude: null,
        longitude: null,
        nitrogen: 300,
        phosphorus: 20,
        potassium: 200,
        organic_carbon: 0.6,
        soil_texture: "Loamy",
      },
    ];

    await withMockedSamples(invalidSamples, async () => {
      await assert.rejects(
        () => getSpatialAnalysis(17.71234, 83.30125),
        (error) => {
          assert.strictEqual(error.statusCode, 422);

          assert.ok(
            error.message.includes(
              "No soil samples with valid spatial coordinates",
            ),
          );

          return true;
        },
      );
    });
  },
);

// ============================================================
// INVALID QUERY
// ============================================================

asyncTest("invalid latitude is rejected before repository call", async () => {
  const original = soilRepository.getAllSoilSamples;

  let repositoryCalled = false;

  try {
    soilRepository.getAllSoilSamples = async () => {
      repositoryCalled = true;
      return SAMPLE_DATA;
    };

    await assert.rejects(
      () => getSpatialAnalysis(91, 83.30125),
      (error) => {
        assert.strictEqual(error.statusCode, 400);
        return true;
      },
    );

    assert.strictEqual(repositoryCalled, false);
  } finally {
    soilRepository.getAllSoilSamples = original;
  }
});

asyncTest("invalid longitude is rejected before repository call", async () => {
  const original = soilRepository.getAllSoilSamples;

  let repositoryCalled = false;

  try {
    soilRepository.getAllSoilSamples = async () => {
      repositoryCalled = true;
      return SAMPLE_DATA;
    };

    await assert.rejects(
      () => getSpatialAnalysis(17.71234, 181),
      (error) => {
        assert.strictEqual(error.statusCode, 400);
        return true;
      },
    );

    assert.strictEqual(repositoryCalled, false);
  } finally {
    soilRepository.getAllSoilSamples = original;
  }
});

// ============================================================
// PREPARE SPATIAL ANALYSIS
// ============================================================

asyncTest("prepareSpatialAnalysis accepts latitude and longitude", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await prepareSpatialAnalysis({
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.location.latitude, SAMPLE_DATA[0].latitude);
    assert.strictEqual(result.location.longitude, SAMPLE_DATA[0].longitude);
  });
});

asyncTest("prepareSpatialAnalysis accepts lat and lng aliases", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await prepareSpatialAnalysis({
      lat: SAMPLE_DATA[0].latitude,
      lng: SAMPLE_DATA[0].longitude,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.location.latitude, SAMPLE_DATA[0].latitude);
    assert.strictEqual(result.location.longitude, SAMPLE_DATA[0].longitude);
  });
});

asyncTest("prepareSpatialAnalysis prefers latitude over lat", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await prepareSpatialAnalysis({
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
      lat: SAMPLE_DATA[1].latitude,
      lng: SAMPLE_DATA[1].longitude,
    });

    assert.strictEqual(result.location.latitude, SAMPLE_DATA[0].latitude);

    assert.strictEqual(result.location.longitude, SAMPLE_DATA[0].longitude);
  });
});

// ============================================================
// RESULT CONTRACT
// ============================================================

asyncTest("getSpatialAnalysis returns stable top-level contract", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.phase, "10.2");

    assert.ok(result.location);
    assert.ok(result.spatialContext);
    assert.ok(result.interpolatedAnalysis);
    assert.ok(result.sampleContext);
    assert.ok(result.metadata);
  });
});

asyncTest("getSpatialAnalysis exposes analytical metadata", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.strictEqual(result.metadata.interpolationMethod, "idw");

    assert.strictEqual(result.metadata.power, DEFAULT_POWER);

    assert.strictEqual(result.metadata.sampleCount, SAMPLE_DATA.length);

    assert.strictEqual(result.metadata.classificationLocation, "backend");

    assert.strictEqual(result.metadata.interpolationLocation, "backend");

    assert.strictEqual(result.metadata.presentationLocation, "frontend");

    assert.strictEqual(result.metadata.textureSource, "nearest_sample");

    assert.ok(result.metadata.generatedAt);
  });
});

asyncTest("getSpatialAnalysis exposes analytical parameter basis", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.deepStrictEqual(result.metadata.parameterBasis, [
      "pH",
      "nitrogen",
      "phosphorus",
      "potassium",
      "organicCarbon",
      "electricalConductivity",
    ]);
  });
});

asyncTest("getSpatialAnalysis exposes N/P/K/OC fertility basis", async () => {
  await withMockedSamples(SAMPLE_DATA, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.deepStrictEqual(result.metadata.overallFertilityBasis, [
      "nitrogen",
      "phosphorus",
      "potassium",
      "organicCarbon",
    ]);
  });
});

// ============================================================
// SAMPLE CONTEXT
// ============================================================

asyncTest("sample context returns null when texture is missing", async () => {
  const samples = [
    {
      ...SAMPLE_DATA[0],
      soil_texture: null,
    },
  ];

  await withMockedSamples(samples, async () => {
    const result = await getSpatialAnalysis(
      SAMPLE_DATA[0].latitude,
      SAMPLE_DATA[0].longitude,
    );

    assert.strictEqual(result.sampleContext.soilTexture, null);
  });
});

// ============================================================
// REPOSITORY ERROR PROPAGATION
// ============================================================

asyncTest("repository errors are propagated", async () => {
  const repositoryError = new Error("Database connection failed");

  const original = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => {
      throw repositoryError;
    };

    await assert.rejects(
      () => getSpatialAnalysis(17.71234, 83.30125),
      (error) => {
        assert.strictEqual(error, repositoryError);
        return true;
      },
    );
  } finally {
    soilRepository.getAllSoilSamples = original;
  }
});

// ============================================================
// RUN
// ============================================================

runTests().catch((error) => {
  console.error("");
  console.error("Spatial Analysis Service regression suite failed.");
  console.error(error);

  process.exitCode = 1;
});
