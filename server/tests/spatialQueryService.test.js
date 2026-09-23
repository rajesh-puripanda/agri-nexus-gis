"use strict";

// ============================================================
// server/tests/spatialQueryService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 10.5 — Regression & Performance Validation
//
// Service under test:
//   server/services/spatialQueryService.js
//
// Focus:
//   1. Public service contract
//   2. Query validation
//   3. Haversine distance
//   4. Spatial matching
//   5. Classification filtering
//   6. Bounding-box filtering
//   7. Combined filtering
//   8. Query definition
//   9. Sample extent
//  10. End-to-end query response
//
// ============================================================

const assert = require("assert");

const spatialQueryService = require("../services/spatialQueryService");
const soilRepository = require("../repositories/soilRepository");

// ============================================================
// PUBLIC API
// ============================================================

const {
  API_PHASE,
  EARTH_RADIUS_METERS,
  MAX_RADIUS_METERS,
  SUPPORTED_PARAMETERS,
  CLASSIFICATIONS_BY_PARAMETER,
  validateQuery,
  calculateDistanceMeters,
  calculateSampleExtent,
  matchesRadius,
  matchesBoundingBox,
  classifyParameter,
  classifyOverallFertility,
  matchesAttribute,
  filterSamples,
  buildQueryDefinition,
  querySamples,
} = spatialQueryService;

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
    texture: "Loamy",
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
    texture: "Clay",
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
    texture: "Sandy",
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
    texture: "Loamy",
  },
];

// ============================================================
// HELPERS
// ============================================================

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(`      ${error.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(`      ${error.message}`);
  }
}

function normalized(overrides = {}) {
  return {
    parameter: null,
    classification: null,
    latitude: null,
    longitude: null,
    radius: null,
    minLatitude: null,
    maxLatitude: null,
    minLongitude: null,
    maxLongitude: null,
    ...overrides,
  };
}

function parameterNames() {
  return Array.isArray(SUPPORTED_PARAMETERS)
    ? [...SUPPORTED_PARAMETERS]
    : Object.keys(SUPPORTED_PARAMETERS);
}

// ============================================================
// LOAD
// ============================================================

console.log("Spatial Query Service regression suite loaded.");

// ============================================================
// CONSTANTS
// ============================================================

test("API phase is 10.3", () => {
  assert.strictEqual(API_PHASE, "10.3");
});

test("Earth radius is 6371000 meters", () => {
  assert.strictEqual(EARTH_RADIUS_METERS, 6371000);
});

test("maximum radius is 100000 meters", () => {
  assert.strictEqual(MAX_RADIUS_METERS, 100000);
});

test("supported parameters are exported", () => {
  const parameters = parameterNames();

  assert.deepStrictEqual(parameters, [
    "ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon",
    "electrical_conductivity",
    "overall_fertility",
  ]);
});

test("classification definitions are exported", () => {
  assert.ok(CLASSIFICATIONS_BY_PARAMETER);
  assert.ok(Array.isArray(CLASSIFICATIONS_BY_PARAMETER.ph));
  assert.ok(Array.isArray(CLASSIFICATIONS_BY_PARAMETER.nitrogen));
  assert.ok(Array.isArray(CLASSIFICATIONS_BY_PARAMETER.overall_fertility));
});

test("pH classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.ph, [
    "acidic",
    "neutral",
    "alkaline",
  ]);
});

test("nitrogen classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.nitrogen, [
    "low",
    "medium",
    "high",
  ]);
});

test("phosphorus classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.phosphorus, [
    "low",
    "medium",
    "high",
    "very_high",
  ]);
});

test("potassium classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.potassium, [
    "low",
    "medium",
    "high",
    "very_high",
  ]);
});

test("organic carbon classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.organic_carbon, [
    "low",
    "medium",
    "high",
  ]);
});

test("EC classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.electrical_conductivity, [
    "non_saline",
    "very_slightly_saline",
    "moderately_saline",
    "strongly_saline",
  ]);
});

test("overall fertility classifications are defined", () => {
  assert.deepStrictEqual(CLASSIFICATIONS_BY_PARAMETER.overall_fertility, [
    "low",
    "moderate_good",
    "high",
    "unavailable",
  ]);
});

// ============================================================
// QUERY VALIDATION
// ============================================================

test("empty query is rejected", () => {
  const result = validateQuery({});

  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("parameter without classification is rejected", () => {
  const result = validateQuery({
    parameter: "nitrogen",
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Classification is required")),
  );
});

test("classification without parameter is rejected", () => {
  const result = validateQuery({
    classification: "low",
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Parameter is required")),
  );
});

test("unsupported parameter is rejected", () => {
  const result = validateQuery({
    parameter: "calcium",
    classification: "low",
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Unsupported parameter")),
  );
});

test("invalid pH classification is rejected", () => {
  const result = validateQuery({
    parameter: "ph",
    classification: "low",
  });

  assert.strictEqual(result.valid, false);
});

test("valid nitrogen attribute query is accepted", () => {
  const result = validateQuery({
    parameter: "nitrogen",
    classification: "low",
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized.parameter, "nitrogen");
  assert.strictEqual(result.normalized.classification, "low");
});

test("parameter normalization is case-insensitive", () => {
  const result = validateQuery({
    parameter: " Nitrogen ",
    classification: " LOW ",
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized.parameter, "nitrogen");
  assert.strictEqual(result.normalized.classification, "low");
});

test("valid radius query is accepted", () => {
  const result = validateQuery({
    latitude: "17.71234",
    longitude: "83.30125",
    radius: "2000",
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized.latitude, 17.71234);
  assert.strictEqual(result.normalized.longitude, 83.30125);
  assert.strictEqual(result.normalized.radius, 2000);
});

test("radius query requires latitude", () => {
  const result = validateQuery({
    longitude: 83.30125,
    radius: 2000,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Latitude is required")),
  );
});

test("radius query requires longitude", () => {
  const result = validateQuery({
    latitude: 17.71234,
    radius: 2000,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Longitude is required")),
  );
});

test("radius query requires radius", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("Radius is required")),
  );
});

test("zero radius is rejected", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
    radius: 0,
  });

  assert.strictEqual(result.valid, false);
});

test("negative radius is rejected", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
    radius: -1,
  });

  assert.strictEqual(result.valid, false);
});

test("radius above maximum is rejected", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
    radius: MAX_RADIUS_METERS + 1,
  });

  assert.strictEqual(result.valid, false);
});

test("invalid latitude is rejected", () => {
  const result = validateQuery({
    latitude: 91,
    longitude: 83.30125,
    radius: 1000,
  });

  assert.strictEqual(result.valid, false);
});

test("invalid longitude is rejected", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 181,
    radius: 1000,
  });

  assert.strictEqual(result.valid, false);
});

test("valid bounding-box query is accepted", () => {
  const result = validateQuery({
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.28,
    maxLongitude: 83.32,
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized.minLatitude, 17.69);
  assert.strictEqual(result.normalized.maxLatitude, 17.73);
  assert.strictEqual(result.normalized.minLongitude, 83.28);
  assert.strictEqual(result.normalized.maxLongitude, 83.32);
});

test("incomplete bounding box is rejected", () => {
  const result = validateQuery({
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.28,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("maxLongitude is required")),
  );
});

test("reversed latitude bounds are rejected", () => {
  const result = validateQuery({
    minLatitude: 17.73,
    maxLatitude: 17.69,
    minLongitude: 83.28,
    maxLongitude: 83.32,
  });

  assert.strictEqual(result.valid, false);
});

test("reversed longitude bounds are rejected", () => {
  const result = validateQuery({
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.32,
    maxLongitude: 83.28,
  });

  assert.strictEqual(result.valid, false);
});

test("radius and bounding box cannot be combined", () => {
  const result = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
    radius: 2000,
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.28,
    maxLongitude: 83.32,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((error) => error.includes("cannot be used together")),
  );
});

// ============================================================
// DISTANCE
// ============================================================

test("distance between identical points is zero", () => {
  const distance = calculateDistanceMeters(
    17.71234,
    83.30125,
    17.71234,
    83.30125,
  );

  assert.ok(Math.abs(distance) < 0.000001);
});

test("distance calculation is symmetric", () => {
  const forward = calculateDistanceMeters(17.71234, 83.30125, 17.72, 83.31);

  const reverse = calculateDistanceMeters(17.72, 83.31, 17.71234, 83.30125);

  assert.ok(Math.abs(forward - reverse) < 0.000001);
});

test("invalid coordinates return null distance", () => {
  const distance = calculateDistanceMeters(91, 83.30125, 17.71234, 83.30125);

  assert.strictEqual(distance, null);
});

// ============================================================
// SPATIAL MATCHING
// ============================================================

test("sample matches zero-radius-equivalent point query", () => {
  const result = matchesRadius(
    SAMPLE_DATA[0],
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    0,
  );

  assert.strictEqual(result, true);
});

test("sample outside radius does not match", () => {
  const result = matchesRadius(
    SAMPLE_DATA[1],
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    1,
  );

  assert.strictEqual(result, false);
});

test("sample inside radius matches", () => {
  const distance = calculateDistanceMeters(
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    SAMPLE_DATA[1].latitude,
    SAMPLE_DATA[1].longitude,
  );

  const result = matchesRadius(
    SAMPLE_DATA[1],
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    distance + 1,
  );

  assert.strictEqual(result, true);
});

test("sample with invalid coordinates fails radius match", () => {
  const result = matchesRadius(
    SAMPLE_DATA[3],
    SAMPLE_DATA[0].latitude,
    SAMPLE_DATA[0].longitude,
    10000,
  );

  assert.strictEqual(result, false);
});

test("sample inside bounding box matches", () => {
  const result = matchesBoundingBox(SAMPLE_DATA[0], 17.7, 17.72, 83.29, 83.31);

  assert.strictEqual(result, true);
});

test("sample outside bounding box does not match", () => {
  const result = matchesBoundingBox(SAMPLE_DATA[0], 17.7, 17.71, 83.29, 83.31);

  assert.strictEqual(result, false);
});

test("sample with invalid coordinates fails bounding-box match", () => {
  const result = matchesBoundingBox(SAMPLE_DATA[3], 17.69, 17.73, 83.28, 83.32);

  assert.strictEqual(result, false);
});

// ============================================================
// CLASSIFICATION
// ============================================================

test("S-001 nitrogen is medium", () => {
  const result = classifyParameter(SAMPLE_DATA[0], "nitrogen");

  assert.strictEqual(result.value, 350);
  assert.strictEqual(result.unit, "kg/ha");
  assert.strictEqual(result.classification, "medium");
  assert.strictEqual(result.available, true);
});

test("S-002 nitrogen is low", () => {
  const result = classifyParameter(SAMPLE_DATA[1], "nitrogen");

  assert.strictEqual(result.classification, "low");
});

test("S-003 phosphorus is very high", () => {
  const result = classifyParameter(SAMPLE_DATA[2], "phosphorus");

  assert.strictEqual(result.classification, "very_high");
});

test("S-003 EC is strongly saline", () => {
  const result = classifyParameter(SAMPLE_DATA[2], "electrical_conductivity");

  assert.strictEqual(result.value, 1.7);
  assert.strictEqual(result.unit, "dS/m");
  assert.strictEqual(result.classification, "strongly_saline");
});

test("missing parameter value is unavailable", () => {
  const sample = {
    ...SAMPLE_DATA[0],
    nitrogen: null,
  };

  const result = classifyParameter(sample, "nitrogen");

  assert.strictEqual(result.value, null);
  assert.strictEqual(result.classification, "unavailable");
  assert.strictEqual(result.available, false);
});

test("organic carbon is rounded to three decimals", () => {
  const sample = {
    ...SAMPLE_DATA[0],
    organic_carbon: 0.6549,
  };

  const result = classifyParameter(sample, "organic_carbon");

  assert.strictEqual(result.value, 0.655);
});

test("S-001 overall fertility is moderate_good", () => {
  const result = classifyOverallFertility(SAMPLE_DATA[0]);

  assert.strictEqual(result, "moderate_good");
});

test("S-002 overall fertility is low", () => {
  const result = classifyOverallFertility(SAMPLE_DATA[1]);

  assert.strictEqual(result, "low");
});

test("S-003 overall fertility is high", () => {
  const result = classifyOverallFertility(SAMPLE_DATA[2]);

  assert.strictEqual(result, "high");
});

test("overall fertility with no available nutrients is unavailable", () => {
  const sample = {
    ...SAMPLE_DATA[0],
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    organic_carbon: null,
  };

  const result = classifyOverallFertility(sample);

  assert.strictEqual(result, "unavailable");
});

// ============================================================
// ATTRIBUTE MATCHING
// ============================================================

test("attribute match finds nitrogen medium", () => {
  const matches = SAMPLE_DATA.filter((sample) =>
    matchesAttribute(sample, "nitrogen", "medium"),
  );

  assert.deepStrictEqual(
    matches.map((sample) => sample.sample_code),
    ["S-001", "S-004"],
  );
});

test("attribute match finds nitrogen low", () => {
  const matches = SAMPLE_DATA.filter((sample) =>
    matchesAttribute(sample, "nitrogen", "low"),
  );

  assert.deepStrictEqual(
    matches.map((sample) => sample.sample_code),
    ["S-002"],
  );
});

test("attribute match supports overall fertility", () => {
  const matches = SAMPLE_DATA.filter((sample) =>
    matchesAttribute(sample, "overall_fertility", "high"),
  );

  assert.deepStrictEqual(
    matches.map((sample) => sample.sample_code),
    ["S-003"],
  );
});

// ============================================================
// SAMPLE EXTENT
// ============================================================

test("calculateSampleExtent returns correct bounds", () => {
  const extent = calculateSampleExtent(SAMPLE_DATA);

  assert.deepStrictEqual(extent, {
    minLatitude: 17.7,
    maxLatitude: 17.72,
    minLongitude: 83.29,
    maxLongitude: 83.31,
  });
});

test("calculateSampleExtent ignores samples with invalid coordinates", () => {
  const samples = [
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
  ];

  const extent = calculateSampleExtent(samples);

  assert.deepStrictEqual(extent, {
    minLatitude: 17.71234,
    maxLatitude: 17.71234,
    minLongitude: 83.30125,
    maxLongitude: 83.30125,
  });
});

test("calculateSampleExtent returns null bounds when no coordinates are valid", () => {
  const extent = calculateSampleExtent([
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
  ]);

  assert.deepStrictEqual(extent, {
    minLatitude: null,
    maxLatitude: null,
    minLongitude: null,
    maxLongitude: null,
  });
});

// ============================================================
// FILTER SAMPLES
// ============================================================

test("filterSamples with nitrogen low returns S-002", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "nitrogen",
      classification: "low",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-002"],
  );
});

test("filterSamples with pH acidic returns S-002", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "ph",
      classification: "acidic",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-002"],
  );
});

test("filterSamples with pH neutral returns S-001 and S-004", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "ph",
      classification: "neutral",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001", "S-004"],
  );
});

test("filterSamples with phosphorus very high returns S-003", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "phosphorus",
      classification: "very_high",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-003"],
  );
});

test("filterSamples with potassium very high returns S-003", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "potassium",
      classification: "very_high",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-003"],
  );
});

test("filterSamples with overall fertility high returns S-003", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "overall_fertility",
      classification: "high",
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-003"],
  );
});

test("filterSamples with radius centered on S-001 includes S-001", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
      radius: 1,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001"],
  );
});

test("filterSamples with radius includes all three spatial samples when large enough", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
      radius: 10000,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001", "S-002", "S-003"],
  );
});

test("filterSamples with bounding box returns spatial samples only", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      minLatitude: 17.69,
      maxLatitude: 17.73,
      minLongitude: 83.28,
      maxLongitude: 83.32,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001", "S-002", "S-003"],
  );
});

test("filterSamples with tight bounding box returns S-001 only", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      minLatitude: 17.71,
      maxLatitude: 17.715,
      minLongitude: 83.3,
      maxLongitude: 83.305,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001"],
  );
});

test("filterSamples combines attribute and radius filters with AND semantics", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "nitrogen",
      classification: "low",
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
      radius: 10000,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-002"],
  );
});

test("filterSamples combines attribute and bounding-box filters", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "nitrogen",
      classification: "medium",
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.29,
      maxLongitude: 83.31,
    }),
  );

  assert.deepStrictEqual(
    result.map((sample) => sample.sample_code),
    ["S-001"],
  );
});

test("filterSamples impossible classification returns no matches", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "nitrogen",
      classification: "very_high",
    }),
  );

  assert.deepStrictEqual(result, []);
});

test("filterSamples unmatched radius returns empty", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      latitude: 18.0,
      longitude: 84.0,
      radius: 100,
    }),
  );

  assert.deepStrictEqual(result, []);
});

test("filterSamples unmatched bounding box returns empty", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      minLatitude: 18.0,
      maxLatitude: 18.1,
      minLongitude: 84.0,
      maxLongitude: 84.1,
    }),
  );

  assert.deepStrictEqual(result, []);
});

test("filterSamples preserves empty result for no matching samples", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      latitude: 18.0,
      longitude: 84.0,
      radius: 100,
    }),
  );

  assert.deepStrictEqual(result, []);
});

test("filterSamples preserves original sample objects", () => {
  const result = filterSamples(
    SAMPLE_DATA,
    normalized({
      parameter: "nitrogen",
      classification: "low",
    }),
  );

  assert.strictEqual(result[0], SAMPLE_DATA[1]);
});

// ============================================================
// QUERY DEFINITION
// ============================================================

test("buildQueryDefinition creates attribute definition", () => {
  const validation = validateQuery({
    parameter: "nitrogen",
    classification: "low",
  });

  assert.strictEqual(validation.valid, true);

  const query = buildQueryDefinition(validation.normalized);

  assert.deepStrictEqual(query, {
    attribute: {
      parameter: "nitrogen",
      classification: "low",
    },
    spatial: null,
  });
});

test("buildQueryDefinition creates radius definition", () => {
  const validation = validateQuery({
    latitude: 17.71234,
    longitude: 83.30125,
    radius: 2000,
  });

  assert.strictEqual(validation.valid, true);

  const query = buildQueryDefinition(validation.normalized);

  assert.deepStrictEqual(query.spatial, {
    type: "radius",
    latitude: 17.71234,
    longitude: 83.30125,
    radius: 2000,
    radiusUnit: "m",
  });
});

test("buildQueryDefinition creates bounding-box definition", () => {
  const validation = validateQuery({
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.28,
    maxLongitude: 83.32,
  });

  assert.strictEqual(validation.valid, true);

  const query = buildQueryDefinition(validation.normalized);

  assert.deepStrictEqual(query.spatial, {
    type: "bounding_box",
    minLatitude: 17.69,
    maxLatitude: 17.73,
    minLongitude: 83.28,
    maxLongitude: 83.32,
  });
});

// ============================================================
// END-TO-END QUERY
// ============================================================

asyncTest("querySamples returns successful attribute query", async () => {
  const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

    const result = await querySamples({
      parameter: "nitrogen",
      classification: "low",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.phase, "10.3");
    assert.strictEqual(result.result.count, 1);
    assert.strictEqual(result.result.samples[0].sample_code, "S-002");
    assert.strictEqual(
      result.result.samples[0].analysis.nitrogen.classification,
      "low",
    );
  } finally {
    soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
  }
});

asyncTest("querySamples returns successful radius query", async () => {
  const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

    const result = await querySamples({
      latitude: SAMPLE_DATA[0].latitude,
      longitude: SAMPLE_DATA[0].longitude,
      radius: 1,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.result.count, 1);
    assert.strictEqual(result.result.samples[0].sample_code, "S-001");
    assert.strictEqual(result.query.spatial.type, "radius");
    assert.strictEqual(result.result.samples[0].distance, 0);
    assert.strictEqual(result.result.samples[0].distanceUnit, "m");
  } finally {
    soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
  }
});

asyncTest("querySamples returns successful bounding-box query", async () => {
  const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

    const result = await querySamples({
      minLatitude: 17.71,
      maxLatitude: 17.715,
      minLongitude: 83.3,
      maxLongitude: 83.305,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.result.count, 1);
    assert.strictEqual(result.result.samples[0].sample_code, "S-001");
    assert.strictEqual(result.query.spatial.type, "bounding_box");
  } finally {
    soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
  }
});

asyncTest("querySamples returns zero results for unmatched query", async () => {
  const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

    const result = await querySamples({
      latitude: 18.0,
      longitude: 84.0,
      radius: 100,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.result.count, 0);
    assert.deepStrictEqual(result.result.samples, []);
  } finally {
    soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
  }
});

asyncTest(
  "querySamples rejects invalid query without repository call",
  async () => {
    const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

    let repositoryCalled = false;

    try {
      soilRepository.getAllSoilSamples = async () => {
        repositoryCalled = true;
        return SAMPLE_DATA;
      };

      const result = await querySamples({});

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.phase, "10.3");
      assert.strictEqual(repositoryCalled, false);
    } finally {
      soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
    }
  },
);

asyncTest(
  "querySamples preserves backend classification location metadata",
  async () => {
    const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

    try {
      soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

      const result = await querySamples({
        parameter: "ph",
        classification: "acidic",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.metadata.classificationLocation, "backend");
      assert.strictEqual(result.metadata.filteringLocation, "backend");
      assert.strictEqual(result.metadata.distanceCalculation, "haversine");
      assert.ok(result.metadata.generatedAt);
    } finally {
      soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
    }
  },
);

asyncTest("querySamples returns sample extent metadata", async () => {
  const originalGetAllSoilSamples = soilRepository.getAllSoilSamples;

  try {
    soilRepository.getAllSoilSamples = async () => SAMPLE_DATA;

    const result = await querySamples({
      parameter: "ph",
      classification: "acidic",
    });

    assert.deepStrictEqual(result.spatialMetadata.sampleExtent, {
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.29,
      maxLongitude: 83.31,
    });
  } finally {
    soilRepository.getAllSoilSamples = originalGetAllSoilSamples;
  }
});

// ============================================================
// SUMMARY
// ============================================================

process.on("beforeExit", () => {
  const total = passed + failed;

  console.log("");
  console.log("============================================================");
  console.log("Spatial Query Service Regression Summary");
  console.log("============================================================");
  console.log(`Tests: ${total}`);
  console.log(`Pass:  ${passed}`);
  console.log(`Fail:  ${failed}`);
  console.log("============================================================");

  if (failed > 0) {
    process.exitCode = 1;
  }
});
