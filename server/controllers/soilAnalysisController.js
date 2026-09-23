// ============================================================
// server/controllers/soilAnalysisController.js
// ============================================================
//
// Soil Analysis GIS
//
// Responsibility:
//   - Validate requested sample ID
//   - Retrieve soil sample
//   - Delegate soil analysis to services
//   - Delegate complete report generation to
//     soilAnalysisReportService
//   - Return calculated results as JSON
//
// IMPORTANT:
//   No classification thresholds belong in this controller.
//   No recommendation rules belong in this controller.
//   No crop suitability rules belong in this controller.
//   No management rules belong in this controller.
//
// Business rules remain in their respective services.
//
// ============================================================

"use strict";

// ============================================================
// REPOSITORY
// ============================================================

const soilRepository = require("../repositories/soilRepository");

// ============================================================
// SERVICES
// ============================================================

const soilAnalysisService = require("../services/soilAnalysisService");

const soilRecommendationService = require("../services/soilRecommendationService");

const cropSuitabilityService = require("../services/cropSuitabilityService");

const soilManagementService = require("../services/soilManagementService");

const soilAnalysisReportService =
  require("../services/reports/soilAnalysisReportService")

// ============================================================
// VALIDATE SAMPLE ID
// ============================================================

function validateSampleId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      success: false,
      message: "Invalid soil sample ID",
    });

    return null;
  }

  return id;
}

// ============================================================
// GET SOIL SAMPLE
// ============================================================

async function getSampleOrReturn404(id, res) {
  const sample = await soilRepository.getSoilSampleById(id);

  if (!sample) {
    res.status(404).json({
      success: false,
      message: "Soil sample not found",
    });

    return null;
  }

  return sample;
}

// ============================================================
// BUILD SAMPLE RESPONSE
// ============================================================
//
// Keeps the API response consistent across endpoints.
//
// ============================================================

function buildSampleResponse(sample) {
  return {
    id: sample.id,

    sample_code: sample.sample_code,

    latitude: sample.latitude,

    longitude: sample.longitude,

    depth_from_cm: sample.depth_from_cm,

    depth_to_cm: sample.depth_to_cm,

    sample_date: sample.sample_date,

    soil_texture: sample.soil_texture,
  };
}

// ============================================================
// BUILD COMPLETE ANALYSIS COMPONENTS
// ============================================================
//
// This function is retained for the existing
// /recommendations endpoint.
//
// The complete /report endpoint now delegates to
// soilAnalysisReportService.
//
// ============================================================

function buildAnalysisComponents(sample) {
  // ----------------------------------------------------------
  // 1. Laboratory classification
  // ----------------------------------------------------------

  const analysis = soilAnalysisService.analyzeSample(sample);

  // ----------------------------------------------------------
  // 2. Soil fertility interpretation
  // ----------------------------------------------------------

  const recommendations =
    soilRecommendationService.interpretSoilAnalysis(analysis);

  // ----------------------------------------------------------
  // 3. Crop suitability
  // ----------------------------------------------------------

  const cropSuitability = cropSuitabilityService.generateCropRecommendations(
    sample,
    analysis,
  );

  // ----------------------------------------------------------
  // 4. Soil management plan
  // ----------------------------------------------------------

  const managementPlan =
    soilManagementService.generateManagementPlan(recommendations);

  return {
    analysis,

    recommendations,

    cropSuitability,

    managementPlan,
  };
}

// ============================================================
// GET SOIL ANALYSIS BY SAMPLE ID
// ============================================================
//
// GET /api/soil-analysis/sample/:id
//
// Returns:
//   - soil sample information
//   - classified laboratory analysis
//
// ============================================================

async function getSoilAnalysisBySampleId(req, res) {
  try {
    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------

    const id = validateSampleId(req, res);

    if (id === null) {
      return;
    }

    // --------------------------------------------------------
    // Retrieve sample
    // --------------------------------------------------------

    const sample = await getSampleOrReturn404(id, res);

    if (!sample) {
      return;
    }

    // --------------------------------------------------------
    // Analyze sample
    // --------------------------------------------------------

    const analysis = soilAnalysisService.analyzeSample(sample);

    // --------------------------------------------------------
    // Return result
    // --------------------------------------------------------

    return res.json({
      success: true,

      data: {
        sample: buildSampleResponse(sample),

        analysis,
      },
    });
  } catch (error) {
    console.error("Soil analysis error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to analyze soil sample",

      error: error.message,
    });
  }
}

// ============================================================
// GET SOIL RECOMMENDATIONS BY SAMPLE ID
// ============================================================
//
// GET /api/soil-analysis/sample/:id/recommendations
//
// Returns:
//   - soil analysis
//   - fertility interpretation
//   - crop suitability
//   - soil management plan
//
// ============================================================

async function getSoilRecommendationsBySampleId(req, res) {
  try {
    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------

    const id = validateSampleId(req, res);

    if (id === null) {
      return;
    }

    // --------------------------------------------------------
    // Retrieve sample
    // --------------------------------------------------------

    const sample = await getSampleOrReturn404(id, res);

    if (!sample) {
      return;
    }

    // --------------------------------------------------------
    // Build analysis components
    // --------------------------------------------------------

    const { analysis, recommendations, cropSuitability, managementPlan } =
      buildAnalysisComponents(sample);

    // --------------------------------------------------------
    // Return recommendations
    // --------------------------------------------------------

    return res.json({
      success: true,

      data: {
        sample: buildSampleResponse(sample),

        analysis,

        recommendations,

        cropSuitability,

        managementPlan,
      },
    });
  } catch (error) {
    console.error("Soil recommendations error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to generate soil recommendations",

      error: error.message,
    });
  }
}

// ============================================================
// GET COMPLETE SOIL ANALYSIS REPORT
// ============================================================
//
// GET /api/soil-analysis/sample/:id/report
//
// This is the primary consolidated Soil Analysis endpoint.
//
// The controller performs only:
//   1. Request validation
//   2. Sample retrieval
//   3. Delegation to report service
//   4. HTTP response handling
//
// All report orchestration belongs to:
//     soilAnalysisReportService
//
// ============================================================

async function getSoilAnalysisReportBySampleId(req, res) {
  try {
    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------

    const id = validateSampleId(req, res);

    if (id === null) {
      return;
    }

    // --------------------------------------------------------
    // Retrieve sample
    // --------------------------------------------------------

    const sample = await getSampleOrReturn404(id, res);

    if (!sample) {
      return;
    }

    // --------------------------------------------------------
    // Build complete report
    // --------------------------------------------------------
    //
    // The report service is now responsible for coordinating:
    //
    //   soilAnalysisService
    //   soilRecommendationService
    //   cropSuitabilityService
    //   soilManagementService
    //
    // --------------------------------------------------------

    const report = soilAnalysisReportService.buildSoilAnalysisReport(sample);

    // --------------------------------------------------------
    // Return complete report
    // --------------------------------------------------------

    return res.json({
      success: true,

      data: report,
    });
  } catch (error) {
    console.error("Soil analysis report error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to generate soil analysis report",

      error: error.message,
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSoilAnalysisBySampleId,

  getSoilRecommendationsBySampleId,

  getSoilAnalysisReportBySampleId,

  buildSampleResponse,

  buildAnalysisComponents,
};
