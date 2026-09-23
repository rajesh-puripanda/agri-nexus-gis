// ============================================================
// server/controllers/soilController.js
// ============================================================
//
// Soil Analysis GIS
//
// Controller responsible for HTTP request/response handling.
//
// ============================================================

const soilRepository = require("../repositories/soilRepository");

// ============================================================
// VALIDATION
// ============================================================

function validateSoilSample(data) {
  const errors = [];

  if (!data.sample_code) {
    errors.push("sample_code is required");
  }

  if (
    data.latitude === undefined ||
    data.latitude === null ||
    data.latitude === ""
  ) {
    errors.push("latitude is required");
  }

  if (
    data.longitude === undefined ||
    data.longitude === null ||
    data.longitude === ""
  ) {
    errors.push("longitude is required");
  }

  if (
    data.latitude !== undefined &&
    (Number(data.latitude) < -90 || Number(data.latitude) > 90)
  ) {
    errors.push("latitude must be between -90 and 90");
  }

  if (
    data.longitude !== undefined &&
    (Number(data.longitude) < -180 || Number(data.longitude) > 180)
  ) {
    errors.push("longitude must be between -180 and 180");
  }

  if (
    data.ph !== undefined &&
    data.ph !== null &&
    data.ph !== "" &&
    (!Number.isFinite(Number(data.ph)) ||
      Number(data.ph) < 0 ||
      Number(data.ph) > 14)
  ) {
    errors.push("ph must be a number between 0 and 14");
  }

  if (
    data.depth_from_cm !== undefined &&
    data.depth_from_cm !== null &&
    data.depth_from_cm !== "" &&
    Number(data.depth_from_cm) < 0
  ) {
    errors.push("depth_from_cm cannot be negative");
  }

  if (
    data.depth_to_cm !== undefined &&
    data.depth_to_cm !== null &&
    data.depth_to_cm !== "" &&
    Number(data.depth_to_cm) < 0
  ) {
    errors.push("depth_to_cm cannot be negative");
  }

  if (
    data.depth_from_cm !== undefined &&
    data.depth_to_cm !== undefined &&
    data.depth_from_cm !== null &&
    data.depth_to_cm !== null &&
    Number(data.depth_to_cm) < Number(data.depth_from_cm)
  ) {
    errors.push("depth_to_cm cannot be less than depth_from_cm");
  }

  return errors;
}

// ============================================================
// CREATE
// ============================================================

async function createSoilSample(req, res) {
  try {
    const errors = validateSoilSample(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const sample = await soilRepository.createSoilSample(req.body);

    return res.status(201).json({
      success: true,
      message: "Soil sample created successfully",
      data: sample,
    });
  } catch (error) {
    console.error("Create soil sample error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create soil sample",
      error: error.message,
    });
  }
}

// ============================================================
// GET ALL
// ============================================================

async function getAllSoilSamples(req, res) {
  try {
    const samples = await soilRepository.getAllSoilSamples();

    return res.json({
      success: true,
      count: samples.length,
      data: samples,
    });
  } catch (error) {
    console.error("Get soil samples error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve soil samples",
      error: error.message,
    });
  }
}

// ============================================================
// GET BY ID
// ============================================================

async function getSoilSampleById(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid soil sample ID",
      });
    }

    const sample = await soilRepository.getSoilSampleById(id);

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Soil sample not found",
      });
    }

    return res.json({
      success: true,
      data: sample,
    });
  } catch (error) {
    console.error("Get soil sample error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve soil sample",
      error: error.message,
    });
  }
}

// ============================================================
// UPDATE
// ============================================================

async function updateSoilSample(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid soil sample ID",
      });
    }

    const errors = validateSoilSample(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const sample = await soilRepository.updateSoilSample(id, req.body);

    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Soil sample not found",
      });
    }

    return res.json({
      success: true,
      message: "Soil sample updated successfully",
      data: sample,
    });
  } catch (error) {
    console.error("Update soil sample error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update soil sample",
      error: error.message,
    });
  }
}

// ============================================================
// DELETE
// ============================================================

async function deleteSoilSample(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid soil sample ID",
      });
    }

    const deleted = await soilRepository.deleteSoilSample(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Soil sample not found",
      });
    }

    return res.json({
      success: true,
      message: "Soil sample deleted successfully",
    });
  } catch (error) {
    console.error("Delete soil sample error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete soil sample",
      error: error.message,
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createSoilSample,
  getAllSoilSamples,
  getSoilSampleById,
  updateSoilSample,
  deleteSoilSample,
};
