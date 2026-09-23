// ============================================================
// server/services/soilRecommendationService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 5.1B — Soil Fertility Interpretation & Recommendations
//
// Responsibility:
//   - Interpret classified soil analysis
//   - Identify limiting nutrients
//   - Interpret soil reaction
//   - Interpret salinity
//   - Produce transparent management observations
//
// IMPORTANT:
//   - No HTTP logic
//   - No database logic
//   - No duplicated laboratory thresholds
//   - No crop suitability rules
//   - No fertilizer-rate calculations
//
// This service consumes:
//
//     soilAnalysisService.analyzeSample()
//
// Crop suitability is handled separately by:
//
//     cropSuitabilityService.js
//
// ============================================================

"use strict";

// ============================================================
// LIMITING NUTRIENTS
// ============================================================

function identifyLimitingNutrients(analysis) {
  if (!analysis || typeof analysis !== "object") {
    throw new Error("Soil analysis is required");
  }

  const limitingNutrients = [];

  const values = analysis.values || {};

  const nutrientDefinitions = [
    {
      key: "nitrogen",
      name: "Nitrogen",
    },

    {
      key: "phosphorus",
      name: "Phosphorus",
    },

    {
      key: "potassium",
      name: "Potassium",
    },

    {
      key: "organicCarbon",
      name: "Organic Carbon",
    },
  ];

  nutrientDefinitions.forEach((nutrient) => {
    const result = values[nutrient.key];

    if (result?.classification === "Low") {
      limitingNutrients.push({
        nutrient: nutrient.name,

        parameter: nutrient.key,

        classification: "Low",

        value: result.value ?? null,

        unit: result.unit ?? null,
      });
    }
  });

  return limitingNutrients;
}

// ============================================================
// SOIL REACTION
// ============================================================

function interpretSoilReaction(analysis) {
  if (!analysis || !analysis.values) {
    throw new Error("pH analysis is required");
  }

  if (!analysis.values.pH) {
    throw new Error("pH analysis is required");
  }

  const pH = analysis.values.pH;

  const classification = pH.classification;

  // ----------------------------------------------------------
  // Missing pH laboratory result
  // ----------------------------------------------------------

  if (classification === null || classification === undefined) {
    return {
      classification: null,

      value: pH.value ?? null,

      unit: pH.unit ?? null,

      interpretation:
        "Soil reaction interpretation is unavailable because pH was not provided.",
    };
  }

  // ----------------------------------------------------------
  // Valid classifications
  // ----------------------------------------------------------

  switch (classification) {
    case "Acidic":
      return {
        classification: "Acidic",

        value: pH.value,

        unit: pH.unit,

        interpretation:
          "Soil reaction is acidic. Acid-sensitive crops may require careful management.",
      };

    case "Neutral":
      return {
        classification: "Neutral",

        value: pH.value,

        unit: pH.unit,

        interpretation:
          "Soil reaction is generally favorable for a wide range of crops.",
      };

    case "Alkaline":
      return {
        classification: "Alkaline",

        value: pH.value,

        unit: pH.unit,

        interpretation:
          "Soil reaction is alkaline. Nutrient availability should be monitored.",
      };

    default:
      throw new Error(
        `Unsupported soil reaction classification: ${classification}`,
      );
  }
}

// ============================================================
// SALINITY
// ============================================================

function interpretSalinity(analysis) {
  if (!analysis || !analysis.values) {
    throw new Error("Electrical conductivity analysis is required");
  }

  if (!analysis.values.electricalConductivity) {
    throw new Error("Electrical conductivity analysis is required");
  }

  const ec = analysis.values.electricalConductivity;

  const classification = ec.classification;

  // ----------------------------------------------------------
  // Missing EC laboratory result
  // ----------------------------------------------------------

  if (classification === null || classification === undefined) {
    return {
      classification: null,

      value: ec.value ?? null,

      unit: ec.unit ?? null,

      interpretation:
        "Salinity interpretation is unavailable because electrical conductivity was not provided.",
    };
  }

  // ----------------------------------------------------------
  // Valid classifications
  // ----------------------------------------------------------

  switch (classification) {
    case "Non-saline":
      return {
        classification: "Non-saline",

        value: ec.value,

        unit: ec.unit,

        interpretation:
          "Electrical conductivity indicates no significant salinity concern.",
      };

    case "Very slightly saline":
      return {
        classification: "Very slightly saline",

        value: ec.value,

        unit: ec.unit,

        interpretation:
          "Slight salinity is present. Monitor irrigation and drainage practices.",
      };

    case "Moderately saline":
      return {
        classification: "Moderately saline",

        value: ec.value,

        unit: ec.unit,

        interpretation:
          "Moderate salinity is present and may affect sensitive crops.",
      };

    case "Strongly saline":
      return {
        classification: "Strongly saline",

        value: ec.value,

        unit: ec.unit,

        interpretation:
          "High salinity is present and requires appropriate soil and water management.",
      };

    default:
      throw new Error(`Unsupported salinity classification: ${classification}`);
  }
}

// ============================================================
// NUTRIENT INTERPRETATION
// ============================================================

function interpretNutrients(analysis) {
  if (!analysis || !analysis.values) {
    throw new Error("Soil analysis values are required");
  }

  const nutrientDefinitions = [
    {
      key: "nitrogen",
      name: "Nitrogen",
    },

    {
      key: "phosphorus",
      name: "Phosphorus",
    },

    {
      key: "potassium",
      name: "Potassium",
    },

    {
      key: "organicCarbon",
      name: "Organic Carbon",
    },
  ];

  return nutrientDefinitions.map((nutrient) => {
    const result = analysis.values[nutrient.key];

    return {
      nutrient: nutrient.name,

      parameter: nutrient.key,

      value: result?.value ?? null,

      unit: result?.unit ?? null,

      classification: result?.classification ?? null,
    };
  });
}

// ============================================================
// MANAGEMENT OBSERVATIONS
// ============================================================

function generateManagementObservations(
  analysis,
  limitingNutrients,
  soilReaction,
  salinity,
) {
  const observations = [];

  // ----------------------------------------------------------
  // Nutrients
  // ----------------------------------------------------------

  if (limitingNutrients.length === 0) {
    observations.push(
      "No Low major fertility parameter was identified from the available laboratory results.",
    );
  } else {
    limitingNutrients.forEach((item) => {
      observations.push(
        `${item.nutrient} is classified as Low and should be considered a limiting fertility parameter.`,
      );
    });
  }

  // ----------------------------------------------------------
  // Soil reaction
  // ----------------------------------------------------------

  if (soilReaction.classification === "Acidic") {
    observations.push(
      "Soil acidity should be considered when selecting crops and planning nutrient management.",
    );
  }

  if (soilReaction.classification === "Alkaline") {
    observations.push(
      "Alkalinity should be considered because it can influence nutrient availability.",
    );
  }

  if (
    soilReaction.classification === null ||
    soilReaction.classification === undefined
  ) {
    observations.push(
      "Soil reaction could not be assessed because pH data is unavailable.",
    );
  }

  // ----------------------------------------------------------
  // Salinity
  // ----------------------------------------------------------

  if (
    salinity.classification !== null &&
    salinity.classification !== undefined &&
    salinity.classification !== "Non-saline"
  ) {
    observations.push(
      "Electrical conductivity indicates some degree of salinity and should be considered in soil and irrigation management.",
    );
  }

  if (
    salinity.classification === null ||
    salinity.classification === undefined
  ) {
    observations.push(
      "Salinity could not be assessed because electrical conductivity data is unavailable.",
    );
  }

  // ----------------------------------------------------------
  // Overall fertility
  // ----------------------------------------------------------

  switch (analysis.overallFertility) {
    case "Low":
      observations.push(
        "Overall fertility is classified as Low based on the current laboratory interpretation.",
      );
      break;

    case "Moderate / Good":
      observations.push(
        "Overall fertility is classified as Moderate / Good based on the current laboratory interpretation.",
      );
      break;

    case "High":
      observations.push(
        "Overall fertility is classified as High based on the current laboratory interpretation.",
      );
      break;

    default:
      observations.push("Overall fertility classification is not available.");
      break;
  }

  return observations;
}

// ============================================================
// COMPLETE SOIL INTERPRETATION
// ============================================================

function interpretSoilAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") {
    throw new Error("Soil analysis is required");
  }

  if (!analysis.values || typeof analysis.values !== "object") {
    throw new Error("Soil analysis values are required");
  }

  const limitingNutrients = identifyLimitingNutrients(analysis);

  const soilReaction = interpretSoilReaction(analysis);

  const salinity = interpretSalinity(analysis);

  const nutrients = interpretNutrients(analysis);

  const managementObservations = generateManagementObservations(
    analysis,
    limitingNutrients,
    soilReaction,
    salinity,
  );

  return {
    overallFertility: analysis.overallFertility,

    limitingNutrients,

    nutrientStatus: nutrients,

    soilReaction,

    salinity,

    managementObservations,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  identifyLimitingNutrients,

  interpretSoilReaction,

  interpretSalinity,

  interpretNutrients,

  generateManagementObservations,

  interpretSoilAnalysis,
};
