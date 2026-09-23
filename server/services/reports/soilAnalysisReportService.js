// ============================================================
// server/services/reports/soilAnalysisReportService.js
// ============================================================

"use strict";

const soilAnalysisService = require("../soilAnalysisService");
const soilRecommendationService = require("../soilRecommendationService");
const cropSuitabilityService = require("../cropSuitabilityService");
const soilManagementService = require("../soilManagementService");

// ============================================================
// VALIDATE SOIL SAMPLE
// ============================================================
//
// A soil sample may contain incomplete laboratory results.
//
// Therefore this validation must NOT require:
//   - pH
//   - Nitrogen
//   - Phosphorus
//   - Potassium
//   - Organic Carbon
//   - Electrical Conductivity
//   - Soil Texture
//
// Those fields are allowed to be unavailable.
//
// However, an entirely empty object is not a valid soil sample.
//
// ============================================================

function validateSoilSample(sample) {
  if (!sample || typeof sample !== "object") {
    throw new Error("Soil sample is required");
  }

  const hasSampleIdentity = sample.id !== undefined && sample.id !== null;

  const hasSampleCode =
    sample.sample_code !== undefined &&
    sample.sample_code !== null &&
    String(sample.sample_code).trim() !== "";

  const hasLatitude =
    sample.latitude !== undefined &&
    sample.latitude !== null &&
    sample.latitude !== "";

  const hasLongitude =
    sample.longitude !== undefined &&
    sample.longitude !== null &&
    sample.longitude !== "";

  if (!hasSampleIdentity && !hasSampleCode && !hasLatitude && !hasLongitude) {
    throw new Error("Soil sample data is required");
  }
}

// ============================================================
// BUILD COMPLETE SOIL ANALYSIS REPORT
// ============================================================

function buildSoilAnalysisReport(sample) {
  // ----------------------------------------------------------
  // Validate sample structure
  // ----------------------------------------------------------

  validateSoilSample(sample);

  // ----------------------------------------------------------
  // 1. Laboratory classification
  // ----------------------------------------------------------

  const analysis = soilAnalysisService.analyzeSample(sample);

  // ----------------------------------------------------------
  // 2. Soil interpretation
  // ----------------------------------------------------------

  const recommendations =
    soilRecommendationService.interpretSoilAnalysis(analysis);

  // ----------------------------------------------------------
  // 3. Crop suitability
  // ----------------------------------------------------------

  const cropSuitability = cropSuitabilityService.evaluateCropSuitability(
    sample,
    analysis,
  );

  // ----------------------------------------------------------
  // 4. Soil management plan
  // ----------------------------------------------------------

  const managementPlan =
    soilManagementService.generateManagementPlan(recommendations);

  // ----------------------------------------------------------
  // 5. Consolidated report
  // ----------------------------------------------------------

  return {
    sample: {
      id: sample.id,
      sample_code: sample.sample_code,
      sample_date: sample.sample_date,

      location: {
        latitude: Number(sample.latitude),
        longitude: Number(sample.longitude),
      },

      depth: {
        from_cm: Number(sample.depth_from_cm),
        to_cm: Number(sample.depth_to_cm),
      },

      soil_texture: sample.soil_texture,
    },

    laboratoryResults: {
      ph:
        sample.ph !== null && sample.ph !== undefined && sample.ph !== ""
          ? Number(sample.ph)
          : null,

      nitrogen:
        sample.nitrogen !== null &&
        sample.nitrogen !== undefined &&
        sample.nitrogen !== ""
          ? Number(sample.nitrogen)
          : null,

      phosphorus:
        sample.phosphorus !== null &&
        sample.phosphorus !== undefined &&
        sample.phosphorus !== ""
          ? Number(sample.phosphorus)
          : null,

      potassium:
        sample.potassium !== null &&
        sample.potassium !== undefined &&
        sample.potassium !== ""
          ? Number(sample.potassium)
          : null,

      organicCarbon:
        sample.organic_carbon !== null &&
        sample.organic_carbon !== undefined &&
        sample.organic_carbon !== ""
          ? Number(sample.organic_carbon)
          : null,

      electricalConductivity:
        sample.electrical_conductivity !== null &&
        sample.electrical_conductivity !== undefined &&
        sample.electrical_conductivity !== ""
          ? Number(sample.electrical_conductivity)
          : null,
    },

    analysis,

    interpretation: recommendations,

    cropSuitability,

    managementPlan,

    reportMetadata: {
      generatedAt: new Date().toISOString(),
      version: "1.0",
    },
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  buildSoilAnalysisReport,
};
