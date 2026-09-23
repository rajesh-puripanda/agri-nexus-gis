"use strict";

const {
  describe,
  it,
} = require("node:test");

// ============================================================
// server/tests/splineGeometry.test.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 12.6.3  Thin-Plate Spline Geometric Validation
//
// ============================================================

const assert = require("node:assert/strict");
const {
  MIN_SAMPLE_COUNT,
  GEOMETRY_TOLERANCE,
  validateGeometryPoint,
  buildLocalGeometryPoints,
  findDuplicateLocationPairs,
  calculateSpatialRank,
  validateSplineGeometry,
} = require("../services/interpolation/splineGeometry");

// ============================================================
// TEST FIXTURES
// ============================================================

function createNonCollinearPoints() {
  return [
    { latitude: 17.7000, longitude: 83.3000 },
    { latitude: 17.7100, longitude: 83.3000 },
    { latitude: 17.7000, longitude: 83.3100 },
  ];
}

function createCollinearPoints() {
  return [
    { latitude: 17.7000, longitude: 83.3000 },
    { latitude: 17.7100, longitude: 83.3000 },
    { latitude: 17.7200, longitude: 83.3000 },
  ];
}

function createDuplicatePoints() {
  return [
    { latitude: 17.7000, longitude: 83.3000 },
    { latitude: 17.7000, longitude: 83.3000 },
    { latitude: 17.7100, longitude: 83.3100 },
  ];
}

// ============================================================
// CONSTANTS
// ============================================================

describe("Spline Geometry Constants", () => {
  it("should require at least three observations", () => {
    assert.strictEqual(
      MIN_SAMPLE_COUNT,
      3,
    );
  });

  it("should expose a positive geometry tolerance", () => {
    assert.ok(
      Number.isFinite(
        GEOMETRY_TOLERANCE,
      ),
    );

    assert.ok(
      GEOMETRY_TOLERANCE > 0,
    );
  });
});

// ============================================================
// POINT VALIDATION
// ============================================================

describe("Spline Geometry Point Validation", () => {
  it("should accept valid geographic coordinates", () => {
    assert.strictEqual(
      validateGeometryPoint({
        latitude: 17.7,
        longitude: 83.3,
      }),
      true,
    );
  });

  it("should accept numeric coordinate strings", () => {
    assert.strictEqual(
      validateGeometryPoint({
        latitude: "17.7",
        longitude: "83.3",
      }),
      true,
    );
  });

  it("should reject missing points", () => {
    assert.strictEqual(
      validateGeometryPoint(null),
      false,
    );
  });

  it("should reject invalid latitude", () => {
    assert.strictEqual(
      validateGeometryPoint({
        latitude: 91,
        longitude: 83.3,
      }),
      false,
    );
  });

  it("should reject invalid longitude", () => {
    assert.strictEqual(
      validateGeometryPoint({
        latitude: 17.7,
        longitude: 181,
      }),
      false,
    );
  });

  it("should reject non-numeric coordinates", () => {
    assert.strictEqual(
      validateGeometryPoint({
        latitude: "invalid",
        longitude: 83.3,
      }),
      false,
    );
  });
});

// ============================================================
// LOCAL GEOMETRY
// ============================================================

describe("Spline Local Geometry", () => {
  it("should convert valid points to finite metric coordinates", () => {
    const points =
      createNonCollinearPoints();

    const localPoints =
      buildLocalGeometryPoints(points);

    assert.ok(
      Array.isArray(localPoints),
    );

    assert.strictEqual(
      localPoints.length,
      points.length,
    );

    for (const point of localPoints) {
      assert.ok(
        Number.isFinite(point.x),
      );

      assert.ok(
        Number.isFinite(point.y),
      );
    }
  });

  it("should place the first point at the local origin", () => {
    const localPoints =
      buildLocalGeometryPoints(
        createNonCollinearPoints(),
      );

    assert.strictEqual(
      localPoints[0].x,
      0,
    );

    assert.strictEqual(
      localPoints[0].y,
      0,
    );
  });

  it("should not mutate geographic input", () => {
    const points =
      createNonCollinearPoints();

    const original =
      JSON.parse(
        JSON.stringify(points),
      );

    buildLocalGeometryPoints(points);

    assert.deepStrictEqual(
      points,
      original,
    );
  });
});

// ============================================================
// DUPLICATE LOCATION DETECTION
// ============================================================

describe("Spline Duplicate Location Detection", () => {
  it("should detect duplicate locations", () => {
    const localPoints =
      buildLocalGeometryPoints(
        createDuplicatePoints(),
      );

    const duplicates =
      findDuplicateLocationPairs(
        localPoints,
      );

    assert.deepStrictEqual(
      duplicates,
      [[0, 1]],
    );
  });

  it("should not report distinct locations as duplicates", () => {
    const localPoints =
      buildLocalGeometryPoints(
        createNonCollinearPoints(),
      );

    const duplicates =
      findDuplicateLocationPairs(
        localPoints,
      );

    assert.deepStrictEqual(
      duplicates,
      [],
    );
  });
});

// ============================================================
// SPATIAL RANK
// ============================================================

describe("Spline Spatial Rank", () => {
  it("should identify two-dimensional geometry", () => {
    const localPoints =
      buildLocalGeometryPoints(
        createNonCollinearPoints(),
      );

    assert.strictEqual(
      calculateSpatialRank(
        localPoints,
      ),
      2,
    );
  });

  it("should identify collinear geometry as rank one", () => {
    const localPoints =
      buildLocalGeometryPoints(
        createCollinearPoints(),
      );

    assert.strictEqual(
      calculateSpatialRank(
        localPoints,
      ),
      1,
    );
  });

  it("should identify coincident geometry as rank zero", () => {
    const localPoints =
      buildLocalGeometryPoints([
        {
          latitude: 17.7,
          longitude: 83.3,
        },
        {
          latitude: 17.7,
          longitude: 83.3,
        },
        {
          latitude: 17.7,
          longitude: 83.3,
        },
      ]);

    assert.strictEqual(
      calculateSpatialRank(
        localPoints,
      ),
      0,
    );
  });
});

// ============================================================
// COMPLETE GEOMETRY VALIDATION
// ============================================================

describe("Complete Spline Geometry Validation", () => {
  it("should accept valid non-collinear geometry", () => {
    const result =
      validateSplineGeometry(
        createNonCollinearPoints(),
      );

    assert.strictEqual(
      result.valid,
      true,
    );

    assert.strictEqual(
      result.reason,
      null,
    );

    assert.strictEqual(
      result.sampleCount,
      3,
    );

    assert.strictEqual(
      result.spatialRank,
      2,
    );

    assert.deepStrictEqual(
      result.duplicatePairs,
      [],
    );
  });

  it("should reject fewer than three observations", () => {
    const result =
      validateSplineGeometry([
        {
          latitude: 17.7,
          longitude: 83.3,
        },
        {
          latitude: 17.71,
          longitude: 83.3,
        },
      ]);

    assert.strictEqual(
      result.valid,
      false,
    );

    assert.strictEqual(
      result.reason,
      "insufficient_observations",
    );

    assert.strictEqual(
      result.sampleCount,
      2,
    );

    assert.strictEqual(
      result.requiredMinimum,
      3,
    );
  });

  it("should reject null observations", () => {
    const result =
      validateSplineGeometry(null);

    assert.strictEqual(
      result.valid,
      false,
    );

    assert.strictEqual(
      result.reason,
      "invalid_observations",
    );
  });

  it("should reject invalid coordinates", () => {
    const result =
      validateSplineGeometry([
        {
          latitude: 17.7,
          longitude: 83.3,
        },
        {
          latitude: 17.71,
          longitude: 83.3,
        },
        {
          latitude: 91,
          longitude: 83.3,
        },
      ]);

    assert.strictEqual(
      result.valid,
      false,
    );

    assert.strictEqual(
      result.reason,
      "invalid_coordinates",
    );

    assert.strictEqual(
      result.invalidPointIndex,
      2,
    );
  });

  it("should reject duplicate locations explicitly", () => {
    const result =
      validateSplineGeometry(
        createDuplicatePoints(),
      );

    assert.strictEqual(
      result.valid,
      false,
    );

    assert.strictEqual(
      result.reason,
      "duplicate_locations",
    );

    assert.deepStrictEqual(
      result.duplicatePairs,
      [[0, 1]],
    );
  });

  it("should reject collinear geometry explicitly", () => {
    const result =
      validateSplineGeometry(
        createCollinearPoints(),
      );

    assert.strictEqual(
      result.valid,
      false,
    );

    assert.strictEqual(
      result.reason,
      "collinear_points",
    );

    assert.strictEqual(
      result.spatialRank,
      1,
    );

    assert.deepStrictEqual(
      result.duplicatePairs,
      [],
    );
  });

  it("should distinguish duplicate geometry from collinear geometry", () => {
    const duplicateResult =
      validateSplineGeometry(
        createDuplicatePoints(),
      );

    const collinearResult =
      validateSplineGeometry(
        createCollinearPoints(),
      );

    assert.strictEqual(
      duplicateResult.reason,
      "duplicate_locations",
    );

    assert.strictEqual(
      collinearResult.reason,
      "collinear_points",
    );
  });

  it("should not mutate the original observations", () => {
    const points =
      createNonCollinearPoints();

    const original =
      JSON.parse(
        JSON.stringify(points),
      );

    validateSplineGeometry(points);

    assert.deepStrictEqual(
      points,
      original,
    );
  });
});
