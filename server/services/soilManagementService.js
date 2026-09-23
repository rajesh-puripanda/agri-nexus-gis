// ============================================================
// server/services/soilManagementService.js
// ============================================================
//
// Soil Analysis GIS
//
// Phase 5.2A — Soil Management Recommendation Engine
//
// Responsibility:
//   - Convert soil interpretation results into general
//     management recommendations.
//   - Provide transparent, non-crop-specific management guidance.
//
// IMPORTANT:
//   - No HTTP logic
//   - No database logic
//   - No laboratory classification thresholds
//   - No crop-specific fertilizer recommendations
//   - No duplication of soil analysis rules
//
// This service consumes the output of:
//
//     soilRecommendationService.interpretSoilAnalysis()
//
// ============================================================

"use strict";

// ============================================================
// NUTRIENT MANAGEMENT
// ============================================================
//
// Recommendations are based on the classifications already
// produced by the Soil Analysis / Recommendation Engine.
//
// This service does NOT determine whether a nutrient is Low.
//
// ============================================================

function generateNutrientManagement(recommendations) {
  if (!recommendations || typeof recommendations !== "object") {
    throw new Error("Soil recommendations are required");
  }

  const nutrientStatus = Array.isArray(recommendations.nutrientStatus)
    ? recommendations.nutrientStatus
    : [];

  const limitingNutrients = Array.isArray(recommendations.limitingNutrients)
    ? recommendations.limitingNutrients
    : [];

  const actions = [];

  // ----------------------------------------------------------
  // No limiting nutrients
  // ----------------------------------------------------------

  if (limitingNutrients.length === 0) {
    actions.push(
      "No major nutrient limitation was identified from the current laboratory results.",
    );

    actions.push(
      "Maintain balanced nutrient management and periodically monitor soil fertility through soil testing.",
    );

    return actions;
  }

  // ----------------------------------------------------------
  // Limiting nutrients
  // ----------------------------------------------------------

  limitingNutrients.forEach((limiting) => {
    switch (limiting.parameter) {
      case "nitrogen":
        actions.push(
          "Nitrogen is identified as a limiting parameter. Appropriate nitrogen management should be considered based on crop requirements and local agronomic guidance.",
        );
        break;

      case "phosphorus":
        actions.push(
          "Phosphorus is identified as a limiting parameter. Appropriate phosphorus management should be considered based on crop requirements and local agronomic guidance.",
        );
        break;

      case "potassium":
        actions.push(
          "Potassium is identified as a limiting parameter. Appropriate potassium management should be considered based on crop requirements and local agronomic guidance.",
        );
        break;

      case "organicCarbon":
        actions.push(
          "Organic Carbon is identified as a limiting parameter. Practices that maintain or improve soil organic matter should be considered.",
        );
        break;

      default:
        actions.push(
          `${limiting.nutrient || "A soil fertility parameter"} is identified as limiting and should be considered in nutrient management planning.`,
        );
    }
  });

  // ----------------------------------------------------------
  // Medium nutrients
  // ----------------------------------------------------------

  const mediumNutrients = nutrientStatus.filter(
    (item) => item && item.classification === "Medium" && item.nutrient,
  );

  if (mediumNutrients.length > 0) {
    actions.push(
      "Nutrients classified as Medium should be maintained through balanced nutrient management rather than assuming a deficiency.",
    );
  }

  return actions;
}

// ============================================================
// SOIL REACTION MANAGEMENT
// ============================================================

function generateSoilReactionManagement(recommendations) {
  if (!recommendations || !recommendations.soilReaction) {
    throw new Error("Soil reaction interpretation is required");
  }

  const classification = recommendations.soilReaction.classification;

  // ----------------------------------------------------------
  // Missing pH
  // ----------------------------------------------------------
  //
  // A missing classification means the laboratory pH value was
  // not supplied. This is different from an invalid
  // classification and therefore must not be treated as an
  // unsupported value.
  //
  // ----------------------------------------------------------

  if (classification === null || classification === undefined) {
    return [
      "Soil reaction could not be assessed because pH data is unavailable.",
      "Soil pH should be obtained through laboratory testing before making soil-reaction-specific amendment decisions.",
      "Management decisions should consider available laboratory results together with local agronomic guidance.",
    ];
  }

  switch (classification) {
    case "Acidic":
      return [
        "Soil acidity should be considered when planning crop selection and nutrient management.",
        "Periodic monitoring of soil pH is recommended.",
        "Any soil amendment should be based on soil-test results and appropriate local agronomic guidance.",
      ];

    case "Neutral":
      return [
        "Soil reaction is generally favorable for a wide range of crops.",
        "Maintain current soil management practices and periodically monitor soil pH.",
      ];

    case "Alkaline":
      return [
        "Soil alkalinity should be considered because it can influence nutrient availability.",
        "Periodic monitoring of soil pH and nutrient availability is recommended.",
        "Any soil amendment should be based on soil-test results and appropriate local agronomic guidance.",
      ];

    default:
      throw new Error(
        `Unsupported soil reaction classification: ${classification}`,
      );
  }
}

// ============================================================
// SALINITY MANAGEMENT
// ============================================================

function generateSalinityManagement(recommendations) {
  if (!recommendations || !recommendations.salinity) {
    throw new Error("Salinity interpretation is required");
  }

  const classification = recommendations.salinity.classification;

  // ----------------------------------------------------------
  // Missing electrical conductivity
  // ----------------------------------------------------------

  if (classification === null || classification === undefined) {
    return [
      "Salinity could not be assessed because electrical conductivity data is unavailable.",
      "Electrical conductivity should be obtained through laboratory testing before making salinity-specific management decisions.",
      "Appropriate irrigation and drainage practices should be maintained.",
    ];
  }

  switch (classification) {
    case "Non-saline":
      return [
        "No significant salinity concern was identified from the current electrical conductivity result.",
        "Maintain appropriate irrigation and drainage practices.",
      ];

    case "Very slightly saline":
      return [
        "Slight salinity is present and should be monitored.",
        "Appropriate irrigation and drainage practices should be maintained to minimize salt accumulation.",
        "Periodic monitoring of electrical conductivity is recommended.",
      ];

    case "Moderately saline":
      return [
        "Moderate salinity is present and may affect sensitive crops.",
        "Irrigation water quality, drainage, and salt accumulation should be monitored.",
        "Periodic electrical conductivity testing is recommended.",
      ];

    case "Strongly saline":
      return [
        "High salinity is present and requires careful soil and water management.",
        "Drainage and irrigation practices should be reviewed with appropriate agronomic guidance.",
        "Regular monitoring of electrical conductivity is recommended.",
      ];

    default:
      throw new Error(`Unsupported salinity classification: ${classification}`);
  }
}

// ============================================================
// ORGANIC MATTER MANAGEMENT
// ============================================================

function generateOrganicMatterManagement(recommendations) {
  if (!recommendations || !Array.isArray(recommendations.nutrientStatus)) {
    throw new Error("Nutrient status is required");
  }

  const organicCarbon = recommendations.nutrientStatus.find(
    (item) => item && item.parameter === "organicCarbon",
  );

  if (!organicCarbon) {
    return [];
  }

  // ----------------------------------------------------------
  // Missing organic carbon
  // ----------------------------------------------------------

  if (
    organicCarbon.classification === null ||
    organicCarbon.classification === undefined
  ) {
    return [
      "Organic Carbon could not be assessed because the laboratory result is unavailable.",
      "Organic Carbon testing should be considered when evaluating soil organic matter status.",
      "Continue appropriate practices that maintain soil organic matter and protect soil structure.",
    ];
  }

  if (organicCarbon.classification === "Low") {
    return [
      "Organic Carbon is classified as Low. Practices that increase or maintain soil organic matter should be considered.",
      "Where locally appropriate, incorporation of crop residues, organic manures, compost, or other suitable organic inputs may help maintain soil organic matter.",
    ];
  }

  if (organicCarbon.classification === "Medium") {
    return [
      "Organic Carbon is classified as Medium. Continue practices that maintain soil organic matter and protect soil structure.",
    ];
  }

  return [
    "Organic Carbon is not classified as Low. Continue appropriate practices that maintain soil organic matter.",
  ];
}

// ============================================================
// OVERALL FERTILITY MANAGEMENT
// ============================================================

function generateOverallManagement(recommendations) {
  if (!recommendations || typeof recommendations !== "object") {
    throw new Error("Soil recommendations are required");
  }

  switch (recommendations.overallFertility) {
    case "Low":
      return [
        "Overall soil fertility is classified as Low based on the current laboratory interpretation.",
        "Priority should be given to addressing the identified limiting fertility parameters.",
        "Follow-up soil testing should be considered after appropriate soil management interventions.",
      ];

    case "Moderate / Good":
      return [
        "Overall soil fertility is classified as Moderate / Good.",
        "Maintain balanced nutrient management and continue periodic soil testing.",
      ];

    case "High":
      return [
        "Overall soil fertility is classified as High.",
        "Maintain current soil fertility through balanced nutrient management and appropriate soil conservation practices.",
        "Avoid unnecessary nutrient applications where soil testing does not indicate a requirement.",
      ];

    case "Unavailable":
      return [
        "Overall soil fertility could not be assessed because the available laboratory results are insufficient.",
        "Additional soil laboratory testing should be considered before making comprehensive fertility management decisions.",
      ];

    default:
      return [
        "Overall soil fertility could not be assigned a recognized management category.",
        "Refer to the laboratory analysis and obtain appropriate agronomic guidance.",
      ];
  }
}

// ============================================================
// GENERAL MANAGEMENT
// ============================================================

function generateGeneralManagement(recommendations) {
  if (!recommendations || typeof recommendations !== "object") {
    throw new Error("Soil recommendations are required");
  }

  const actions = [];

  actions.push(
    "Management decisions should consider the laboratory results together with crop requirements, irrigation conditions, soil texture, and local agronomic guidance.",
  );

  actions.push(
    "Periodic soil testing is recommended to monitor changes in soil fertility, reaction, and salinity.",
  );

  return actions;
}

// ============================================================
// COMPLETE MANAGEMENT PLAN
// ============================================================

function generateManagementPlan(recommendations) {
  if (!recommendations || typeof recommendations !== "object") {
    throw new Error("Soil recommendations are required");
  }

  const nutrientManagement = generateNutrientManagement(recommendations);

  const soilReactionManagement =
    generateSoilReactionManagement(recommendations);

  const salinityManagement = generateSalinityManagement(recommendations);

  const organicMatterManagement =
    generateOrganicMatterManagement(recommendations);

  const overallManagement = generateOverallManagement(recommendations);

  const generalManagement = generateGeneralManagement(recommendations);

  return {
    overallFertility: recommendations.overallFertility,

    nutrientManagement,

    organicMatterManagement,

    soilReactionManagement,

    salinityManagement,

    overallManagement,

    generalManagement,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  generateNutrientManagement,
  generateSoilReactionManagement,
  generateSalinityManagement,
  generateOrganicMatterManagement,
  generateOverallManagement,
  generateGeneralManagement,
  generateManagementPlan,
};
