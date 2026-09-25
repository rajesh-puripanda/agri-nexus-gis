"use strict";

// ============================================================
// AgriNexus GIS
// server/services/remoteSensing/indexCalculationService.js
// ============================================================
//
// Phase 13.6.1  Remote Sensing Scalar Calculation Core
//
// Calculates a single scalar spectral-index value from scalar
// band reflectance inputs.
//
// This service is intentionally independent of raster processing,
// spatial processing, database access, HTTP/API routes, and UI.
//
// Scientific index definitions remain authoritative for metadata,
// required bands, parameters, valid ranges, and interpretation.
//
// ============================================================

const {
  getIndexDefinition,
} = require("../../scientific/remoteSensing/indices/indexRegistry");

const {
  validateCalculationRequestAgainstRegistry,
} = require("../../scientific/remoteSensing/indices/indexCalculationContract");

function assertFiniteBandValue(bandName, value) {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Band ${bandName} must be a finite number.`
    );
  }
}

function calculateNormalizedDifference(
  numeratorBand,
  denominatorBand,
  numeratorName,
  denominatorName
) {
  assertFiniteBandValue(numeratorName, numeratorBand);
  assertFiniteBandValue(denominatorName, denominatorBand);

  const denominator =
    numeratorBand + denominatorBand;

  if (denominator === 0) {
    throw new Error(
      `Cannot calculate normalized difference: ` +
      `${numeratorName} + ${denominatorName} equals zero.`
    );
  }

  return (
    (numeratorBand - denominatorBand) /
    denominator
  );
}

function calculateNDVI(inputs) {
  return calculateNormalizedDifference(
    inputs.NIR,
    inputs.Red,
    "NIR",
    "Red"
  );
}

function calculateEVI(inputs, parameters) {
  assertFiniteBandValue("NIR", inputs.NIR);
  assertFiniteBandValue("Red", inputs.Red);
  assertFiniteBandValue("Blue", inputs.Blue);

  const G = parameters.G;
  const C1 = parameters.C1;
  const C2 = parameters.C2;
  const L = parameters.L;

  const denominator =
    inputs.NIR +
    C1 * inputs.Red -
    C2 * inputs.Blue +
    L;

  if (denominator === 0) {
    throw new Error(
      "Cannot calculate EVI: denominator equals zero."
    );
  }

  return (
    G *
    (inputs.NIR - inputs.Red) /
    denominator
  );
}

function calculateSAVI(inputs, parameters) {
  assertFiniteBandValue("NIR", inputs.NIR);
  assertFiniteBandValue("Red", inputs.Red);

  const L = parameters.L;

  const denominator =
    inputs.NIR +
    inputs.Red +
    L;

  if (denominator === 0) {
    throw new Error(
      "Cannot calculate SAVI: denominator equals zero."
    );
  }

  return (
    ((inputs.NIR - inputs.Red) / denominator) *
    (1 + L)
  );
}

function calculateGNDVI(inputs) {
  return calculateNormalizedDifference(
    inputs.NIR,
    inputs.Green,
    "NIR",
    "Green"
  );
}

function calculateARVI(inputs, parameters) {
  assertFiniteBandValue("NIR", inputs.NIR);
  assertFiniteBandValue("Red", inputs.Red);
  assertFiniteBandValue("Blue", inputs.Blue);

  const gamma = parameters.gamma;

  const correctedRed =
    inputs.Red -
    gamma * (inputs.Blue - inputs.Red);

  const denominator =
    inputs.NIR + correctedRed;

  if (denominator === 0) {
    throw new Error(
      "Cannot calculate ARVI: denominator equals zero."
    );
  }

  return (
    (inputs.NIR - correctedRed) /
    denominator
  );
}

function calculateNDWI(inputs) {
  return calculateNormalizedDifference(
    inputs.Green,
    inputs.NIR,
    "Green",
    "NIR"
  );
}

function calculateNDMI(inputs) {
  return calculateNormalizedDifference(
    inputs.NIR,
    inputs.SWIR,
    "NIR",
    "SWIR"
  );
}

function getDefaultParameters(definition) {
  return {
    ...(definition.parameters || {}),
  };
}

function calculateScalarIndex({
  indexCode,
  inputs,
  parameters,
}) {
  const definition = getIndexDefinition(indexCode);

  if (!definition) {
    throw new Error(
      `Unknown remote sensing index: ${indexCode}`
    );
  }

  const resolvedParameters = {
    ...getDefaultParameters(definition),
    ...(parameters || {}),
  };

  let value;

  switch (definition.code) {
    case "NDVI":
      value = calculateNDVI(inputs);
      break;

    case "EVI":
      value = calculateEVI(
        inputs,
        resolvedParameters
      );
      break;

    case "SAVI":
      value = calculateSAVI(
        inputs,
        resolvedParameters
      );
      break;

    case "GNDVI":
      value = calculateGNDVI(inputs);
      break;

    case "ARVI":
      value = calculateARVI(
        inputs,
        resolvedParameters
      );
      break;

    case "NDWI":
      value = calculateNDWI(inputs);
      break;

    case "NDMI":
      value = calculateNDMI(inputs);
      break;

    default:
      throw new Error(
        `No scalar calculation implementation for index: ${definition.code}`
      );
  }

  if (!Number.isFinite(value)) {
    throw new Error(
      `${definition.code} calculation produced a non-finite result.`
    );
  }

  const {
    min,
    max,
  } = definition.validRange;

  if (value < min || value > max) {
    throw new Error(
      `${definition.code} calculation result ${value} ` +
      `is outside the registered valid range [${min}, ${max}].`
    );
  }

  return value;
}

function calculateRemoteSensingIndex({
  indexCode,
  inputs,
  parameters,
}) {
  const validation =
    validateCalculationRequestAgainstRegistry({
      indexCode,
      inputs,
      parameters,
    });

  if (!validation.valid) {
    const error = new Error(
      validation.errors.join(" ")
    );

    error.validationErrors = validation.errors;

    throw error;
  }

  const value = calculateScalarIndex({
    indexCode: validation.indexCode,
    inputs,
    parameters,
  });

  return {
    indexCode: validation.indexCode,
    value,
    validRange: {
      ...validation.definition.validRange,
    },
  };
}

module.exports = {
  calculateScalarIndex,
  calculateRemoteSensingIndex,
};
