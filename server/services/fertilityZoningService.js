// ============================================================
// server/services/fertilityZoningService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 9.2 — Backend Fertility Zoning Engine
//
// Built on:
//   Phase 5.3 — Soil Analysis Engine
//   Phase 8.2 — IDW Interpolation Engine
//   Phase 8.3 — Interpolation REST API
//
// Responsibilities:
//
//   1. Validate fertility zoning parameters
//   2. Retrieve soil samples
//   3. Extract valid N/P/K/Organic Carbon points
//   4. Determine a common spatial extent
//   5. Generate continuous IDW values
//   6. Classify interpolated values using the existing
//      soil-analysis classification functions
//   7. Apply the existing overall fertility assessment rule
//   8. Produce an overall fertility zone for every grid cell
//   9. Calculate zoning statistics
//  10. Return a stable API-ready zoning response
//
// IMPORTANT:
//
//   Scientific classification remains entirely in the backend.
//
//   This service does NOT create new soil thresholds.
//
//   Overall fertility is determined exclusively by the existing
//   assessOverallFertility() function from soilAnalysisService.js.
//
// Spatial principle:
//
//   Continuous values are interpolated FIRST.
//
//   Scientific classifications are applied AFTER interpolation.
//
//   Category labels are NEVER interpolated directly.
//
// ============================================================

"use strict";

const soilRepository = require("../repositories/soilRepository");

const {
  classifyNitrogen,
  classifyPhosphorus,
  classifyPotassium,
  classifyOrganicCarbon,
  assessOverallFertility,
} = require("../scientific/classification/soilClassification");

const {
  calculateExtent,
  calculateIDWValue,
  padExtent,
  DEFAULT_POWER,
  DEFAULT_RESOLUTION,
  MIN_POWER,
  MAX_POWER,
  MIN_RESOLUTION,
  MAX_RESOLUTION,
} = require("./interpolationService");

// ============================================================
// API PHASE
// ============================================================

const API_PHASE = "9.2";

// ============================================================
// ZONING TYPE
// ============================================================

const ZONING_TYPE = "overall_fertility";

// ============================================================
// INTERPOLATION METHOD
// ============================================================
//
// Phase 9.2 supports the same interpolation method used by
// Phase 8.
//
// ============================================================

const INTERPOLATION_METHOD = {
  key: "idw",
  label: "Inverse Distance Weighting",
};

// ============================================================
// FERTILITY PARAMETERS
// ============================================================
//
// These are the parameters used by the existing overall
// fertility assessment:
//
//   Nitrogen
//   Phosphorus
//   Potassium
//   Organic Carbon
//
// pH and Electrical Conductivity are deliberately excluded
// because they do not participate in assessOverallFertility().
//
// ============================================================

const FERTILITY_PARAMETERS = {
  nitrogen: {
    key: "nitrogen",
    field: "nitrogen",
    label: "Nitrogen",
    unit: "kg/ha",
    classifier: classifyNitrogen,
  },

  phosphorus: {
    key: "phosphorus",
    field: "phosphorus",
    label: "Phosphorus",
    unit: "kg/ha",
    classifier: classifyPhosphorus,
  },

  potassium: {
    key: "potassium",
    field: "potassium",
    label: "Potassium",
    unit: "kg/ha",
    classifier: classifyPotassium,
  },

  organic_carbon: {
    key: "organic_carbon",
    field: "organic_carbon",
    label: "Organic Carbon",
    unit: "%",
    classifier: classifyOrganicCarbon,
  },
};

// ============================================================
// FERTILITY ZONE DEFINITIONS
// ============================================================
//
// These labels are the existing scientific output of
// assessOverallFertility().
//
// No new classification thresholds are introduced here.
//
// ============================================================

const FERTILITY_ZONE_DEFINITIONS = [
  {
    key: "low",
    label: "Low",
  },

  {
    key: "moderate_good",
    label: "Moderate / Good",
  },

  {
    key: "high",
    label: "High",
  },

  {
    key: "unavailable",
    label: "Unavailable",
  },
];

// ============================================================
// BASIC NUMERIC HELPER
// ============================================================

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// ============================================================
// NORMALIZE POWER
// ============================================================

function normalizePower(power) {
  if (power === undefined || power === null || power === "") {
    return DEFAULT_POWER;
  }

  const numericPower = Number(power);

  if (!Number.isFinite(numericPower)) {
    return null;
  }

  return numericPower;
}

// ============================================================
// NORMALIZE RESOLUTION
// ============================================================

function normalizeResolution(resolution) {
  if (resolution === undefined || resolution === null || resolution === "") {
    return DEFAULT_RESOLUTION;
  }

  const numericResolution = Number(resolution);

  if (!Number.isInteger(numericResolution)) {
    return null;
  }

  return numericResolution;
}

// ============================================================
// VALIDATE ZONING REQUEST
// ============================================================

function validateFertilityZoningRequest(options = {}) {
  const errors = [];

  const power = normalizePower(options.power);

  if (power === null) {
    errors.push("power must be a valid number.");
  } else if (power < MIN_POWER || power > MAX_POWER) {
    errors.push(`power must be between ${MIN_POWER} and ${MAX_POWER}.`);
  }

  const resolution = normalizeResolution(options.resolution);

  if (resolution === null) {
    errors.push("resolution must be a whole number.");
  } else if (resolution < MIN_RESOLUTION || resolution > MAX_RESOLUTION) {
    errors.push(
      `resolution must be between ${MIN_RESOLUTION} and ${MAX_RESOLUTION}.`,
    );
  }

  return {
    valid: errors.length === 0,

    errors,

    power,

    resolution,
  };
}

// ============================================================
// EXTRACT VALID INTERPOLATION POINTS
// ============================================================
//
// Only samples containing valid coordinates and a finite
// measurement for the requested fertility parameter participate
// in interpolation.
//
// Missing measurements are simply unavailable for that
// parameter.
//
// ============================================================

function extractParameterPoints(samples, parameter) {
  const points = [];

  if (!Array.isArray(samples)) {
    return points;
  }

  for (const sample of samples) {
    const latitude = Number(sample.latitude);

    const longitude = Number(sample.longitude);

    const value = Number(sample[parameter.field]);

    if (!Number.isFinite(latitude)) {
      continue;
    }

    if (!Number.isFinite(longitude)) {
      continue;
    }

    if (!Number.isFinite(value)) {
      continue;
    }

    if (latitude < -90 || latitude > 90) {
      continue;
    }

    if (longitude < -180 || longitude > 180) {
      continue;
    }

    points.push({
      id: sample.id,

      sample_code: sample.sample_code,

      latitude,

      longitude,

      value,
    });
  }

  return points;
}

// ============================================================
// BUILD FERTILITY POINT COLLECTION
// ============================================================

function buildFertilityPoints(samples) {
  const points = {};

  for (const parameterKey of Object.keys(FERTILITY_PARAMETERS)) {
    const parameter = FERTILITY_PARAMETERS[parameterKey];

    points[parameterKey] = extractParameterPoints(samples, parameter);
  }

  return points;
}

// ============================================================
// CALCULATE COMMON SPATIAL EXTENT
// ============================================================
//
// The zoning surface must use one common grid so that every
// fertility parameter corresponds to the same row/column.
//
// The extent is derived from all available fertility source
// points.
//
// This preserves the sample-derived spatial principle used
// throughout Phase 8.
//
// ============================================================

function calculateCommonExtent(parameterPoints) {
  const extents = [];

  for (const parameterKey of Object.keys(FERTILITY_PARAMETERS)) {
    const points = parameterPoints[parameterKey];

    if (!Array.isArray(points) || points.length === 0) {
      continue;
    }

    const extent = calculateExtent(points);

    if (extent) {
      extents.push(extent);
    }
  }

  if (extents.length === 0) {
    return null;
  }

  let minLatitude = Infinity;

  let maxLatitude = -Infinity;

  let minLongitude = Infinity;

  let maxLongitude = -Infinity;

  for (const extent of extents) {
    minLatitude = Math.min(minLatitude, extent.minLatitude);

    maxLatitude = Math.max(maxLatitude, extent.maxLatitude);

    minLongitude = Math.min(minLongitude, extent.minLongitude);

    maxLongitude = Math.max(maxLongitude, extent.maxLongitude);
  }

  return padExtent({
    minLatitude,
    maxLatitude,
    minLongitude,
    maxLongitude,
  });
}

// ============================================================
// BUILD COMMON GRID POSITIONS
// ============================================================
//
// Resolution follows the Phase 8 convention:
//
//   rows    = resolution
//   columns = resolution
//
// Grid orientation:
//
//   row 0       = north
//   last row    = south
//   column 0    = west
//   last column = east
//
// ============================================================

function buildGridPositions(extent, resolution) {
  if (!extent) {
    return {
      rows: 0,

      columns: 0,

      cells: [],
    };
  }

  const rows = resolution;

  const columns = resolution;

  const latitudeRange = extent.maxLatitude - extent.minLatitude;

  const longitudeRange = extent.maxLongitude - extent.minLongitude;

  const latitudeStep = rows > 1 ? latitudeRange / (rows - 1) : 0;

  const longitudeStep = columns > 1 ? longitudeRange / (columns - 1) : 0;

  const cells = [];

  for (let row = 0; row < rows; row += 1) {
    const latitude = extent.maxLatitude - row * latitudeStep;

    for (let column = 0; column < columns; column += 1) {
      const longitude = extent.minLongitude + column * longitudeStep;

      cells.push({
        row,

        column,

        latitude,

        longitude,
      });
    }
  }

  return {
    rows,

    columns,

    cells,
  };
}

// ============================================================
// INTERPOLATE PARAMETER VALUE
// ============================================================

function interpolateParameterValue(latitude, longitude, points, power) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  return calculateIDWValue(latitude, longitude, points, power);
}

// ============================================================
// CLASSIFY OPTIONAL INTERPOLATED VALUE
// ============================================================
//
// A null interpolated value remains unavailable.
//
// Valid values are passed through the existing strict
// classification function.
//
// ============================================================

function classifyOptionalInterpolatedValue(value, classifier) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return classifier(value);
}

// ============================================================
// BUILD CELL FERTILITY ASSESSMENT
// ============================================================
//
// The cell values are continuous interpolated measurements.
//
// Those measurements are classified using the exact same
// classifiers used for individual soil samples.
//
// Overall fertility is then determined by the exact existing
// assessOverallFertility() function.
//
// ============================================================

function buildCellAssessment(values) {
  const classifications = {
    nitrogen: classifyOptionalInterpolatedValue(
      values.nitrogen,
      FERTILITY_PARAMETERS.nitrogen.classifier,
    ),

    phosphorus: classifyOptionalInterpolatedValue(
      values.phosphorus,
      FERTILITY_PARAMETERS.phosphorus.classifier,
    ),

    potassium: classifyOptionalInterpolatedValue(
      values.potassium,
      FERTILITY_PARAMETERS.potassium.classifier,
    ),

    organicCarbon: classifyOptionalInterpolatedValue(
      values.organic_carbon,
      FERTILITY_PARAMETERS.organic_carbon.classifier,
    ),
  };

  const fertilityClass = assessOverallFertility(classifications);

  return {
    classifications,

    fertilityClass,
  };
}

// ============================================================
// ROUND VALUE
// ============================================================

function roundValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(6));
}

// ============================================================
// ROUND CELL
// ============================================================

function roundCell(cell) {
  return {
    row: cell.row,

    column: cell.column,

    latitude: roundValue(cell.latitude),

    longitude: roundValue(cell.longitude),

    values: {
      nitrogen: roundValue(cell.values.nitrogen),

      phosphorus: roundValue(cell.values.phosphorus),

      potassium: roundValue(cell.values.potassium),

      organic_carbon: roundValue(cell.values.organic_carbon),
    },

    classifications: {
      nitrogen: cell.classifications.nitrogen,

      phosphorus: cell.classifications.phosphorus,

      potassium: cell.classifications.potassium,

      organicCarbon: cell.classifications.organicCarbon,
    },

    fertilityClass: cell.fertilityClass,
  };
}

// ============================================================
// BUILD FERTILITY GRID
// ============================================================

function buildFertilityGrid(extent, resolution, parameterPoints, power) {
  const positions = buildGridPositions(extent, resolution);

  const cells = [];

  for (const position of positions.cells) {
    const values = {};

    for (const parameterKey of Object.keys(FERTILITY_PARAMETERS)) {
      values[parameterKey] = interpolateParameterValue(
        position.latitude,
        position.longitude,
        parameterPoints[parameterKey],
        power,
      );
    }

    const assessment = buildCellAssessment(values);

    cells.push(
      roundCell({
        row: position.row,

        column: position.column,

        latitude: position.latitude,

        longitude: position.longitude,

        values,

        classifications: assessment.classifications,

        fertilityClass: assessment.fertilityClass,
      }),
    );
  }

  return {
    rows: positions.rows,

    columns: positions.columns,

    cellCount: cells.length,

    cells,
  };
}

// ============================================================
// CALCULATE ZONING STATISTICS
// ============================================================

function calculateZoningStatistics(grid) {
  const zoneCounts = {
    Low: 0,

    "Moderate / Good": 0,

    High: 0,

    Unavailable: 0,
  };

  let validCellCount = 0;

  let insufficientDataCellCount = 0;

  if (grid && Array.isArray(grid.cells)) {
    for (const cell of grid.cells) {
      const fertilityClass = cell && cell.fertilityClass;

      if (Object.prototype.hasOwnProperty.call(zoneCounts, fertilityClass)) {
        zoneCounts[fertilityClass] += 1;
      }

      if (fertilityClass === "Unavailable") {
        insufficientDataCellCount += 1;
      } else {
        validCellCount += 1;
      }
    }
  }

  const totalCellCount =
    grid && Number.isFinite(grid.cellCount) ? grid.cellCount : 0;

  const zonePercentages = {};

  for (const zone of Object.keys(zoneCounts)) {
    zonePercentages[zone] =
      totalCellCount > 0
        ? Number(((zoneCounts[zone] / totalCellCount) * 100).toFixed(2))
        : 0;
  }

  return {
    totalCellCount,

    validCellCount,

    insufficientDataCellCount,

    zoneCounts,

    zonePercentages,
  };
}

// ============================================================
// BUILD SOURCE POINT SUMMARY
// ============================================================
//
// Source points are grouped by fertility parameter because
// different laboratory measurements may legitimately be
// unavailable for different samples.
//
// ============================================================

function buildSourcePointSummary(parameterPoints) {
  const summary = {};

  for (const parameterKey of Object.keys(FERTILITY_PARAMETERS)) {
    summary[parameterKey] = parameterPoints[parameterKey].map((point) => ({
      id: point.id,

      sample_code: point.sample_code,

      latitude: roundValue(point.latitude),

      longitude: roundValue(point.longitude),

      value: roundValue(point.value),
    }));
  }

  return summary;
}

// ============================================================
// BUILD CONFIGURATION
// ============================================================

function buildFertilityZoningConfiguration({
  power,
  resolution,
  extent,
  sampleCount,
  parameterPointCounts,
}) {
  return {
    zoningType: ZONING_TYPE,

    zoningLabel: "Overall Soil Fertility",

    interpolationMethod: {
      key: INTERPOLATION_METHOD.key,

      label: INTERPOLATION_METHOD.label,
    },

    settings: {
      power,

      resolution,
    },

    spatialExtent: extent,

    sampleCount,

    parameterPointCounts,

    fertilityParameters: Object.keys(FERTILITY_PARAMETERS).map((key) => ({
      key,

      field: FERTILITY_PARAMETERS[key].field,

      label: FERTILITY_PARAMETERS[key].label,

      unit: FERTILITY_PARAMETERS[key].unit,
    })),

    architecture: {
      calculationLocation: "backend",

      classificationLocation: "backend",

      presentationLocation: "frontend",

      surfaceType: "classified",

      continuousInterpolationBeforeClassification: true,

      extentConstraint: "sample_extent",
    },
  };
}

// ============================================================
// PREPARE + CALCULATE FERTILITY ZONING
// ============================================================
//
// This is the Phase 9.2 service-layer entry point.
//
// ============================================================

async function prepareFertilityZoning(options = {}) {
  // ----------------------------------------------------------
  // Validate request
  // ----------------------------------------------------------

  const validation = validateFertilityZoningRequest(options);

  if (!validation.valid) {
    const error = new Error(validation.errors.join(" "));

    error.statusCode = 400;

    error.validationErrors = validation.errors;

    throw error;
  }

  const { power, resolution } = validation;

  // ----------------------------------------------------------
  // Retrieve samples
  // ----------------------------------------------------------

  const samples = await soilRepository.getAllSoilSamples();

  if (!Array.isArray(samples) || samples.length === 0) {
    const error = new Error(
      "At least one soil sample is required for fertility zoning.",
    );

    error.statusCode = 400;

    throw error;
  }

  // ----------------------------------------------------------
  // Extract fertility interpolation points
  // ----------------------------------------------------------

  const parameterPoints = buildFertilityPoints(samples);

  // ----------------------------------------------------------
  // Verify that at least one fertility parameter contains
  // usable data.
  // ----------------------------------------------------------

  const totalParameterPoints = Object.values(parameterPoints).reduce(
    (total, points) => total + (Array.isArray(points) ? points.length : 0),
    0,
  );

  if (totalParameterPoints === 0) {
    const error = new Error(
      "No valid soil samples contain usable Nitrogen, Phosphorus, Potassium, or Organic Carbon values and coordinates.",
    );

    error.statusCode = 400;

    throw error;
  }

  // ----------------------------------------------------------
  // Determine common sample-derived spatial extent
  // ----------------------------------------------------------

  const extent = calculateCommonExtent(parameterPoints);

  if (!extent) {
    const error = new Error(
      "Unable to determine a valid spatial extent for fertility zoning.",
    );

    error.statusCode = 400;

    throw error;
  }

  // ----------------------------------------------------------
  // Parameter point counts
  // ----------------------------------------------------------

  const parameterPointCounts = {};

  for (const parameterKey of Object.keys(FERTILITY_PARAMETERS)) {
    parameterPointCounts[parameterKey] = parameterPoints[parameterKey].length;
  }

  // ----------------------------------------------------------
  // Build configuration
  // ----------------------------------------------------------

  const configuration = buildFertilityZoningConfiguration({
    power,

    resolution,

    extent,

    sampleCount: samples.length,

    parameterPointCounts,
  });

  // ----------------------------------------------------------
  // Generate continuous fertility grid
  // ----------------------------------------------------------
  //
  // Continuous values are calculated first.
  //
  // Classification occurs afterward.
  //
  // ----------------------------------------------------------

  const grid = buildFertilityGrid(extent, resolution, parameterPoints, power);

  // ----------------------------------------------------------
  // Calculate zoning statistics
  // ----------------------------------------------------------

  const statistics = calculateZoningStatistics(grid);

  // ----------------------------------------------------------
  // Build stable Phase 9.2 response
  // ----------------------------------------------------------

  return {
    success: true,

    phase: API_PHASE,

    status: "completed",

    message: "Overall soil fertility zoning surface generated successfully.",

    configuration,

    zoneDefinitions: FERTILITY_ZONE_DEFINITIONS,

    statistics,

    sourcePoints: buildSourcePointSummary(parameterPoints),

    grid,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

module.exports = {
  API_PHASE,

  ZONING_TYPE,

  INTERPOLATION_METHOD,

  // ----------------------------------------------------------
  // Interpolation defaults and limits
  // ----------------------------------------------------------
  //
  // Re-exported from interpolationService.js so the REST API
  // configuration remains synchronized with Phase 8.
  //
  DEFAULT_POWER,

  DEFAULT_RESOLUTION,

  MIN_RESOLUTION,

  MAX_RESOLUTION,

  MIN_POWER,

  MAX_POWER,

  // ----------------------------------------------------------
  // Fertility zoning definitions
  // ----------------------------------------------------------

  FERTILITY_PARAMETERS,

  FERTILITY_ZONE_DEFINITIONS,

  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  validateFertilityZoningRequest,

  // ----------------------------------------------------------
  // Point preparation
  // ----------------------------------------------------------

  extractParameterPoints,

  buildFertilityPoints,

  // ----------------------------------------------------------
  // Spatial processing
  // ----------------------------------------------------------

  calculateCommonExtent,

  buildGridPositions,

  interpolateParameterValue,

  // ----------------------------------------------------------
  // Scientific classification / assessment
  // ----------------------------------------------------------

  buildCellAssessment,

  // ----------------------------------------------------------
  // Grid and statistics
  // ----------------------------------------------------------

  buildFertilityGrid,

  calculateZoningStatistics,

  buildSourcePointSummary,

  // ----------------------------------------------------------
  // Configuration and main service entry point
  // ----------------------------------------------------------

  buildFertilityZoningConfiguration,

  prepareFertilityZoning,
};
