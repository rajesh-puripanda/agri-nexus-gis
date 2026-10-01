"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const fertilityZoningService = require("../services/fertilityZoningService");

test("validateFertilityZoningRequest applies defaults", () => {
  const result =
    fertilityZoningService.validateFertilityZoningRequest({});

  assert.equal(result.valid, true);
  assert.equal(
    result.power,
    fertilityZoningService.DEFAULT_POWER,
  );
  assert.equal(
    result.resolution,
    fertilityZoningService.DEFAULT_RESOLUTION,
  );
});

test("validateFertilityZoningRequest rejects invalid power", () => {
  const result =
    fertilityZoningService.validateFertilityZoningRequest({
      power: "invalid",
    });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("validateFertilityZoningRequest rejects invalid resolution", () => {
  const result =
    fertilityZoningService.validateFertilityZoningRequest({
      resolution: "invalid",
    });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test("extractParameterPoints filters invalid coordinates", () => {
  const parameter =
    fertilityZoningService.FERTILITY_PARAMETERS.nitrogen;

  const samples = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7,
      longitude: 83.3,
      nitrogen: 200,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 100,
      longitude: 83.3,
      nitrogen: 200,
    },
    {
      id: 3,
      sample_code: "S-003",
      latitude: 17.7,
      longitude: 83.3,
      nitrogen: null,
    },
  ];

  const points =
    fertilityZoningService.extractParameterPoints(
      samples,
      parameter,
    );

  // Only the sample with valid coordinates and an available
  // nitrogen measurement participates in interpolation.
  assert.equal(points.length, 1);
  assert.equal(points[0].id, 1);
  assert.equal(points[0].value, 200);


});

test("buildFertilityPoints creates all supported parameter collections", () => {
  const samples = [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.7,
      longitude: 83.3,
      nitrogen: 200,
      phosphorus: 20,
      potassium: 250,
      organic_carbon: 0.8,
    },
  ];

  const points =
    fertilityZoningService.buildFertilityPoints(samples);

  assert.deepEqual(Object.keys(points), [
    "nitrogen",
    "phosphorus",
    "potassium",
    "organic_carbon",
  ]);

  assert.equal(points.nitrogen.length, 1);
  assert.equal(points.phosphorus.length, 1);
  assert.equal(points.potassium.length, 1);
  assert.equal(points.organic_carbon.length, 1);
});

test("buildGridPositions creates the configured square grid", () => {
  const extent = {
    minLatitude: 17,
    maxLatitude: 18,
    minLongitude: 83,
    maxLongitude: 84,
  };

  const grid =
    fertilityZoningService.buildGridPositions(extent, 3);

  assert.equal(grid.rows, 3);
  assert.equal(grid.columns, 3);
  assert.equal(grid.cells.length, 9);

  assert.equal(grid.cells[0].row, 0);
  assert.equal(grid.cells[0].column, 0);
  assert.equal(grid.cells[0].latitude, 18);
  assert.equal(grid.cells[0].longitude, 83);
});

test("calculateZoningStatistics calculates zone counts", () => {
  const grid = {
    cellCount: 4,
    cells: [
      { fertilityClass: "Low" },
      { fertilityClass: "High" },
      { fertilityClass: "Moderate / Good" },
      { fertilityClass: "Unavailable" },
    ],
  };

  const result =
    fertilityZoningService.calculateZoningStatistics(grid);

  assert.equal(result.totalCellCount, 4);
  assert.equal(result.validCellCount, 3);
  assert.equal(result.insufficientDataCellCount, 1);
  assert.equal(result.zoneCounts.Low, 1);
  assert.equal(result.zoneCounts.High, 1);
  assert.equal(result.zoneCounts["Moderate / Good"], 1);
  assert.equal(result.zoneCounts.Unavailable, 1);
});

test("buildSourcePointSummary preserves source provenance", () => {
  const parameterPoints = {
    nitrogen: [
      {
        id: 1,
        sample_code: "S-001",
        latitude: 17.7123401,
        longitude: 83.3012501,
        value: 215,
      },
    ],
    phosphorus: [],
    potassium: [],
    organic_carbon: [],
  };

  const result =
    fertilityZoningService.buildSourcePointSummary(
      parameterPoints,
    );

  assert.equal(result.nitrogen.length, 1);
  assert.equal(result.nitrogen[0].id, 1);
  assert.equal(result.nitrogen[0].sample_code, "S-001");
  assert.equal(result.nitrogen[0].latitude, 17.71234);
  assert.equal(result.nitrogen[0].longitude, 83.30125);
  assert.equal(result.nitrogen[0].value, 215);
});

test("prepareFertilityZoning generates a completed zoning response", async () => {
  const soilRepository = require("../repositories/soilRepository");
  const originalGetAllSoilSamples =
    soilRepository.getAllSoilSamples;

  soilRepository.getAllSoilSamples = async () => [
    {
      id: 1,
      sample_code: "S-001",
      latitude: 17.70,
      longitude: 83.30,
      nitrogen: 215,
      phosphorus: 18,
      potassium: 240,
      organic_carbon: 0.72,
    },
    {
      id: 2,
      sample_code: "S-002",
      latitude: 17.72,
      longitude: 83.32,
      nitrogen: 220,
      phosphorus: 20,
      potassium: 250,
      organic_carbon: 0.80,
    },
  ];

  try {
    const result =
      await fertilityZoningService.prepareFertilityZoning({
        resolution: 10,
      });

    assert.equal(result.success, true);
    assert.equal(result.status, "completed");
    assert.equal(
      result.phase,
      fertilityZoningService.API_PHASE,
    );
    assert.equal(result.grid.rows, 10);
    assert.equal(result.grid.columns, 10);
    assert.equal(result.grid.cellCount, 100);
    assert.ok(result.configuration);
    assert.ok(result.statistics);
    assert.ok(result.sourcePoints);
  } finally {
    soilRepository.getAllSoilSamples =
      originalGetAllSoilSamples;
  }
});

test("prepareFertilityZoning rejects an empty soil dataset", async () => {
  const soilRepository = require("../repositories/soilRepository");
  const originalGetAllSoilSamples =
    soilRepository.getAllSoilSamples;

  soilRepository.getAllSoilSamples = async () => [];

  try {
    await assert.rejects(
      () =>
        fertilityZoningService.prepareFertilityZoning({
          resolution: 2,
        }),
      (error) => {
        assert.equal(error.statusCode, 400);
        return true;
      },
    );
  } finally {
    soilRepository.getAllSoilSamples =
      originalGetAllSoilSamples;
  }
});