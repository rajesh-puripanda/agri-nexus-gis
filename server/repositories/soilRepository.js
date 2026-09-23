// ============================================================
// server/repositories/soilRepository.js
// ============================================================
//
// Soil Analysis GIS
//
// Repository responsible ONLY for database persistence.
//
// ============================================================

const { pool } = require("../config/db");

// ============================================================
// CREATE
// ============================================================

async function createSoilSample(sample) {
  const sql = `
        INSERT INTO soil_samples (
            sample_code,
            latitude,
            longitude,
            depth_from_cm,
            depth_to_cm,
            sample_date,
            ph,
            nitrogen,
            phosphorus,
            potassium,
            organic_carbon,
            electrical_conductivity,
            soil_texture
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    sample.sample_code,
    sample.latitude,
    sample.longitude,
    sample.depth_from_cm,
    sample.depth_to_cm,
    sample.sample_date,
    sample.ph,
    sample.nitrogen,
    sample.phosphorus,
    sample.potassium,
    sample.organic_carbon,
    sample.electrical_conductivity,
    sample.soil_texture,
  ];

  const [result] = await pool.execute(sql, values);

  return getSoilSampleById(result.insertId);
}

// ============================================================
// GET ALL
// ============================================================

async function getAllSoilSamples() {
  const sql = `
        SELECT
            id,
            sample_code,
            latitude,
            longitude,
            depth_from_cm,
            depth_to_cm,
            sample_date,
            ph,
            nitrogen,
            phosphorus,
            potassium,
            organic_carbon,
            electrical_conductivity,
            soil_texture,
            created_at,
            updated_at
        FROM soil_samples
        ORDER BY id DESC
    `;

  const [rows] = await pool.execute(sql);

  return rows;
}

// ============================================================
// GET BY ID
// ============================================================

async function getSoilSampleById(id) {
  const sql = `
        SELECT
            id,
            sample_code,
            latitude,
            longitude,
            depth_from_cm,
            depth_to_cm,
            sample_date,
            ph,
            nitrogen,
            phosphorus,
            potassium,
            organic_carbon,
            electrical_conductivity,
            soil_texture,
            created_at,
            updated_at
        FROM soil_samples
        WHERE id = ?
    `;

  const [rows] = await pool.execute(sql, [id]);

  return rows.length > 0 ? rows[0] : null;
}

// ============================================================
// UPDATE
// ============================================================

async function updateSoilSample(id, sample) {
  const sql = `
        UPDATE soil_samples
        SET
            sample_code = ?,
            latitude = ?,
            longitude = ?,
            depth_from_cm = ?,
            depth_to_cm = ?,
            sample_date = ?,
            ph = ?,
            nitrogen = ?,
            phosphorus = ?,
            potassium = ?,
            organic_carbon = ?,
            electrical_conductivity = ?,
            soil_texture = ?
        WHERE id = ?
    `;

  const values = [
    sample.sample_code,
    sample.latitude,
    sample.longitude,
    sample.depth_from_cm,
    sample.depth_to_cm,
    sample.sample_date,
    sample.ph,
    sample.nitrogen,
    sample.phosphorus,
    sample.potassium,
    sample.organic_carbon,
    sample.electrical_conductivity,
    sample.soil_texture,
    id,
  ];

  const [result] = await pool.execute(sql, values);

  if (result.affectedRows === 0) {
    return null;
  }

  return getSoilSampleById(id);
}

// ============================================================
// DELETE
// ============================================================

async function deleteSoilSample(id) {
  const sql = `
        DELETE FROM soil_samples
        WHERE id = ?
    `;

  const [result] = await pool.execute(sql, [id]);

  return result.affectedRows > 0;
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
