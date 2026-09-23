"use strict";

// ============================================================
// server/services/interpolationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Backend Interpolation Service
//
// Responsibilities:
//   1. Validate interpolation requests
//   2. Extract valid interpolation points
//   3. Calculate spatial extent and padding
//   4. Dispatch interpolation calculations
//   5. Build interpolation grids
//   6. Calculate surface statistics
//   7. Build interpolation configuration
//   8. Resolve scientific Kriging parameters once per surface
//   9. Run diagnostic LOOCV once per spline/NN surface
//  10. Run optional comparative interpolation validation
//  11. Run comparative interpolation analysis
//
// Scientific calculations remain backend-only.
// Frontend is responsible only for presentation/UI.
//
// Phase history:
//   8.3   Backend interpolation service
//   12.5  Kriging scientific validation/readiness
//   12.6  Thin-Plate Spline scientific foundation
//   12.7  Nearest-Neighbour scientific foundation
//   12.8  Comparative interpolation validation
//   12.9  Comparative interpolation analysis
//
// Phase 12.8.5:
//   Production integration of comparative validation.
//   Comparative validation is diagnostic-only and opt-in.
//
// Phase 12.9:
//   Comparative analysis consumes the Phase 12.8 result.
//   No additional LOOCV execution occurs.
//   Analysis is diagnostic-only.
//
// ============================================================

const soilRepository =
  require("../repositories/soilRepository");

const {
  interpolateIDW,
} = require("./interpolation/idwInterpolation");

const {
  interpolateKriging,
} = require("./interpolation/krigingInterpolation");

const {
  interpolateSpline,
} = require("./interpolation/splineInterpolation");

const {
  performLeaveOneOutCrossValidation,
} =
  require("./interpolation/splineCrossValidationService");

const {
  performLeaveOneOutCrossValidation:
    performNearestNeighbourLeaveOneOutCrossValidation,
} =
  require("./interpolation/nearestNeighbourCrossValidationService");

const {
  interpolateNearestNeighbour,
} =
  require("./interpolation/nearestNeighbourInterpolation");

const {
  resolveScientificInterpolationParameters,
} =
  require("./interpolation/scientificInterpolationParameterService");

const {
  validateVariogramEstimation,
} =
  require("./interpolation/variogramValidationService");

const {
  evaluateKrigingReadiness,
} =
  require("./interpolation/krigingAcceptanceIntegrationService");

const comparativeValidationService =
  require("./interpolation/comparativeValidationService");

const comparativeAnalysisService =
  require("./interpolation/comparativeAnalysisService");

// ============================================================
// API
// ============================================================

const API_PHASE = "8.3";

// ============================================================
// PARAMETERS
// ============================================================

const SUPPORTED_PARAMETERS = {
  ph: {
    key: "ph",
    label: "pH",
    field: "ph",
    unit: "pH",
    aliases: ["ph", "pH"],
  },

  nitrogen: {
    key: "nitrogen",
    label: "Nitrogen",
    field: "nitrogen",
    unit: "mg/kg",
    aliases: ["nitrogen", "N", "n"],
  },

  phosphorus: {
    key: "phosphorus",
    label: "Phosphorus",
    field: "phosphorus",
    unit: "mg/kg",
    aliases: ["phosphorus", "P", "p"],
  },

  potassium: {
    key: "potassium",
    label: "Potassium",
    field: "potassium",
    unit: "mg/kg",
    aliases: ["potassium", "K", "k"],
  },

  organic_carbon: {
    key: "organic_carbon",
    label: "Organic Carbon",
    field: "organic_carbon",
    unit: "%",
    aliases: ["organic_carbon", "OC", "oc"],
  },

  electrical_conductivity: {
    key: "electrical_conductivity",
    label: "Electrical Conductivity",
    field: "electrical_conductivity",
    unit: "dS/m",
    aliases: [
      "electrical_conductivity",
      "EC",
      "ec",
    ],
  },
};

// ============================================================
// METHODS
// ============================================================

const SUPPORTED_METHODS = {
  idw: {
    key: "idw",
    label: "Inverse Distance Weighting",
  },

  kriging: {
    key: "kriging",
    label: "Kriging",
  },

  spline: {
    key: "spline",
    label: "Thin-Plate Spline",
  },

  nearest_neighbour: {
    key: "nearest_neighbour",
    label: "Nearest-Neighbour",
  },
};

// ============================================================
// DEFAULTS / LIMITS
// ============================================================

const DEFAULT_POWER = 2;
const DEFAULT_RESOLUTION = 50;

const MIN_RESOLUTION = 10;
const MAX_RESOLUTION = 200;

const MIN_POWER = 0.5;
const MAX_POWER = 10;

// ============================================================
// MINIMUM SAMPLE COUNTS
// ============================================================

const MIN_SAMPLE_COUNTS = {
  idw: 1,
  kriging: 2,
  spline: 3,
  nearest_neighbour: 1,
};

// ============================================================
// COMPARATIVE VALIDATION
// ============================================================
//
// Comparative validation is deliberately opt-in.
//
// Normal interpolation requests therefore do not incur the
// additional cost of executing four LOOCV services.
//
// Request flag:
//
//   runComparativeValidation: true
//
// Comparative validation remains diagnostic-only.
//
// It does not:
//   - alter grid construction
//   - alter interpolation parameters
//   - rank methods
//   - select a method
//   - calculate a composite score
//   - change scientific thresholds
//
// ============================================================

const COMPARATIVE_VALIDATION_TYPE =
  "comparative_interpolation_validation";

const COMPARATIVE_VALIDATION_STATUS_NOT_REQUESTED =
  "not_requested";

// ============================================================
// BASIC HELPERS
// ============================================================

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function normaliseString(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : null;
}

// ============================================================
// PARAMETER RESOLUTION
// ============================================================

function resolveParameter(parameter) {
  if (
    parameter &&
    typeof parameter === "object"
  ) {
    const key = normaliseString(
      parameter.key,
    );

    return key &&
      SUPPORTED_PARAMETERS[key]
      ? SUPPORTED_PARAMETERS[key]
      : null;
  }

  const key = normaliseString(parameter);

  return key
    ? SUPPORTED_PARAMETERS[key] ?? null
    : null;
}

// ============================================================
// METHOD RESOLUTION
// ============================================================

function resolveMethod(method) {
  if (
    method &&
    typeof method === "object"
  ) {
    const key = normaliseString(
      method.key,
    );

    return key
      ? SUPPORTED_METHODS[key] ?? null
      : null;
  }

  const key = normaliseString(method);

  return key
    ? SUPPORTED_METHODS[key] ?? null
    : null;
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

function validateInterpolationRequest(
  request = {},
) {
  const errors = [];

  const parameter =
    resolveParameter(request.parameter);

  if (!parameter) {
    errors.push(
      `parameter must be one of: ${Object.keys(
        SUPPORTED_PARAMETERS,
      ).join(", ")}.`,
    );
  }

  let methodKey;

  if (
    request.method === undefined ||
    request.method === null ||
    request.method === ""
  ) {
    methodKey = "idw";
  } else if (
    typeof request.method === "string"
  ) {
    methodKey =
      normaliseString(request.method);
  } else if (
    request.method &&
    typeof request.method === "object" &&
    typeof request.method.key === "string"
  ) {
    methodKey =
      normaliseString(
        request.method.key,
      );
  } else {
    methodKey = null;
  }

  const method =
    methodKey &&
    SUPPORTED_METHODS[methodKey]
      ? SUPPORTED_METHODS[methodKey]
      : null;

  if (!method) {
    errors.push(
      `method must be one of: ${Object.keys(
        SUPPORTED_METHODS,
      ).join(", ")}.`,
    );
  }

  let power = null;

  if (method?.key === "idw") {
    if (
      request.power === undefined ||
      request.power === null ||
      request.power === ""
    ) {
      power = DEFAULT_POWER;
    } else {
      power = Number(request.power);

      if (!Number.isFinite(power)) {
        errors.push(
          "power must be a finite number.",
        );
      } else if (
        power < MIN_POWER ||
        power > MAX_POWER
      ) {
        errors.push(
          `power must be between ${MIN_POWER} and ${MAX_POWER}.`,
        );
      }
    }
  }

  let resolution;

  if (
    request.resolution === undefined ||
    request.resolution === null ||
    request.resolution === ""
  ) {
    resolution = DEFAULT_RESOLUTION;
  } else {
    resolution = Number(
      request.resolution,
    );

    if (!Number.isFinite(resolution)) {
      errors.push(
        "resolution must be a valid number.",
      );
    } else if (
      !Number.isInteger(resolution)
    ) {
      errors.push(
        "resolution must be a whole number.",
      );
    } else if (
      resolution < MIN_RESOLUTION ||
      resolution > MAX_RESOLUTION
    ) {
      errors.push(
        `resolution must be between ${MIN_RESOLUTION} and ${MAX_RESOLUTION}.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    parameter,
    method,
    power,
    resolution,
  };
}

// ============================================================
// POINT EXTRACTION
// ============================================================

function readParameterValue(
  sample,
  parameter,
) {
  if (!sample || !parameter) {
    return undefined;
  }

  const aliases =
    Array.isArray(parameter.aliases)
      ? parameter.aliases
      : [parameter.field];

  for (const alias of aliases) {
    if (
      Object.prototype.hasOwnProperty.call(
        sample,
        alias,
      )
    ) {
      return sample[alias];
    }
  }

  return undefined;
}

function extractInterpolationPoints(
  samples,
  parameter,
) {
  if (
    !Array.isArray(samples) ||
    !parameter ||
    typeof parameter !== "object"
  ) {
    return [];
  }

  const result = [];

  for (const sample of samples) {
    if (
      !sample ||
      typeof sample !== "object"
    ) {
      continue;
    }

    const latitude =
      Number(sample.latitude);

    const longitude =
      Number(sample.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      continue;
    }

    const rawValue =
      readParameterValue(
        sample,
        parameter,
      );

    if (
      rawValue === null ||
      rawValue === undefined ||
      rawValue === ""
    ) {
      continue;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      continue;
    }

    result.push({
      id: sample.id,
      sample_code:
        sample.sample_code ??
        sample.sampleCode ??
        null,
      latitude,
      longitude,
      value,
    });
  }

  return result;
}

// ============================================================
// EXTENT
// ============================================================

function calculateExtent(points) {
  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return null;
  }

  const validPoints =
    points.filter(
      (point) =>
        point &&
        Number.isFinite(
          Number(point.latitude),
        ) &&
        Number.isFinite(
          Number(point.longitude),
        ),
    );

  if (validPoints.length === 0) {
    return null;
  }

  const latitudes =
    validPoints.map((point) =>
      Number(point.latitude),
    );

  const longitudes =
    validPoints.map((point) =>
      Number(point.longitude),
    );

  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
}

// ============================================================
// EXTENT PADDING
// ============================================================

function padExtent(extent) {
  if (!extent) {
    return null;
  }

  const minLatitude =
    Number(extent.minLatitude);

  const maxLatitude =
    Number(extent.maxLatitude);

  const minLongitude =
    Number(extent.minLongitude);

  const maxLongitude =
    Number(extent.maxLongitude);

  if (
    !Number.isFinite(minLatitude) ||
    !Number.isFinite(maxLatitude) ||
    !Number.isFinite(minLongitude) ||
    !Number.isFinite(maxLongitude)
  ) {
    return null;
  }

  const latitudeRange =
    maxLatitude - minLatitude;

  const longitudeRange =
    maxLongitude - minLongitude;

  const latitudePadding =
    latitudeRange === 0
      ? 0.001
      : latitudeRange * 0.02;

  const longitudePadding =
    longitudeRange === 0
      ? 0.001
      : longitudeRange * 0.02;

  return {
    minLatitude: Math.max(
      -90,
      minLatitude - latitudePadding,
    ),
    maxLatitude: Math.min(
      90,
      maxLatitude + latitudePadding,
    ),
    minLongitude: Math.max(
      -180,
      minLongitude - longitudePadding,
    ),
    maxLongitude: Math.min(
      180,
      maxLongitude + longitudePadding,
    ),
  };
}

// ============================================================
// SPATIAL DISTANCE
// ============================================================

const EARTH_RADIUS_METRES =
  6371008.8;

function calculateDistance(
  latitude1,
  longitude1,
  latitude2,
  longitude2,
) {
  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return NaN;
  }

  const radians =
    Math.PI / 180;

  const phi1 = lat1 * radians;
  const phi2 = lat2 * radians;

  const deltaLatitude =
    (lat2 - lat1) * radians;

  const deltaLongitude =
    (lon2 - lon1) * radians;

  const meanLatitude =
    (phi1 + phi2) / 2;

  const x =
    deltaLongitude *
    Math.cos(meanLatitude);

  const y = deltaLatitude;

  const distance =
    Math.sqrt(x * x + y * y) *
    EARTH_RADIUS_METRES;

  return Number.isFinite(distance)
    ? distance
    : NaN;
}

// ============================================================
// IDW
// ============================================================

function calculateIDWValue(
  latitude,
  longitude,
  points,
  power = DEFAULT_POWER,
) {
  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return null;
  }

  const numericPower =
    Number(power);

  if (
    !Number.isFinite(numericPower) ||
    numericPower < MIN_POWER ||
    numericPower > MAX_POWER
  ) {
    return null;
  }

  const result =
    interpolateIDW(
      points,
      {
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      {
        power: numericPower,
      },
    );

  if (
    !result ||
    !result.success
  ) {
    return null;
  }

  const prediction =
    Number(result.prediction);

  return Number.isFinite(prediction)
    ? prediction
    : null;
}

// ============================================================
// INTERPOLATION DISPATCH
// ============================================================

function normaliseDispatcherArguments(
  method,
  power,
  interpolationParameters,
) {
  if (typeof method === "number") {
    return {
      method: SUPPORTED_METHODS.idw,
      power: method,
      interpolationParameters,
    };
  }

  return {
    method:
      typeof method === "string"
        ? resolveMethod(method)
        : resolveMethod(method),
    power,
    interpolationParameters,
  };
}

function extractPrediction(result) {
  if (
    !result ||
    result.success !== true
  ) {
    return null;
  }

  const prediction =
    Number(result.prediction);

  return Number.isFinite(prediction)
    ? prediction
    : null;
}

function calculateInterpolationValue(
  method,
  latitude,
  longitude,
  points,
  power = undefined,
  interpolationParameters = undefined,
) {
  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return null;
  }

  const normalised =
    normaliseDispatcherArguments(
      method,
      power,
      interpolationParameters,
    );

  const resolvedMethod =
    normalised.method;

  if (!resolvedMethod) {
    return null;
  }

  const target = {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  if (
    !Number.isFinite(target.latitude) ||
    !Number.isFinite(target.longitude)
  ) {
    return null;
  }

  switch (resolvedMethod.key) {
    case "idw":
      return calculateIDWValue(
        target.latitude,
        target.longitude,
        points,
        normalised.power === undefined ||
          normalised.power === null
          ? DEFAULT_POWER
          : normalised.power,
      );

    case "nearest_neighbour": {
      const result =
        interpolateNearestNeighbour(
          points,
          target,
        );

      return extractPrediction(result);
    }

    case "spline": {
      const result =
        interpolateSpline(
          points,
          target,
        );

      return extractPrediction(result);
    }

    case "kriging": {
      const scientific =
        normalised.interpolationParameters;

      if (
        !scientific ||
        scientific.success !== true ||
        !scientific.parameters
      ) {
        return null;
      }

      const result =
        interpolateKriging(
          points,
          target,
          scientific.parameters,
        );

      if (
        !result ||
        result.success !== true
      ) {
        return null;
      }

      const predictedValue =
        Number(result.predictedValue);

      return Number.isFinite(predictedValue)
        ? predictedValue
        : null;
    }

    default:
      return null;
  }
}

// ============================================================
// GRID
// ============================================================

function buildInterpolationGrid(
  extent,
  resolution,
  points,
  method,
  power = undefined,
  interpolationParameters = undefined,
) {
  if (!extent) {
    return {
      rows: 0,
      columns: 0,
      cells: [],
    };
  }

  const rows = Number(resolution);
  const columns = Number(resolution);

  if (
    !Number.isInteger(rows) ||
    rows <= 0 ||
    !Number.isInteger(columns) ||
    columns <= 0
  ) {
    return {
      rows: 0,
      columns: 0,
      cells: [],
    };
  }

  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return {
      rows,
      columns,
      cells: [],
    };
  }

  const minLatitude =
    Number(extent.minLatitude);

  const maxLatitude =
    Number(extent.maxLatitude);

  const minLongitude =
    Number(extent.minLongitude);

  const maxLongitude =
    Number(extent.maxLongitude);

  if (
    !Number.isFinite(minLatitude) ||
    !Number.isFinite(maxLatitude) ||
    !Number.isFinite(minLongitude) ||
    !Number.isFinite(maxLongitude)
  ) {
    return {
      rows: 0,
      columns: 0,
      cells: [],
    };
  }

  const latitudeStep =
    rows === 1
      ? 0
      : (maxLatitude - minLatitude) /
        (rows - 1);

  const longitudeStep =
    columns === 1
      ? 0
      : (maxLongitude - minLongitude) /
        (columns - 1);

  const cells = [];

  for (
    let row = 0;
    row < rows;
    row += 1
  ) {
    const latitude =
      rows === 1
        ? maxLatitude
        : maxLatitude -
          row * latitudeStep;

    for (
      let column = 0;
      column < columns;
      column += 1
    ) {
      const longitude =
        columns === 1
          ? minLongitude
          : minLongitude +
            column * longitudeStep;

      const value =
        calculateInterpolationValue(
          method,
          latitude,
          longitude,
          points,
          power,
          interpolationParameters,
        );

      cells.push({
        row,
        column,
        latitude,
        longitude,
        value,
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
// SURFACE STATISTICS
// ============================================================

function calculateSurfaceStatistics(
  cells,
) {
  if (!Array.isArray(cells)) {
    return {
      validCellCount: 0,
      minimum: null,
      maximum: null,
      average: null,
    };
  }

  const values = cells
    .filter(
      (cell) =>
        cell &&
        cell.value !== null &&
        cell.value !== undefined,
    )
    .map((cell) =>
      Number(cell.value),
    )
    .filter((value) =>
      Number.isFinite(value),
    );

  if (values.length === 0) {
    return {
      validCellCount: 0,
      minimum: null,
      maximum: null,
      average: null,
    };
  }

  const sum =
    values.reduce(
      (total, value) =>
        total + value,
      0,
    );

  return {
    validCellCount: values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    average: sum / values.length,
  };
}

// ============================================================
// CONFIGURATION
// ============================================================

function buildInterpolationConfiguration({
  parameter,
  method,
  power,
  resolution,
  sampleCount,
  extent,
} = {}) {
  const resolvedParameter =
    resolveParameter(parameter);

  const resolvedMethod =
    resolveMethod(method);

  const settings = {
    resolution,
  };

  if (
    resolvedMethod &&
    resolvedMethod.key === "idw"
  ) {
    settings.power = power;
  }

  return {
    parameter: resolvedParameter,
    method: resolvedMethod,
    settings,
    sampleCount,
    spatialExtent: extent,
    architecture: {
      calculationLocation:
        "backend",
      presentationLocation:
        "frontend",
      surfaceType:
        "continuous",
      extentConstraint:
        "sample_extent",
    },
  };
}

// ============================================================
// SUCCESS MESSAGE
// ============================================================

function buildInterpolationSuccessMessage(
  method,
) {
  const resolvedMethod =
    resolveMethod(method);

  if (!resolvedMethod) {
    return null;
  }

  switch (resolvedMethod.key) {
    case "idw":
      return "IDW interpolation surface generated successfully.";

    case "kriging":
      return "Kriging interpolation surface generated successfully.";

    case "spline":
      return "Thin-Plate Spline interpolation surface generated successfully.";

    case "nearest_neighbour":
      return "Nearest-Neighbour interpolation surface generated successfully.";

    default:
      return null;
  }
}

// ============================================================
// SAMPLE COUNT VALIDATION
// ============================================================

function validateInterpolationSampleCount(
  methodMetadata,
  actual,
) {
  const method =
    resolveMethod(methodMetadata);

  const minimum =
    method
      ? MIN_SAMPLE_COUNTS[method.key]
      : null;

  const numericActual =
    Number(actual);

  if (
    !method ||
    minimum === null
  ) {
    return {
      valid: false,
      minimum,
      actual: numericActual,
      error:
        "Unsupported interpolation method.",
    };
  }

  if (numericActual >= minimum) {
    return {
      valid: true,
      minimum,
      actual: numericActual,
      error: null,
    };
  }

  let error;

  switch (method.key) {
    case "kriging":
      error =
        "Kriging interpolation requires at least 2 valid soil samples.";
      break;

    case "spline":
      error =
        "Thin-Plate Spline interpolation requires at least 3 valid soil samples.";
      break;

    case "nearest_neighbour":
      error =
        "Nearest-Neighbour interpolation requires at least 1 valid soil sample.";
      break;

    case "idw":
      error =
        "IDW interpolation requires at least 1 valid soil sample.";
      break;

    default:
      error =
        "Interpolation requires a valid sample count.";
  }

  return {
    valid: false,
    minimum,
    actual: numericActual,
    error,
  };
}

// ============================================================
// SCIENTIFIC PARAMETER RESOLUTION
// ============================================================

function resolveInterpolationParameters({
  method,
  parameter,
  points,
  sampleCount,
  model = "spherical",
  variogramOptions = {},
  estimationOptions = {},
} = {}) {
  const resolvedMethod =
    resolveMethod(method);

  if (
    !resolvedMethod ||
    resolvedMethod.key !== "kriging"
  ) {
    return null;
  }

  return resolveScientificInterpolationParameters({
    method:
      resolvedMethod.key,

    parameter:
      typeof parameter === "object"
        ? parameter.key
        : parameter,

    points,
    sampleCount,
    model,
    variogramOptions,
    estimationOptions,
  });
}

// ============================================================
// PREPARE INTERPOLATION
// ============================================================

async function prepareInterpolation(
  request = {},
) {
  const validation =
    validateInterpolationRequest(
      request,
    );

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      parameter: validation.parameter,
      method: validation.method,
      power: validation.power,
      resolution:
        validation.resolution,
    };
  }

  const samples =
    await soilRepository.getAllSoilSamples();

  const points =
    extractInterpolationPoints(
      samples,
      validation.parameter,
    );

  const sampleCount =
    points.length;

  const sampleCountValidation =
    validateInterpolationSampleCount(
      validation.method,
      sampleCount,
    );

  if (
    !sampleCountValidation.valid
  ) {
    return {
      success: false,
      errors: [
        sampleCountValidation.error,
      ],
      parameter: validation.parameter,
      method: validation.method,
      power: validation.power,
      resolution:
        validation.resolution,
      sampleCount,
      points,
    };
  }

  const extent =
    calculateExtent(points);

  if (!extent) {
    return {
      success: false,
      errors: [
        "Unable to calculate interpolation extent from valid soil samples.",
      ],
      parameter: validation.parameter,
      method: validation.method,
      power: validation.power,
      resolution:
        validation.resolution,
      sampleCount,
      points,
    };
  }

  let interpolationParameters =
    null;

  let krigingValidation = null;
  let krigingAcceptance = null;
  let krigingReadiness = null;

  if (
    validation.method.key ===
    "kriging"
  ) {
    interpolationParameters =
      resolveInterpolationParameters({
        method:
          validation.method,
        parameter:
          validation.parameter,
        points,
        sampleCount,
        model:
          request.model ??
          "spherical",
        variogramOptions:
          request.variogramOptions ??
          {},
        estimationOptions:
          request.estimationOptions ??
          {},
      });

    if (
      !interpolationParameters ||
      interpolationParameters.success !==
        true
    ) {
      return {
        success: false,
        errors: [
          interpolationParameters?.error ??
            "Unable to resolve scientific Kriging parameters.",
        ],
        parameter:
          validation.parameter,
        method:
          validation.method,
        power:
          validation.power,
        resolution:
          validation.resolution,
        sampleCount,
        points,
        spatialExtent: extent,
        interpolationParameters,
      };
    }

    // ========================================================
    // PHASE 12.5.3
    // ========================================================

    const validationParameters =
      interpolationParameters.parameters;

    const validationStructuredVariance =
      validationParameters &&
      Number.isFinite(
        validationParameters.sill,
      ) &&
      Number.isFinite(
        validationParameters.nugget,
      )
        ? validationParameters.sill -
          validationParameters.nugget
        : null;

    const validationInput = {
      ...interpolationParameters,

      model:
        interpolationParameters
          .parameters?.model ??
        null,

      parameters: {
        ...interpolationParameters.parameters,
        structuredVariance:
          validationStructuredVariance,
      },

      structuredVariance:
        validationStructuredVariance,

      diagnostics:
        interpolationParameters.diagnostics,

      fit:
        interpolationParameters
          .diagnostics?.fit ??
        null,
    };

    krigingValidation =
      validateVariogramEstimation(
        validationInput,
        request.validationOptions ??
          {},
      );

    // ========================================================
    // PHASE 12.5.5
    // ========================================================

    krigingReadiness =
      evaluateKrigingReadiness(
        krigingValidation,
      );

    krigingAcceptance =
      krigingReadiness.acceptance;

    if (
      !krigingReadiness.success
    ) {
      return {
        success: false,
        errors:
          krigingReadiness.errors
            .length > 0
            ? krigingReadiness.errors
            : [
                "Unable to evaluate Kriging readiness.",
              ],
        parameter:
          validation.parameter,
        method:
          validation.method,
        power:
          validation.power,
        resolution:
          validation.resolution,
        sampleCount,
        points,
        spatialExtent: extent,
        interpolationParameters,
        krigingValidation,
        krigingAcceptance,
        krigingReadiness,
      };
    }

    if (
      !krigingReadiness.ready
    ) {
      return {
        success: false,
        errors:
          krigingReadiness.errors
            .length > 0
            ? krigingReadiness.errors
            : [
                "Kriging acceptance criteria rejected interpolation.",
              ],
        parameter:
          validation.parameter,
        method:
          validation.method,
        power:
          validation.power,
        resolution:
          validation.resolution,
        sampleCount,
        points,
        spatialExtent: extent,
        interpolationParameters,
        krigingValidation,
        krigingAcceptance,
        krigingReadiness,
      };
    }
  }

  return {
    success: true,
    parameter:
      validation.parameter,
    method:
      validation.method,
    power:
      validation.power,
    resolution:
      validation.resolution,
    sampleCount,
    points,
    spatialExtent: extent,
    interpolationParameters,
    krigingValidation,
    krigingAcceptance,
    krigingReadiness,
  };
}

// ============================================================
// PHASE 12.6.6 — SPLINE LOOCV
// ============================================================

const MIN_SPLINE_LOOCV_SAMPLE_COUNT = 4;

function runSplineCrossValidation(
  method,
  points,
  request = {},
) {
  if (
    !method ||
    method.key !== "spline"
  ) {
    return null;
  }

  if (!Array.isArray(points)) {
    return {
      success: false,
      status: "failed",
      method:
        "thin_plate_spline_loocv",
      sampleCount: null,
      successfulFolds: 0,
      failedFolds: 0,
      folds: [],
      metrics: null,
      error:
        "Unable to perform spline cross-validation because interpolation points are invalid.",
    };
  }

  if (
    points.length <
    MIN_SPLINE_LOOCV_SAMPLE_COUNT
  ) {
    return {
      success: true,
      status: "not_applicable",
      method:
        "thin_plate_spline_loocv",
      sampleCount: points.length,
      minimumSampleCount:
        MIN_SPLINE_LOOCV_SAMPLE_COUNT,
      successfulFolds: 0,
      failedFolds: 0,
      folds: [],
      metrics: null,
      error: null,
      reason:
        "Leave-one-out cross-validation requires at least four observations so that each training fold retains the minimum three observations required by thin-plate spline interpolation.",
    };
  }

  const result =
    performLeaveOneOutCrossValidation(
      points,
      request.splineCrossValidationOptions ??
        {},
    );

  return {
    ...result,
    status:
      result.success === true
        ? "complete"
        : "failed",
  };
}

// ============================================================
// PHASE 12.7.6 — NEAREST-NEIGHBOUR LOOCV
// ============================================================

const MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT = 2;

function runNearestNeighbourCrossValidation(
  method,
  points,
  request = {},
) {
  if (
    !method ||
    method.key !== "nearest_neighbour"
  ) {
    return null;
  }

  const methodIdentifier =
    "nearest_neighbour_loocv";

  if (!Array.isArray(points)) {
    return {
      success: false,
      status: "failed",
      method: methodIdentifier,
      sampleCount: null,
      minimumSampleCount:
        MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
      successfulFolds: 0,
      failedFolds: 0,
      folds: [],
      metrics: null,
      error:
        "Unable to perform nearest-neighbour cross-validation because interpolation points are invalid.",
    };
  }

  if (
    points.length <
    MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT
  ) {
    return {
      success: true,
      status: "not_applicable",
      method: methodIdentifier,
      sampleCount: points.length,
      minimumSampleCount:
        MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,
      successfulFolds: 0,
      failedFolds: 0,
      folds: [],
      metrics: null,
      error: null,
      reason:
        "Leave-one-out cross-validation requires at least two observations so that each held-out observation has at least one remaining nearest-neighbour candidate.",
    };
  }

  const result =
    performNearestNeighbourLeaveOneOutCrossValidation(
      points,
      request.nearestNeighbourCrossValidationOptions ??
        {},
    );

  return {
    ...result,

    success:
      result?.success === true,

    status:
      result?.success === true
        ? "complete"
        : "failed",

    method: methodIdentifier,

    sampleCount:
      result?.sampleCount ??
      points.length,

    successfulFolds:
      result?.successfulFolds ?? 0,

    failedFolds:
      result?.failedFolds ?? 0,

    folds:
      Array.isArray(result?.folds)
        ? result.folds
        : [],

    metrics:
      result?.metrics ?? null,
  };
}

// ============================================================
// PHASE 12.8.5 — COMPARATIVE VALIDATION
// ============================================================
//
// Comparative validation is diagnostic-only.
//
// It is intentionally not executed during an ordinary
// interpolation request.
//
// To execute it, the caller must explicitly provide:
//
//   runComparativeValidation: true
//
// The comparative service requires fixed Kriging parameters.
// Therefore the production integration uses the scientific
// Kriging parameters already resolved for a Kriging surface.
//
// This prevents the comparative layer from estimating a second
// set of Kriging parameters during the same interpolation
// operation.
//
// For non-Kriging interpolation requests, comparative
// validation is reported as not_applicable unless explicit
// fixed Kriging parameters are supplied through:
//
//   comparativeKrigingParameters
//
// ============================================================

function buildComparativeValidationNotRequested() {
  return {
    success: true,
    validationType:
      COMPARATIVE_VALIDATION_TYPE,
    diagnosticType: "loocv",
    status:
      COMPARATIVE_VALIDATION_STATUS_NOT_REQUESTED,
    requested: false,
    applicable: false,
    sampleCount: null,
    methods: {},
    summary: {
      totalMethods: 0,
      completeMethods: 0,
      notApplicableMethods: 0,
      failedMethods: 0,
    },
    errors: [],
  };
}

function buildComparativeValidationNotApplicable(
  points,
  reason,
) {
  return {
    success: true,
    validationType:
      COMPARATIVE_VALIDATION_TYPE,
    diagnosticType: "loocv",
    status: "not_applicable",
    requested: true,
    applicable: false,
    sampleCount:
      Array.isArray(points)
        ? points.length
        : null,
    methods: {},
    summary: {
      totalMethods: 0,
      completeMethods: 0,
      notApplicableMethods: 0,
      failedMethods: 0,
    },
    errors: [],
    reason,
  };
}

function buildComparativeValidationFailure(
  points,
  error,
) {
  return {
    success: false,
    validationType:
      COMPARATIVE_VALIDATION_TYPE,
    diagnosticType: "loocv",
    status: "failed",
    requested: true,
    applicable: false,
    sampleCount:
      Array.isArray(points)
        ? points.length
        : null,
    methods: {},
    summary: {
      totalMethods: 0,
      completeMethods: 0,
      notApplicableMethods: 0,
      failedMethods: 1,
    },
    errors: [error],
  };
}

function runComparativeInterpolationValidation(
  method,
  points,
  request = {},
  interpolationParameters = null,
) {
  if (
    !request ||
    request.runComparativeValidation !== true
  ) {
    return buildComparativeValidationNotRequested();
  }

  if (!Array.isArray(points)) {
    return buildComparativeValidationFailure(
      points,
      "Unable to perform comparative interpolation validation because interpolation points are invalid.",
    );
  }

  if (points.length < 2) {
    return buildComparativeValidationNotApplicable(
      points,
      "Comparative interpolation validation requires at least two observations.",
    );
  }

  let krigingParameters = null;

  if (
    interpolationParameters &&
    interpolationParameters.parameters
  ) {
    krigingParameters = {
      ...interpolationParameters.parameters,
    };
  }

  if (
    !krigingParameters &&
    request.comparativeKrigingParameters &&
    typeof request.comparativeKrigingParameters ===
      "object"
  ) {
    krigingParameters = {
      ...request.comparativeKrigingParameters,
    };
  }

  if (!krigingParameters) {
    return buildComparativeValidationNotApplicable(
      points,
      "Comparative interpolation validation requires fixed Kriging parameters. For a non-Kriging surface, provide comparativeKrigingParameters explicitly.",
    );
  }

  const comparativeOptions =
    request.comparativeValidationOptions ??
    {};

  try {
    const result =
      comparativeValidationService.runComparativeValidation({
        samples: points,

        kriging: {
          parameters: {
            ...krigingParameters,
          },

          options:
            comparativeOptions.kriging ??
            request.krigingCrossValidationOptions ??
            {},
        },

        idwOptions:
          comparativeOptions.idw ??
          request.idwCrossValidationOptions ??
          {},

        splineOptions:
          comparativeOptions.spline ??
          request.splineCrossValidationOptions ??
          {},

        nearestNeighbourOptions:
          comparativeOptions.nearest_neighbour ??
          request.nearestNeighbourCrossValidationOptions ??
          {},
      });

    if (
      !result ||
      typeof result !== "object"
    ) {
      return buildComparativeValidationFailure(
        points,
        "Comparative interpolation validation returned an invalid result.",
      );
    }

    return {
      ...result,

      requested: true,

      validationType:
        result.validationType ??
        COMPARATIVE_VALIDATION_TYPE,

      diagnosticType:
        result.diagnosticType ??
        "loocv",

      applicable:
        result.success === true ||
        result.status ===
          "completed_with_failures",
    };
  } catch (error) {
    return buildComparativeValidationFailure(
      points,
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

// ============================================================
// PHASE 12.9 — COMPARATIVE INTERPOLATION ANALYSIS
// ============================================================
//
// Comparative analysis consumes the already-generated
// Phase 12.8 comparative-validation result.
//
// It does NOT execute LOOCV again.
//
// Analysis remains diagnostic-only.
//
// ============================================================

function buildComparativeAnalysisNotRequested() {
  return {
    success: true,
    status: "not_requested",
    analysisType:
      comparativeAnalysisService.ANALYSIS_TYPE,
    diagnosticType:
      comparativeAnalysisService.DIAGNOSTIC_TYPE,
    sampleCount: null,
    methods: {},
    predictionConsistency: {
      commonSuccessfulFoldCount: 0,
      commonFailedFoldCount: 0,
      commonSuccessfulFolds: [],
      commonFailedFolds: [],
    },
    methodDifferences: {},
    errors: [],
  };
}

function buildComparativeAnalysisFailure(
  comparativeValidation,
  error,
) {
  return {
    success: false,
    status: "failed",
    analysisType:
      comparativeAnalysisService.ANALYSIS_TYPE,
    diagnosticType:
      comparativeAnalysisService.DIAGNOSTIC_TYPE,
    sampleCount:
      comparativeValidation?.sampleCount ??
      null,
    methods: {},
    predictionConsistency: {
      commonSuccessfulFoldCount: 0,
      commonFailedFoldCount: 0,
      commonSuccessfulFolds: [],
      commonFailedFolds: [],
    },
    methodDifferences: {},
    errors: [error],
  };
}

function runComparativeInterpolationAnalysis(
  comparativeValidation,
  request = {},
) {
  if (
    !request ||
    request.runComparativeValidation !== true
  ) {
    return buildComparativeAnalysisNotRequested();
  }

  try {
    return comparativeAnalysisService
      .analyzeComparativeValidation(
        comparativeValidation,
        request.comparativeAnalysisOptions ??
          {},
      );
  } catch (error) {
    return buildComparativeAnalysisFailure(
      comparativeValidation,
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

// ============================================================
// GENERATE SURFACE
// ============================================================

async function generateInterpolationSurface(
  request = {},
) {
  const prepared =
    await prepareInterpolation(
      request,
    );

  if (!prepared.success) {
    return prepared;
  }

  // ==========================================================
  // PHASE 12.6.6
  // ==========================================================

  const splineCrossValidation =
    runSplineCrossValidation(
      prepared.method,
      prepared.points,
      request,
    );

  // ==========================================================
  // PHASE 12.7.6
  //
  // Diagnostic only.
  // Execute once per surface before grid construction.
  // ==========================================================

  const nearestNeighbourCrossValidation =
    runNearestNeighbourCrossValidation(
      prepared.method,
      prepared.points,
      request,
    );

  // ==========================================================
  // PHASE 12.8.5
  //
  // Comparative validation is diagnostic-only and opt-in.
  //
  // It is executed before grid construction so it remains
  // independent of the generated surface.
  //
  // It never changes interpolation parameters or grid values.
  // ==========================================================

  const comparativeValidation =
    runComparativeInterpolationValidation(
      prepared.method,
      prepared.points,
      request,
      prepared.interpolationParameters,
    );

  // ==========================================================
  // PHASE 12.9
  //
  // Comparative analysis consumes the Phase 12.8 result.
  //
  // No additional LOOCV execution occurs.
  // ==========================================================

  const comparativeAnalysis =
    runComparativeInterpolationAnalysis(
      comparativeValidation,
      request,
    );

  // ==========================================================
  // GRID
  // ==========================================================

  const grid =
    buildInterpolationGrid(
      prepared.spatialExtent,
      prepared.resolution,
      prepared.points,
      prepared.method,
      prepared.power,
      prepared.interpolationParameters,
    );

  const statistics =
    calculateSurfaceStatistics(
      grid.cells,
    );

  const configuration =
    buildInterpolationConfiguration({
      parameter:
        prepared.parameter,
      method:
        prepared.method,
      power:
        prepared.power,
      resolution:
        prepared.resolution,
      sampleCount:
        prepared.sampleCount,
      extent:
        prepared.spatialExtent,
    });

  return {
    success: true,

    apiPhase: API_PHASE,

    parameter:
      prepared.parameter,

    method:
      prepared.method,

    configuration,

    spatialExtent:
      prepared.spatialExtent,

    sampleCount:
      prepared.sampleCount,

    grid,

    statistics,

    interpolationParameters:
      prepared.interpolationParameters,

    krigingValidation:
      prepared.krigingValidation,

    krigingAcceptance:
      prepared.krigingAcceptance,

    krigingReadiness:
      prepared.krigingReadiness,

    splineCrossValidation,

    nearestNeighbourCrossValidation,

    comparativeValidation,

    comparativeAnalysis,

    message:
      buildInterpolationSuccessMessage(
        prepared.method,
      ),
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  API_PHASE,

  SUPPORTED_PARAMETERS,
  SUPPORTED_METHODS,

  DEFAULT_POWER,
  MIN_POWER,
  MAX_POWER,

  DEFAULT_RESOLUTION,
  MIN_RESOLUTION,
  MAX_RESOLUTION,

  MIN_SAMPLE_COUNTS,

  MIN_SPLINE_LOOCV_SAMPLE_COUNT,

  MIN_NEAREST_NEIGHBOUR_LOOCV_SAMPLE_COUNT,

  COMPARATIVE_VALIDATION_TYPE,
  COMPARATIVE_VALIDATION_STATUS_NOT_REQUESTED,

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

  validateInterpolationSampleCount,

  resolveInterpolationParameters,
  prepareInterpolation,

  runSplineCrossValidation,
  runNearestNeighbourCrossValidation,

  runComparativeInterpolationValidation,
  runComparativeInterpolationAnalysis,

  generateInterpolationSurface,
};
