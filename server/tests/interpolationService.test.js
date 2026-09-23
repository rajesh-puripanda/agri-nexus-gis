"use strict";

// ============================================================
// server/tests/interpolationService.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 8.3 — Interpolation Service Tests
//
// Responsibilities:
//
//   1. Validate interpolation request parameters
//   2. Validate parameter and method normalization
//   3. Validate interpolation point extraction
//   4. Validate spatial extent calculations
//   5. Validate IDW calculations
//   6. Validate interpolation grid construction
//   7. Validate surface statistics
//   8. Validate interpolation configuration
//   9. Validate scientific Kriging preparation
//  10. Validate Phase 12.6.6 spline LOOCV integration
//  11. Validate Phase 12.7.6 nearest-neighbour LOOCV integration
//
// ============================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const soilRepository =
  require("../repositories/soilRepository");

const {
  API_PHASE,
  SUPPORTED_PARAMETERS,
  SUPPORTED_METHODS,
  DEFAULT_POWER,
  DEFAULT_RESOLUTION,
  MIN_RESOLUTION,
  MAX_RESOLUTION,
  MIN_POWER,
  MAX_POWER,
  validateInterpolationRequest,
  extractInterpolationPoints,
  calculateExtent,
  padExtent,
  calculateDistance,
  calculateIDWValue,
  calculateInterpolationValue,
  buildInterpolationGrid,
  calculateSurfaceStatistics,
  buildInterpolationConfiguration,
  buildInterpolationSuccessMessage,
  MIN_SAMPLE_COUNTS,
  MIN_SPLINE_LOOCV_SAMPLE_COUNT,
  MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
  validateInterpolationSampleCount,
  prepareInterpolation,
  runSplineCrossValidation,
  runNearestNeighbourCrossValidation,
  generateInterpolationSurface,
} = require("../services/interpolationService");

// ============================================================
// TEST DATA
// ============================================================

const SAMPLE_POINTS = [
  {
    id: 1,
    sample_code: "S-001",
    latitude: 17.71234,
    longitude: 83.30125,
    ph: 6.8,
    nitrogen: 285,
    phosphorus: 18,
    potassium: 240,
    organic_carbon: 0.72,
    electrical_conductivity: 0.35,
  },
  {
    id: 2,
    sample_code: "S-002",
    latitude: 17.72,
    longitude: 83.31,
    ph: 7.1,
    nitrogen: 320,
    phosphorus: 22,
    potassium: 280,
    organic_carbon: 0.81,
    electrical_conductivity: 0.42,
  },
  {
    id: 3,
    sample_code: "S-003",
    latitude: 17.7,
    longitude: 83.295,
    ph: 6.5,
    nitrogen: 250,
    phosphorus: 14,
    potassium: 210,
    organic_carbon: 0.55,
    electrical_conductivity: 0.31,
  },
];

// ============================================================
// PHASE 12.6.6 — NON-COLLINEAR TPS LOOCV FIXTURE
// ============================================================

const SPLINE_LOOCV_SAMPLES = [
  {
    id: 1,
    sample_code: "S-LOOCV-001",
    latitude: 17.7000,
    longitude: 83.3000,
    value: 10,
  },
  {
    id: 2,
    sample_code: "S-LOOCV-002",
    latitude: 17.7000,
    longitude: 83.3100,
    value: 12,
  },
  {
    id: 3,
    sample_code: "S-LOOCV-003",
    latitude: 17.7100,
    longitude: 83.3000,
    value: 14,
  },
  {
    id: 4,
    sample_code: "S-LOOCV-004",
    latitude: 17.7100,
    longitude: 83.3100,
    value: 16,
  },
];

// ============================================================
// PHASE 12.7.5 — NEAREST-NEIGHBOUR LOOCV FIXTURE
// ============================================================

const NEAREST_NEIGHBOUR_LOOCV_SAMPLES = [
  {
    id: 1,
    sample_code: "S-NN-LOOCV-001",
    latitude: 17.7000,
    longitude: 83.3000,
    value: 10,
  },
  {
    id: 2,
    sample_code: "S-NN-LOOCV-002",
    latitude: 17.7000,
    longitude: 83.3100,
    value: 20,
  },
  {
    id: 3,
    sample_code: "S-NN-LOOCV-003",
    latitude: 17.7100,
    longitude: 83.3000,
    value: 30,
  },
  {
    id: 4,
    sample_code: "S-NN-LOOCV-004",
    latitude: 17.7100,
    longitude: 83.3100,
    value: 40,
  },
];

// ============================================================
// API / CONSTANT TESTS
// ============================================================

test("API phase is 8.3", () => {
  assert.equal(API_PHASE, "8.3");
});

test("supported soil parameters are defined", () => {
  assert.ok(SUPPORTED_PARAMETERS.ph);
  assert.ok(SUPPORTED_PARAMETERS.nitrogen);
  assert.ok(SUPPORTED_PARAMETERS.phosphorus);
  assert.ok(SUPPORTED_PARAMETERS.potassium);
  assert.ok(SUPPORTED_PARAMETERS.organic_carbon);
  assert.ok(
    SUPPORTED_PARAMETERS.electrical_conductivity,
  );
});

test("supported interpolation methods are defined", () => {
  assert.ok(SUPPORTED_METHODS.idw);
  assert.equal(SUPPORTED_METHODS.idw.key, "idw");
  assert.equal(
    SUPPORTED_METHODS.idw.label,
    "Inverse Distance Weighting",
  );

  assert.ok(SUPPORTED_METHODS.kriging);
  assert.equal(
    SUPPORTED_METHODS.kriging.key,
    "kriging",
  );
  assert.equal(
    SUPPORTED_METHODS.kriging.label,
    "Kriging",
  );

  assert.ok(SUPPORTED_METHODS.spline);
  assert.equal(
    SUPPORTED_METHODS.spline.key,
    "spline",
  );
  assert.equal(
    SUPPORTED_METHODS.spline.label,
    "Thin-Plate Spline",
  );

  assert.ok(
    SUPPORTED_METHODS.nearest_neighbour,
  );
  assert.equal(
    SUPPORTED_METHODS.nearest_neighbour.key,
    "nearest_neighbour",
  );
  assert.equal(
    SUPPORTED_METHODS.nearest_neighbour.label,
    "Nearest-Neighbour",
  );
});

test("default interpolation settings are valid", () => {
  assert.equal(DEFAULT_POWER, 2);
  assert.equal(DEFAULT_RESOLUTION, 50);
  assert.equal(MIN_RESOLUTION, 10);
  assert.equal(MAX_RESOLUTION, 200);
  assert.equal(MIN_POWER, 0.5);
  assert.equal(MAX_POWER, 10);
});

// ============================================================
// REQUEST VALIDATION
// ============================================================

test("valid interpolation request is accepted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.parameter.key, "ph");
  assert.equal(result.method.key, "idw");
  assert.equal(result.power, 2);
  assert.equal(result.resolution, 50);
});

test("method defaults to IDW when omitted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.method.key, "idw");
});

test("power defaults to 2 when omitted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, DEFAULT_POWER);
});

test("resolution defaults to 50 when omitted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
  });

  assert.equal(result.valid, true);
  assert.equal(result.resolution, DEFAULT_RESOLUTION);
});

test("parameter is normalized to lowercase", () => {
  const result = validateInterpolationRequest({
    parameter: "PH",
    method: "IDW",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.parameter.key, "ph");
  assert.equal(result.method.key, "idw");
});

test("parameter surrounding whitespace is accepted", () => {
  const result = validateInterpolationRequest({
    parameter: "  ph  ",
    method: "  idw  ",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.parameter.key, "ph");
  assert.equal(result.method.key, "idw");
});

test("invalid parameter is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "calcium",
    method: "idw",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("parameter"),
    ),
  );
});

test("missing parameter is rejected", () => {
  const result = validateInterpolationRequest({
    method: "idw",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("parameter"),
    ),
  );
});

test("unsupported method is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "unsupported_method",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("method"),
    ),
  );
});

test("non-string method is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: 123,
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("method"),
    ),
  );
});

test("unsupported method error lists all supported methods", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "unsupported_method",
    power: 2,
    resolution: 50,
  });

  assert.equal(result.valid, false);

  const methodError = result.errors.find(
    (error) =>
      error.includes("method must be one of:"),
  );

  assert.ok(methodError);
  assert.ok(methodError.includes("idw"));
  assert.ok(methodError.includes("kriging"));
  assert.ok(methodError.includes("spline"));
  assert.ok(
    methodError.includes("nearest_neighbour"),
  );
});

test("Kriging does not require IDW power", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "kriging",
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, null);
});

test("thin-plate spline does not require IDW power", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "spline",
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, null);
});

test("nearest-neighbour does not require IDW power", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "nearest_neighbour",
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, null);
});

test("power is normalized from a numeric string", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: "2.5",
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, 2.5);
});

test("invalid power is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: "abc",
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("power"),
    ),
  );
});

test("power below minimum is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: MIN_POWER - 0.01,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("between"),
    ),
  );
});

test("power above maximum is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: MAX_POWER + 0.01,
    resolution: 50,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("between"),
    ),
  );
});

test("minimum power is accepted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: MIN_POWER,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, MIN_POWER);
});

test("maximum power is accepted", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: MAX_POWER,
    resolution: 50,
  });

  assert.equal(result.valid, true);
  assert.equal(result.power, MAX_POWER);
});

test("resolution is normalized from an integer string", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: "100",
  });

  assert.equal(result.valid, true);
  assert.equal(result.resolution, 100);
});

test("non-integer resolution is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: 50.5,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("whole number"),
    ),
  );
});

test("invalid resolution is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: "abc",
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("resolution"),
    ),
  );
});

test("resolution below minimum is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: MIN_RESOLUTION - 1,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("between"),
    ),
  );
});

test("resolution above maximum is rejected", () => {
  const result = validateInterpolationRequest({
    parameter: "ph",
    method: "idw",
    power: 2,
    resolution: MAX_RESOLUTION + 1,
  });

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("between"),
    ),
  );
});

test("multiple invalid request fields produce multiple errors", () => {
  const result = validateInterpolationRequest({
    parameter: "invalid",
    method: "invalid",
    power: 100,
    resolution: 1,
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);

  assert.ok(
    result.errors.some((error) =>
      error.includes(
        "parameter must be one of:",
      ),
    ),
  );

  assert.ok(
    result.errors.some((error) =>
      error.includes(
        "method must be one of:",
      ),
    ),
  );

  assert.ok(
    result.errors.some((error) =>
      error.includes(
        "resolution must be between",
      ),
    ),
  );
});

// ============================================================
// INTERPOLATION POINT EXTRACTION
// ============================================================

test("extracts valid interpolation points", () => {
  const points = extractInterpolationPoints(
    SAMPLE_POINTS,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 3);
  assert.equal(points[0].id, 1);
  assert.equal(points[0].sample_code, "S-001");
  assert.equal(points[0].latitude, 17.71234);
  assert.equal(points[0].longitude, 83.30125);
  assert.equal(points[0].value, 6.8);
});

test("extracts the requested parameter field", () => {
  const points = extractInterpolationPoints(
    SAMPLE_POINTS,
    {
      field: "nitrogen",
      label: "Nitrogen",
    },
  );

  assert.equal(points.length, 3);
  assert.equal(points[0].value, 285);
});

test("non-array samples return an empty array", () => {
  assert.deepEqual(
    extractInterpolationPoints(null, {
      field: "ph",
      label: "pH",
    }),
    [],
  );
});

test("invalid latitude is excluded", () => {
  const samples = [
    ...SAMPLE_POINTS,
    {
      id: 4,
      sample_code: "INVALID-LAT",
      latitude: 91,
      longitude: 83.3,
      ph: 7,
    },
  ];

  const points = extractInterpolationPoints(
    samples,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 3);
});

test("invalid longitude is excluded", () => {
  const samples = [
    ...SAMPLE_POINTS,
    {
      id: 4,
      sample_code: "INVALID-LON",
      latitude: 17.7,
      longitude: 181,
      ph: 7,
    },
  ];

  const points = extractInterpolationPoints(
    samples,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 3);
});

test("non-numeric parameter value is excluded", () => {
  const samples = [
    ...SAMPLE_POINTS,
    {
      id: 4,
      sample_code: "INVALID-VALUE",
      latitude: 17.7,
      longitude: 83.3,
      ph: "abc",
    },
  ];

  const points = extractInterpolationPoints(
    samples,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 3);
});

test("null parameter value is excluded from interpolation points", () => {
  const samples = [
    ...SAMPLE_POINTS,
    {
      id: 4,
      sample_code: "NULL-VALUE",
      latitude: 17.7,
      longitude: 83.3,
      ph: null,
    },
  ];

  const points = extractInterpolationPoints(
    samples,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 3);
  assert.equal(
    points.some((point) => point.id === 4),
    false,
  );
});

test("numeric strings are converted to numbers", () => {
  const samples = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: "17.71234",
      longitude: "83.30125",
      ph: "6.8",
    },
  ];

  const points = extractInterpolationPoints(
    samples,
    {
      field: "ph",
      label: "pH",
    },
  );

  assert.equal(points.length, 1);
  assert.equal(points[0].latitude, 17.71234);
  assert.equal(points[0].longitude, 83.30125);
  assert.equal(points[0].value, 6.8);
});

// ============================================================
// EXTENT CALCULATION
// ============================================================

test("calculateExtent returns null for an empty array", () => {
  assert.equal(calculateExtent([]), null);
});

test("calculateExtent returns null for non-array input", () => {
  assert.equal(calculateExtent(null), null);
});

test("calculateExtent calculates all boundaries", () => {
  const extent = calculateExtent(
    SAMPLE_POINTS.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })),
  );

  assert.equal(extent.minLatitude, 17.7);
  assert.equal(extent.maxLatitude, 17.72);
  assert.equal(extent.minLongitude, 83.295);
  assert.equal(extent.maxLongitude, 83.31);
});

test("calculateExtent works with a single point", () => {
  const extent = calculateExtent([
    {
      latitude: 17.71234,
      longitude: 83.30125,
    },
  ]);

  assert.equal(extent.minLatitude, 17.71234);
  assert.equal(extent.maxLatitude, 17.71234);
  assert.equal(extent.minLongitude, 83.30125);
  assert.equal(extent.maxLongitude, 83.30125);
});

// ============================================================
// EXTENT PADDING
// ============================================================

test("padExtent returns null for null extent", () => {
  assert.equal(padExtent(null), null);
});

test("padExtent adds two percent padding to latitude range", () => {
  const extent = {
    minLatitude: 10,
    maxLatitude: 20,
    minLongitude: 30,
    maxLongitude: 40,
  };

  const padded = padExtent(extent);

  assert.equal(padded.minLatitude, 9.8);
  assert.equal(padded.maxLatitude, 20.2);
});

test("padExtent adds two percent padding to longitude range", () => {
  const extent = {
    minLatitude: 10,
    maxLatitude: 20,
    minLongitude: 30,
    maxLongitude: 40,
  };

  const padded = padExtent(extent);

  assert.equal(padded.minLongitude, 29.8);
  assert.equal(padded.maxLongitude, 40.2);
});

test("padExtent uses 0.001 degree padding for zero latitude range", () => {
  const padded = padExtent({
    minLatitude: 17.7,
    maxLatitude: 17.7,
    minLongitude: 83.2,
    maxLongitude: 83.3,
  });

  assert.ok(
    Math.abs(padded.minLatitude - 17.699) <
      1e-12,
  );

  assert.ok(
    Math.abs(padded.maxLatitude - 17.701) <
      1e-12,
  );
});

test("padExtent uses 0.001 degree padding for zero longitude range", () => {
  const padded = padExtent({
    minLatitude: 17.7,
    maxLatitude: 17.8,
    minLongitude: 83.3,
    maxLongitude: 83.3,
  });

  assert.ok(
    Math.abs(padded.minLongitude - 83.299) <
      1e-12,
  );

  assert.ok(
    Math.abs(padded.maxLongitude - 83.301) <
      1e-12,
  );
});

test("padExtent does not exceed geographic boundaries", () => {
  const padded = padExtent({
    minLatitude: -89,
    maxLatitude: 89,
    minLongitude: -179,
    maxLongitude: 179,
  });

  assert.ok(padded.minLatitude >= -90);
  assert.ok(padded.maxLatitude <= 90);
  assert.ok(padded.minLongitude >= -180);
  assert.ok(padded.maxLongitude <= 180);
});

test("padExtent does not mutate the input extent", () => {
  const extent = {
    minLatitude: 10,
    maxLatitude: 20,
    minLongitude: 30,
    maxLongitude: 40,
  };

  const original = { ...extent };

  padExtent(extent);

  assert.deepEqual(extent, original);
});

// ============================================================
// DISTANCE
// ============================================================

test("calculateDistance returns zero for identical coordinates", () => {
  assert.equal(
    calculateDistance(
      17.7,
      83.3,
      17.7,
      83.3,
    ),
    0,
  );
});

test("calculateDistance is symmetric", () => {
  const forward = calculateDistance(
    17.7,
    83.3,
    17.8,
    83.4,
  );

  const reverse = calculateDistance(
    17.8,
    83.4,
    17.7,
    83.3,
  );

  assert.equal(forward, reverse);
});

test("calculateDistance returns a positive value for distinct coordinates", () => {
  const distance = calculateDistance(
    17.7,
    83.3,
    17.8,
    83.4,
  );

  assert.ok(distance > 0);
  assert.ok(Number.isFinite(distance));
});

// ============================================================
// IDW VALUE
// ============================================================

test("calculateIDWValue returns the exact sample value at zero distance", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const value = calculateIDWValue(
    points[0].latitude,
    points[0].longitude,
    points,
    2,
  );

  assert.equal(value, points[0].value);
});

test("calculateIDWValue returns a finite value between sample extremes", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const value = calculateIDWValue(
    17.71,
    83.302,
    points,
    2,
  );

  assert.ok(Number.isFinite(value));
  assert.ok(value >= 6.5);
  assert.ok(value <= 7.1);
});

test("calculateIDWValue responds to the power parameter", () => {
  const points = [
    {
      latitude: 0,
      longitude: 0,
      value: 0,
    },
    {
      latitude: 0,
      longitude: 1,
      value: 100,
    },
  ];

  const lowPower = calculateIDWValue(
    0,
    0.25,
    points,
    0.5,
  );

  const highPower = calculateIDWValue(
    0,
    0.25,
    points,
    4,
  );

  assert.ok(Number.isFinite(lowPower));
  assert.ok(Number.isFinite(highPower));
  assert.notEqual(lowPower, highPower);
});

test("calculateIDWValue returns null when total weight is invalid", () => {
  const value = calculateIDWValue(
    17.7,
    83.3,
    [],
    2,
  );

  assert.equal(value, null);
});

// ============================================================
// GRID
// ============================================================

test("buildInterpolationGrid returns empty grid for null extent", () => {
  const grid = buildInterpolationGrid(
    null,
    10,
    SAMPLE_POINTS,
    2,
  );

  assert.equal(grid.rows, 0);
  assert.equal(grid.columns, 0);
  assert.deepEqual(grid.cells, []);
});

test("buildInterpolationGrid creates the requested number of rows", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const grid = buildInterpolationGrid(
    {
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.295,
      maxLongitude: 83.31,
    },
    10,
    points,
    2,
  );

  assert.equal(grid.rows, 10);
  assert.equal(grid.columns, 10);
});

test("buildInterpolationGrid creates rows multiplied by columns cells", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const grid = buildInterpolationGrid(
    {
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.295,
      maxLongitude: 83.31,
    },
    10,
    points,
    2,
  );

  assert.equal(grid.cells.length, 100);
});

test("buildInterpolationGrid assigns row and column indexes", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const grid = buildInterpolationGrid(
    {
      minLatitude: 17.7,
      maxLatitude: 17.72,
      minLongitude: 83.295,
      maxLongitude: 83.31,
    },
    10,
    points,
    2,
  );

  assert.equal(grid.cells[0].row, 0);
  assert.equal(grid.cells[0].column, 0);
  assert.equal(grid.cells[99].row, 9);
  assert.equal(grid.cells[99].column, 9);
});

test("buildInterpolationGrid starts at the maximum latitude", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const extent = {
    minLatitude: 17.7,
    maxLatitude: 17.72,
    minLongitude: 83.295,
    maxLongitude: 83.31,
  };

  const grid = buildInterpolationGrid(
    extent,
    10,
    points,
    2,
  );

  assert.equal(
    grid.cells[0].latitude,
    extent.maxLatitude,
  );
});

test("buildInterpolationGrid starts at the minimum longitude", () => {
  const points = SAMPLE_POINTS.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    value: point.ph,
  }));

  const extent = {
    minLatitude: 17.7,
    maxLatitude: 17.72,
    minLongitude: 83.295,
    maxLongitude: 83.31,
  };

  const grid = buildInterpolationGrid(
    extent,
    10,
    points,
    2,
  );

  assert.equal(
    grid.cells[0].longitude,
    extent.minLongitude,
  );
});

// ============================================================
// SURFACE STATISTICS
// ============================================================

test("calculateSurfaceStatistics handles an empty array", () => {
  const statistics =
    calculateSurfaceStatistics([]);

  assert.equal(statistics.validCellCount, 0);
  assert.equal(statistics.minimum, null);
  assert.equal(statistics.maximum, null);
  assert.equal(statistics.average, null);
});

test("calculateSurfaceStatistics ignores null values", () => {
  const statistics =
    calculateSurfaceStatistics([
      { value: 1 },
      { value: null },
      { value: 3 },
      { value: undefined },
    ]);

  assert.equal(statistics.validCellCount, 2);
  assert.equal(statistics.minimum, 1);
  assert.equal(statistics.maximum, 3);
  assert.equal(statistics.average, 2);
});

test("calculateSurfaceStatistics calculates minimum and maximum", () => {
  const statistics =
    calculateSurfaceStatistics([
      { value: 4 },
      { value: 2 },
      { value: 8 },
    ]);

  assert.equal(statistics.minimum, 2);
  assert.equal(statistics.maximum, 8);
});

test("calculateSurfaceStatistics calculates arithmetic mean", () => {
  const statistics =
    calculateSurfaceStatistics([
      { value: 2 },
      { value: 4 },
      { value: 6 },
    ]);

  assert.equal(statistics.average, 4);
});

// ============================================================
// CONFIGURATION
// ============================================================

test("buildInterpolationConfiguration returns parameter metadata", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent: {
        minLatitude: 17.7,
        maxLatitude: 17.72,
        minLongitude: 83.295,
        maxLongitude: 83.31,
      },
    });

  assert.equal(configuration.parameter.key, "ph");
  assert.equal(configuration.parameter.label, "pH");
  assert.equal(configuration.parameter.field, "ph");
  assert.equal(configuration.parameter.unit, "pH");
});

test("buildInterpolationConfiguration returns method metadata", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent: null,
    });

  assert.equal(configuration.method.key, "idw");
  assert.equal(
    configuration.method.label,
    "Inverse Distance Weighting",
  );
});

test("buildInterpolationConfiguration returns settings", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent: null,
    });

  assert.equal(
    configuration.settings.power,
    2,
  );

  assert.equal(
    configuration.settings.resolution,
    50,
  );
});

test("buildInterpolationConfiguration returns sample count and extent", () => {
  const extent = {
    minLatitude: 17.7,
    maxLatitude: 17.72,
    minLongitude: 83.295,
    maxLongitude: 83.31,
  };

  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent,
    });

  assert.equal(configuration.sampleCount, 3);
  assert.deepEqual(
    configuration.spatialExtent,
    extent,
  );
});

test("buildInterpolationConfiguration declares backend calculation architecture", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent: null,
    });

  assert.equal(
    configuration.architecture.calculationLocation,
    "backend",
  );

  assert.equal(
    configuration.architecture.presentationLocation,
    "frontend",
  );

  assert.equal(
    configuration.architecture.surfaceType,
    "continuous",
  );

  assert.equal(
    configuration.architecture.extentConstraint,
    "sample_extent",
  );
});

test("IDW configuration includes power", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.idw,
      power: 2,
      resolution: 50,
      sampleCount: 3,
      extent: {
        minLatitude: 17.7,
        maxLatitude: 17.73,
        minLongitude: 83.29,
        maxLongitude: 83.32,
      },
    });

  assert.equal(
    configuration.settings.resolution,
    50,
  );

  assert.equal(
    configuration.settings.power,
    2,
  );
});

test("Kriging configuration omits IDW power", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.kriging,
      power: null,
      resolution: 50,
      sampleCount: 3,
      extent: {
        minLatitude: 17.7,
        maxLatitude: 17.73,
        minLongitude: 83.29,
        maxLongitude: 83.32,
      },
    });

  assert.equal(
    configuration.settings.resolution,
    50,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      configuration.settings,
      "power",
    ),
    false,
  );
});

test("thin-plate spline configuration omits IDW power", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.spline,
      power: null,
      resolution: 50,
      sampleCount: 3,
      extent: {
        minLatitude: 17.7,
        maxLatitude: 17.73,
        minLongitude: 83.29,
        maxLongitude: 83.32,
      },
    });

  assert.equal(
    configuration.settings.resolution,
    50,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      configuration.settings,
      "power",
    ),
    false,
  );
});

test("nearest-neighbour configuration omits IDW power", () => {
  const configuration =
    buildInterpolationConfiguration({
      parameter: SUPPORTED_PARAMETERS.ph,
      method: SUPPORTED_METHODS.nearest_neighbour,
      power: null,
      resolution: 50,
      sampleCount: 3,
      extent: {
        minLatitude: 17.7,
        maxLatitude: 17.73,
        minLongitude: 83.29,
        maxLongitude: 83.32,
      },
    });

  assert.equal(
    configuration.settings.resolution,
    50,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      configuration.settings,
      "power",
    ),
    false,
  );
});

test("interpolation success messages are method-specific", () => {
  assert.equal(
    buildInterpolationSuccessMessage(
      SUPPORTED_METHODS.idw,
    ),
    "IDW interpolation surface generated successfully.",
  );

  assert.equal(
    buildInterpolationSuccessMessage(
      SUPPORTED_METHODS.kriging,
    ),
    "Kriging interpolation surface generated successfully.",
  );

  assert.equal(
    buildInterpolationSuccessMessage(
      SUPPORTED_METHODS.spline,
    ),
    "Thin-Plate Spline interpolation surface generated successfully.",
  );

  assert.equal(
    buildInterpolationSuccessMessage(
      SUPPORTED_METHODS.nearest_neighbour,
    ),
    "Nearest-Neighbour interpolation surface generated successfully.",
  );
});

test("interpolation success message returns null for invalid method", () => {
  assert.equal(
    buildInterpolationSuccessMessage(null),
    null,
  );

  assert.equal(
    buildInterpolationSuccessMessage({
      key: "unsupported_method",
    }),
    null,
  );
});

// ============================================================
// METHOD-SPECIFIC SAMPLE COUNTS
// ============================================================

test("method-specific minimum sample counts are defined", () => {
  assert.equal(MIN_SAMPLE_COUNTS.idw, 1);
  assert.equal(MIN_SAMPLE_COUNTS.kriging, 2);
  assert.equal(MIN_SAMPLE_COUNTS.spline, 3);
  assert.equal(
    MIN_SAMPLE_COUNTS.nearest_neighbour,
    1,
  );

  assert.equal(
    MIN_SPLINE_LOOCV_SAMPLE_COUNT,
    4,
  );

  assert.equal(
    MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
    2,
  );
});

test("IDW accepts one valid sample", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.idw,
      1,
    );

  assert.equal(result.valid, true);
  assert.equal(result.minimum, 1);
  assert.equal(result.actual, 1);
  assert.equal(result.error, null);
});

test("nearest-neighbour accepts one valid sample", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.nearest_neighbour,
      1,
    );

  assert.equal(result.valid, true);
  assert.equal(result.minimum, 1);
  assert.equal(result.actual, 1);
  assert.equal(result.error, null);
});

test("Kriging requires at least two valid samples", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.kriging,
      1,
    );

  assert.equal(result.valid, false);
  assert.equal(result.minimum, 2);
  assert.equal(result.actual, 1);

  assert.match(
    result.error,
    /Kriging interpolation requires at least 2 valid soil samples/,
  );
});

test("Kriging accepts two valid samples", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.kriging,
      2,
    );

  assert.equal(result.valid, true);
  assert.equal(result.minimum, 2);
  assert.equal(result.actual, 2);
  assert.equal(result.error, null);
});

test("thin-plate spline requires at least three valid samples", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.spline,
      2,
    );

  assert.equal(result.valid, false);
  assert.equal(result.minimum, 3);
  assert.equal(result.actual, 2);

  assert.match(
    result.error,
    /Thin-Plate Spline interpolation requires at least 3 valid soil samples/,
  );
});

test("thin-plate spline accepts three valid samples", () => {
  const result =
    validateInterpolationSampleCount(
      SUPPORTED_METHODS.spline,
      3,
    );

  assert.equal(result.valid, true);
  assert.equal(result.minimum, 3);
  assert.equal(result.actual, 3);
  assert.equal(result.error, null);
});

// ============================================================
// INTERPOLATION DISPATCHER
// ============================================================

test("calculateInterpolationValue dispatches IDW", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.70,
      longitude: 83.30,
      value: 10,
    },
  ];

  const value =
    calculateInterpolationValue(
      SUPPORTED_METHODS.idw,
      17.70,
      83.30,
      points,
      2,
    );

  assert.equal(value, 10);
});

test("calculateInterpolationValue dispatches nearest-neighbour", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.70,
      longitude: 83.30,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.71,
      longitude: 83.31,
      value: 20,
    },
  ];

  const value =
    calculateInterpolationValue(
      SUPPORTED_METHODS.nearest_neighbour,
      17.70,
      83.30,
      points,
    );

  assert.equal(value, 10);
});

test("buildInterpolationGrid dispatches Kriging", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 20,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 30,
    },
  ];

  const extent = {
    minLatitude: 17.7000,
    maxLatitude: 17.7100,
    minLongitude: 83.3000,
    maxLongitude: 83.3100,
  };

  const interpolationParameters = {
    success: true,
    method: "kriging",
    parameter: "nitrogen",
    parameters: {
      model: "spherical",
      nugget: 0.1,
      sill: 1.0,
      range: 2000,
    },
    source: {
      type: "configured",
      estimated: false,
    },
    diagnostics: {
      sampleCount: points.length,
    },
  };

  const grid = buildInterpolationGrid(
    extent,
    3,
    points,
    SUPPORTED_METHODS.kriging,
    undefined,
    interpolationParameters,
  );

  assert.equal(grid.rows, 3);
  assert.equal(grid.columns, 3);
  assert.equal(grid.cells.length, 9);

  assert.ok(
    grid.cells.every(
      (cell) => Number.isFinite(cell.value),
    ),
  );

  assert.ok(
    grid.cells.every(
      (cell) =>
        Number.isInteger(cell.row) &&
        Number.isInteger(cell.column) &&
        Number.isFinite(cell.latitude) &&
        Number.isFinite(cell.longitude),
    ),
  );
});

test("calculateInterpolationValue dispatches thin-plate spline", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.70,
      longitude: 83.30,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.71,
      longitude: 83.31,
      value: 20,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.72,
      longitude: 83.30,
      value: 30,
    },
  ];

  const value =
    calculateInterpolationValue(
      SUPPORTED_METHODS.spline,
      17.705,
      83.305,
      points,
    );

  assert.ok(Number.isFinite(value));
});

test("calculateInterpolationValue returns null for empty points", () => {
  const value =
    calculateInterpolationValue(
      SUPPORTED_METHODS.idw,
      17.70,
      83.30,
      [],
      2,
    );

  assert.equal(value, null);
});

test("calculateInterpolationValue returns null for unsupported method", () => {
  const value =
    calculateInterpolationValue(
      {
        key: "unsupported_method",
        label: "Unsupported",
      },
      17.70,
      83.30,
      [
        {
          id: 1,
          latitude: 17.70,
          longitude: 83.30,
          value: 10,
        },
      ],
      2,
    );

  assert.equal(value, null);
});

test("buildInterpolationGrid dispatches thin-plate spline", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 20,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.7100,
      longitude: 83.3000,
      value: 30,
    },
  ];

  const extent = {
    minLatitude: 17.7000,
    maxLatitude: 17.7100,
    minLongitude: 83.3000,
    maxLongitude: 83.3100,
  };

  const grid = buildInterpolationGrid(
    extent,
    3,
    points,
    SUPPORTED_METHODS.spline,
  );

  assert.equal(grid.rows, 3);
  assert.equal(grid.columns, 3);

  assert.ok(
    grid.cells.some((cell) =>
      Number.isFinite(cell.value),
    ),
  );
});

test("buildInterpolationGrid dispatches nearest-neighbour", () => {
  const points = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7000,
      longitude: 83.3000,
      value: 10,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.7000,
      longitude: 83.3100,
      value: 20,
    },
  ];

  const extent = {
    minLatitude: 17.7000,
    maxLatitude: 17.7100,
    minLongitude: 83.3000,
    maxLongitude: 83.3100,
  };

  const grid = buildInterpolationGrid(
    extent,
    3,
    points,
    SUPPORTED_METHODS.nearest_neighbour,
  );

  assert.equal(grid.rows, 3);
  assert.equal(grid.columns, 3);

  assert.ok(
    grid.cells.every((cell) =>
      Number.isFinite(cell.value),
    ),
  );
});

// ============================================================
// SCIENTIFIC KRIGING PREPARATION
// ============================================================

const SCIENTIFIC_KRIGING_SAMPLES = [
  {
    id: 1,
    sample_code: "K-001",
    latitude: 17.7000,
    longitude: 83.3000,
    ph: 6.8,
    nitrogen: 200,
    phosphorus: 18,
    potassium: 240,
    organic_carbon: 0.70,
    electrical_conductivity: 0.35,
  },
  {
    id: 2,
    sample_code: "K-002",
    latitude: 17.7100,
    longitude: 83.3100,
    ph: 6.9,
    nitrogen: 220,
    phosphorus: 20,
    potassium: 250,
    organic_carbon: 0.75,
    electrical_conductivity: 0.40,
  },
  {
    id: 3,
    sample_code: "K-003",
    latitude: 17.7200,
    longitude: 83.3200,
    ph: 7.0,
    nitrogen: 245,
    phosphorus: 22,
    potassium: 265,
    organic_carbon: 0.80,
    electrical_conductivity: 0.45,
  },
  {
    id: 4,
    sample_code: "K-004",
    latitude: 17.7300,
    longitude: 83.3300,
    ph: 7.1,
    nitrogen: 260,
    phosphorus: 24,
    potassium: 275,
    organic_carbon: 0.85,
    electrical_conductivity: 0.50,
  },
  {
    id: 5,
    sample_code: "K-005",
    latitude: 17.7400,
    longitude: 83.3400,
    ph: 7.2,
    nitrogen: 275,
    phosphorus: 26,
    potassium: 290,
    organic_carbon: 0.90,
    electrical_conductivity: 0.55,
  },
  {
    id: 6,
    sample_code: "K-006",
    latitude: 17.7500,
    longitude: 83.3500,
    ph: 7.3,
    nitrogen: 290,
    phosphorus: 28,
    potassium: 305,
    organic_carbon: 0.95,
    electrical_conductivity: 0.60,
  },
];

test(
  "prepareInterpolation resolves scientific Kriging parameters",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        SCIENTIFIC_KRIGING_SAMPLES;

    try {
      const result =
        await prepareInterpolation({
          parameter: "nitrogen",
          method: "kriging",
          resolution: 10,
          model: "spherical",
        });

      assert.equal(result.success, true);
      assert.equal(
        result.parameter.key,
        "nitrogen",
      );
      assert.equal(
        result.method.key,
        "kriging",
      );
      assert.equal(result.power, null);
      assert.equal(result.resolution, 10);

      assert.equal(
        result.sampleCount,
        SCIENTIFIC_KRIGING_SAMPLES.length,
      );

      assert.ok(
        result.interpolationParameters,
      );

      assert.equal(
        result.interpolationParameters.success,
        true,
      );

      assert.equal(
        result.interpolationParameters.method,
        "kriging",
      );

      assert.equal(
        result.interpolationParameters.parameter,
        "nitrogen",
      );

      assert.equal(
        result.interpolationParameters.source.type,
        "estimated",
      );

      assert.equal(
        result.interpolationParameters.source.estimated,
        true,
      );

      assert.equal(
        result.interpolationParameters.parameters.model,
        "spherical",
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.nugget,
        ),
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.sill,
        ),
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.range,
        ),
      );

      assert.ok(
        result.interpolationParameters.parameters.sill >
          result.interpolationParameters.parameters.nugget,
      );

      assert.ok(
        result.interpolationParameters.parameters.range >
          0,
      );

      assert.ok(
        result.interpolationParameters.diagnostics,
      );

      assert.ok(
        result.interpolationParameters.diagnostics.input,
      );

      assert.equal(
        result.interpolationParameters.diagnostics.input
          .validSampleCount,
        SCIENTIFIC_KRIGING_SAMPLES.length,
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

test(
  "prepareInterpolation preserves scientifically estimated Kriging parameters",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        SCIENTIFIC_KRIGING_SAMPLES;

    try {
      const result =
        await prepareInterpolation({
          parameter: "nitrogen",
          method: "kriging",
          resolution: 10,
          model: "spherical",
        });

      assert.equal(result.success, true);

      const parameters =
        result.interpolationParameters
          .parameters;

      assert.equal(
        result.interpolationParameters.source.type,
        "estimated",
      );

      assert.equal(
        result.interpolationParameters.source.estimated,
        true,
      );

      assert.equal(
        parameters.model,
        "spherical",
      );

      assert.ok(
        Number.isFinite(parameters.nugget),
      );

      assert.ok(
        Number.isFinite(parameters.sill),
      );

      assert.ok(
        Number.isFinite(parameters.range),
      );

      assert.ok(parameters.sill > parameters.nugget);
      assert.ok(parameters.range > 0);

      assert.equal(
        result.interpolationParameters.method,
        "kriging",
      );

      assert.equal(
        result.interpolationParameters.parameter,
        "nitrogen",
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

test(
  "prepareInterpolation fails when scientific Kriging estimation fails without configured fallback",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () => [
        {
          id: 1,
          sample_code: "K-FAIL",
          latitude: 17.7000,
          longitude: 83.3000,
          ph: 6.8,
          nitrogen: 200,
          phosphorus: 18,
          potassium: 240,
          organic_carbon: 0.70,
          electrical_conductivity: 0.35,
        },
        {
          id: 2,
          sample_code: "K-FAIL-2",
          latitude: 17.7000,
          longitude: 83.3000,
          ph: 6.9,
          nitrogen: 220,
          phosphorus: 20,
          potassium: 250,
          organic_carbon: 0.75,
          electrical_conductivity: 0.40,
        },
      ];

    try {
      const result =
        await prepareInterpolation({
          parameter: "nitrogen",
          method: "kriging",
          resolution: 10,
          model: "spherical",
        });

      assert.equal(result.success, false);
      assert.ok(
        result.interpolationParameters,
      );

      assert.equal(
        result.interpolationParameters.success,
        false,
      );

      assert.equal(
        result.interpolationParameters.parameters,
        null,
      );

      assert.equal(
        result.interpolationParameters.source.type,
        "estimated",
      );

      assert.equal(
        result.interpolationParameters.source.estimated,
        true,
      );

      assert.match(
        result.errors.join(" "),
        /positive sample-pair distance|estimation|variogram/i,
      );

      assert.notDeepEqual(
        result.interpolationParameters.parameters,
        {
          model: "spherical",
          nugget: 0.1,
          sill: 1.0,
          range: 2000,
        },
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

// ============================================================
// PHASE 12.6.6 — SPLINE CROSS-VALIDATION INTEGRATION
// ============================================================

test(
  "runSplineCrossValidation returns null for non-spline methods",
  () => {
    const result =
      runSplineCrossValidation(
        SUPPORTED_METHODS.idw,
        SPLINE_LOOCV_SAMPLES,
      );

    assert.equal(result, null);
  },
);

test(
  "runSplineCrossValidation rejects invalid spline points",
  () => {
    const result =
      runSplineCrossValidation(
        SUPPORTED_METHODS.spline,
        null,
      );

    assert.equal(result.success, false);
    assert.equal(result.status, "failed");
    assert.equal(
      result.method,
      "thin_plate_spline_loocv",
    );
  },
);

test(
  "runSplineCrossValidation is not applicable below four samples",
  () => {
    const result =
      runSplineCrossValidation(
        SUPPORTED_METHODS.spline,
        SAMPLE_POINTS,
      );

    assert.equal(result.success, true);
    assert.equal(
      result.status,
      "not_applicable",
    );
    assert.equal(result.sampleCount, 3);
    assert.equal(
      result.minimumSampleCount,
      MIN_SPLINE_LOOCV_SAMPLE_COUNT,
    );
    assert.equal(result.successfulFolds, 0);
    assert.equal(result.failedFolds, 0);
    assert.deepEqual(result.folds, []);
    assert.equal(result.metrics, null);
  },
);

test(
  "runSplineCrossValidation completes for four valid spline samples",
  () => {
    const result =
      runSplineCrossValidation(
        SUPPORTED_METHODS.spline,
        SPLINE_LOOCV_SAMPLES,
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");
    assert.equal(result.sampleCount, 4);
    assert.equal(result.successfulFolds, 4);
    assert.equal(result.failedFolds, 0);
    assert.equal(result.folds.length, 4);

    assert.ok(result.metrics);

    assert.ok(
      Number.isFinite(
        result.metrics.meanError,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.meanAbsoluteError,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.rmse,
      ),
    );

    assert.ok(
      Number.isFinite(
        result.metrics.maxAbsoluteError,
      ),
    );
  },
);

test(
  "runSplineCrossValidation preserves LOOCV fold diagnostics",
  () => {
    const result =
      runSplineCrossValidation(
        SUPPORTED_METHODS.spline,
        SPLINE_LOOCV_SAMPLES,
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");
    assert.equal(result.folds.length, 4);

    for (const fold of result.folds) {
      assert.equal(fold.success, true);

      assert.ok(Number.isInteger(fold.index));

      assert.ok(
        typeof fold.sampleCode === "string",
      );

      assert.ok(Number.isFinite(fold.observed));
      assert.ok(Number.isFinite(fold.predicted));
      assert.ok(Number.isFinite(fold.error));
      assert.ok(
        Number.isFinite(fold.absoluteError),
      );
      assert.ok(
        Number.isFinite(fold.squaredError),
      );

      assert.equal(fold.errorType, null);
      assert.deepEqual(fold.errors, []);
    }
  },
);

// ============================================================
// PHASE 12.6.6 — SPLINE SURFACE INTEGRATION
// ============================================================

test(
  "generateInterpolationSurface succeeds with three spline samples and LOOCV not applicable",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        SAMPLE_POINTS.map((sample) => ({
          ...sample,
          value: sample.nitrogen,
        }));

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "spline",
          resolution: 10,
        });

      assert.equal(result.success, true);

      assert.ok(
        result.splineCrossValidation,
      );

      assert.equal(
        result.splineCrossValidation.status,
        "not_applicable",
      );

      assert.equal(
        result.splineCrossValidation.sampleCount,
        3,
      );

      assert.ok(result.grid);

      assert.equal(
        result.grid.cells.length,
        100,
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

test(
  "generateInterpolationSurface runs complete spline LOOCV with four samples",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        SPLINE_LOOCV_SAMPLES.map((sample) => ({
          ...sample,
          nitrogen: sample.value,
        }));

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "spline",
          resolution: 10,
        });

      assert.equal(result.success, true);

      assert.ok(
        result.splineCrossValidation,
      );

      assert.equal(
        result.splineCrossValidation.status,
        "complete",
      );

      assert.equal(
        result.splineCrossValidation.sampleCount,
        4,
      );

      assert.equal(
        result.splineCrossValidation.successfulFolds,
        4,
      );

      assert.equal(
        result.splineCrossValidation.failedFolds,
        0,
      );

      assert.ok(result.grid);

      assert.equal(
        result.grid.cells.length,
        100,
      );

      assert.ok(
        Number.isFinite(
          result.splineCrossValidation.metrics.rmse,
        ),
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

// ============================================================
// PHASE 12.7.6 — NEAREST-NEIGHBOUR CROSS-VALIDATION
// ============================================================

test(
  "runNearestNeighbourCrossValidation returns null for non-nearest-neighbour methods",
  () => {
    assert.equal(
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.idw,
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      ),
      null,
    );

    assert.equal(
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.kriging,
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      ),
      null,
    );

    assert.equal(
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.spline,
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      ),
      null,
    );
  },
);

test(
  "runNearestNeighbourCrossValidation rejects invalid nearest-neighbour points",
  () => {
    const result =
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.nearest_neighbour,
        [
          {
            id: 1,
            latitude: 17.7000,
            longitude: 83.3000,
            value: 10,
          },
          {
            id: 2,
            latitude: "invalid",
            longitude: 83.3100,
            value: 20,
          },
        ],
        {},
      );

    assert.equal(result.success, false);
    assert.equal(result.status, "failed");
    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );
  },
);

test(
  "runNearestNeighbourCrossValidation is not applicable below two samples",
  () => {
    const result =
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.nearest_neighbour,
        [
          {
            id: 1,
            sample_code: "S-NN-SINGLE",
            latitude: 17.7000,
            longitude: 83.3000,
            value: 10,
          },
        ],
        {},
      );

    assert.equal(result.success, true);
    assert.equal(
      result.status,
      "not_applicable",
    );
    assert.equal(result.sampleCount, 1);

    assert.equal(
      result.minimumSampleCount,
      MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
    );

    assert.equal(result.successfulFolds, 0);
    assert.equal(result.failedFolds, 0);
    assert.deepEqual(result.folds, []);
    assert.equal(result.metrics, null);
  },
);

test(
  "runNearestNeighbourCrossValidation completes with valid nearest-neighbour samples",
  () => {
    const result =
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.nearest_neighbour,
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");

    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );

    assert.equal(
      result.sampleCount,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );

    assert.equal(
      result.successfulFolds,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );

    assert.equal(result.failedFolds, 0);

    assert.equal(
      result.folds.length,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );

    assert.ok(result.metrics);
    assert.ok(
      Number.isFinite(result.metrics.meanError),
    );
    assert.ok(
      Number.isFinite(
        result.metrics.meanAbsoluteError,
      ),
    );
    assert.ok(
      Number.isFinite(result.metrics.rmse),
    );
    assert.ok(
      Number.isFinite(
        result.metrics.maxAbsoluteError,
      ),
    );
  },
);

test(
  "runNearestNeighbourCrossValidation preserves LOOCV fold diagnostics",
  () => {
    const result =
      runNearestNeighbourCrossValidation(
        SUPPORTED_METHODS.nearest_neighbour,
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");

    for (const fold of result.folds) {
      assert.equal(fold.success, true);

      assert.ok(
        Number.isInteger(fold.index),
      );

      assert.ok(
        Number.isFinite(fold.observed),
      );

      assert.ok(
        Number.isFinite(fold.predicted),
      );

      assert.ok(
        Number.isFinite(fold.error),
      );

      assert.ok(
        Number.isFinite(fold.absoluteError),
      );

      assert.ok(fold.nearestSample);

      assert.ok(
        Number.isInteger(
          fold.nearestSample.index,
        ),
      );

      assert.ok(
        Number.isFinite(
          fold.nearestSample.distanceMetres,
        ),
      );
    }
  },
);

// ============================================================
// PHASE 12.7.6 — NEAREST-NEIGHBOUR LOOCV INTEGRATION TESTS
// ============================================================

test(
  "runNearestNeighbourCrossValidation returns null for non-nearest-neighbour methods",
  async () => {
    const result =
      runNearestNeighbourCrossValidation(
        {
          key: "idw",
          label: "Inverse Distance Weighting",
        },
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      );

    assert.equal(result, null);
  },
);

test(
  "runNearestNeighbourCrossValidation rejects invalid nearest-neighbour points",
  async () => {
    const result =
      runNearestNeighbourCrossValidation(
        {
          key: "nearest_neighbour",
          label: "Nearest Neighbour",
        },
        [
          {
            latitude: "invalid",
            longitude: 83.30125,
            value: 215,
          },
          {
            latitude: 17.71234,
            longitude: 83.31125,
            value: 220,
          },
        ],
        {},
      );

    assert.equal(result.success, false);
    assert.equal(result.status, "failed");

    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );

    assert.equal(result.sampleCount, 2);
    assert.equal(result.successfulFolds, 0);
    assert.equal(result.failedFolds, 0);
    assert.deepEqual(result.folds, []);
    assert.equal(result.metrics, null);
    assert.ok(result.error);
  },
);

test(
  "runNearestNeighbourCrossValidation is not applicable below two samples",
  async () => {
    const result =
      runNearestNeighbourCrossValidation(
        {
          key: "nearest_neighbour",
          label: "Nearest Neighbour",
        },
        [
          {
            latitude: 17.71234,
            longitude: 83.30125,
            value: 215,
          },
        ],
        {},
      );

    assert.equal(result.success, true);
    assert.equal(
      result.status,
      "not_applicable",
    );
    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );
    assert.equal(result.sampleCount, 1);
    assert.equal(
      result.minimumSampleCount,
      MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
    );
    assert.equal(result.successfulFolds, 0);
    assert.equal(result.failedFolds, 0);
    assert.deepEqual(result.folds, []);
    assert.equal(result.metrics, null);
    assert.equal(result.error, null);
    assert.ok(result.reason);
  },
);

test(
  "runNearestNeighbourCrossValidation completes with valid nearest-neighbour samples",
  async () => {
    const result =
      runNearestNeighbourCrossValidation(
        {
          key: "nearest_neighbour",
          label: "Nearest Neighbour",
        },
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");
    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );
    assert.equal(
      result.sampleCount,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );
    assert.equal(
      result.successfulFolds,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );
    assert.equal(result.failedFolds, 0);
    assert.equal(
      result.folds.length,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );
    assert.ok(result.metrics);
  },
);

test(
  "runNearestNeighbourCrossValidation preserves LOOCV fold diagnostics",
  async () => {
    const result =
      runNearestNeighbourCrossValidation(
        {
          key: "nearest_neighbour",
          label: "Nearest Neighbour",
        },
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES,
        {},
      );

    assert.equal(result.success, true);
    assert.equal(result.status, "complete");
    assert.equal(
      result.method,
      "nearest_neighbour_loocv",
    );

    assert.ok(
      Array.isArray(result.folds),
    );

    assert.equal(
      result.folds.length,
      NEAREST_NEIGHBOUR_LOOCV_SAMPLES.length,
    );

    for (const fold of result.folds) {
  assert.equal(
    fold.success,
    true,
  );

  assert.ok(
    Number.isInteger(fold.index),
  );

  assert.ok(
    Number.isFinite(fold.observed),
  );

  assert.ok(
    Number.isFinite(fold.predicted),
  );

  assert.ok(
    Number.isFinite(fold.error),
  );

  assert.ok(
    Number.isFinite(fold.absoluteError),
  );

  assert.ok(
    fold.nearestSample,
  );

  assert.ok(
    Number.isInteger(
      fold.nearestSample.index,
    ),
  );

  assert.ok(
    Number.isFinite(
      fold.nearestSample.distanceMetres,
    ),
  );
}

  },
);

test(
  "generateInterpolationSurface exposes nearest-neighbour LOOCV diagnostics",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES.map(
          (sample) => ({
            ...sample,
            nitrogen: sample.value,
          }),
        );

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "nearest_neighbour",
          resolution: 10,
        });

      assert.equal(
        result.success,
        true,
      );

      assert.ok(result.grid);

      assert.ok(
        Array.isArray(
          result.grid.cells,
        ),
      );

      assert.ok(
        result.grid.cells.length > 0,
      );

      assert.ok(
        result.nearestNeighbourCrossValidation,
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.method,
        "nearest_neighbour_loocv",
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.status,
        "complete",
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.success,
        true,
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

test(
  "generateInterpolationSurface keeps nearest-neighbour LOOCV diagnostic-only",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES.map(
          (sample) => ({
            ...sample,
            nitrogen: sample.value,
          }),
        );

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "nearest_neighbour",
          resolution: 10,
        });

      assert.equal(
        result.success,
        true,
      );

      assert.ok(
        result.grid,
      );

      assert.ok(
        Array.isArray(
          result.grid.cells,
        ),
      );

      assert.ok(
        result.grid.cells.length > 0,
      );

      assert.ok(
        result.nearestNeighbourCrossValidation,
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.method,
        "nearest_neighbour_loocv",
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.status,
        "complete",
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

test(
  "generateInterpolationSurface keeps nearest-neighbour LOOCV diagnostic-only",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        NEAREST_NEIGHBOUR_LOOCV_SAMPLES.map(
          (sample) => ({
            ...sample,
            nitrogen: sample.value,
          }),
        );

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "nearest_neighbour",
          resolution: 10,
          nearestNeighbourCrossValidationOptions: {
            invalidOption: true,
          },
        });

      assert.equal(result.success, true);
      assert.ok(result.grid);
      assert.ok(Array.isArray(result.grid.cells));
      assert.ok(result.grid.cells.length > 0);

      assert.ok(
        result.nearestNeighbourCrossValidation,
      );

      assert.equal(
        result.nearestNeighbourCrossValidation.method,
        "nearest_neighbour_loocv",
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);

// ============================================================
// KRIGING SURFACE INTEGRATION
// ============================================================

test(
  "generateInterpolationSurface carries scientifically estimated Kriging parameters",
  async () => {
    const original =
      soilRepository.getAllSoilSamples;

    soilRepository.getAllSoilSamples =
      async () =>
        SCIENTIFIC_KRIGING_SAMPLES;

    try {
      const result =
        await generateInterpolationSurface({
          parameter: "nitrogen",
          method: "kriging",
          resolution: 10,
          model: "spherical",
        });

      assert.equal(result.success, true);

      assert.ok(
        result.interpolationParameters,
      );

      assert.equal(
        result.interpolationParameters.success,
        true,
      );

      assert.equal(
        result.interpolationParameters.source.type,
        "estimated",
      );

      assert.equal(
        result.interpolationParameters.source.estimated,
        true,
      );

      assert.equal(
        result.interpolationParameters.method,
        "kriging",
      );

      assert.equal(
        result.interpolationParameters.parameter,
        "nitrogen",
      );

      assert.equal(
        result.interpolationParameters.parameters.model,
        "spherical",
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.nugget,
        ),
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.sill,
        ),
      );

      assert.ok(
        Number.isFinite(
          result.interpolationParameters.parameters.range,
        ),
      );

      assert.ok(result.grid);

      assert.equal(result.grid.rows, 10);
      assert.equal(result.grid.columns, 10);
      assert.equal(result.grid.cells.length, 100);

      assert.ok(result.statistics);

      assert.ok(
        Number.isInteger(
          result.statistics.validCellCount,
        ),
      );
    } finally {
      soilRepository.getAllSoilSamples =
        original;
    }
  },
);
