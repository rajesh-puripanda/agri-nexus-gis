"use strict";

// ============================================================
// server/repositories/historicalRepository.js
// Soil Analysis GIS — Phase 10.4.1
// Historical Comparison Data Access
// ============================================================

const { pool } = require("../config/db");

async function getHistoricalDatasetByCode(datasetCode) {
  const sql = `
    SELECT
      id,
      dataset_code,
      dataset_name,
      publication_year,
      status
    FROM historical_datasets
    WHERE dataset_code = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [datasetCode]);

  return rows.length > 0 ? rows[0] : null;
}

async function getHistoricalSiteObservations(datasetCode, mandal, siteNo) {
  const sql = `
    SELECT
      hs.id,
      hs.dataset_id,
      hd.dataset_code,
      hd.dataset_name,
      hd.publication_year,
      hd.status,
      hs.sample_code,
      hs.mandal,
      hs.village,
      hs.site_no,
      hs.latitude,
      hs.longitude,

      CASE LOWER(TRIM(hs.stage))
        WHEN 'before' THEN 'Before sowing'
        WHEN 'during' THEN 'During growth'
        WHEN 'after' THEN 'After harvesting'
        ELSE hs.stage
      END AS stage,

      hs.collection_period_start,
      hs.collection_period_end,
      hs.depth_from_cm,
      hs.depth_to_cm,
      hs.source_status,
      hs.exclusion_reason,

      ho.id AS observation_id,
      ho.ph,
      ho.nitrogen,
      ho.phosphorus,
      ho.potassium,
      ho.organic_carbon,
      ho.electrical_conductivity

    FROM historical_samples hs

    INNER JOIN historical_datasets hd
      ON hd.id = hs.dataset_id

    LEFT JOIN historical_observations ho
      ON ho.historical_sample_id = hs.id

    WHERE hd.dataset_code = ?
      AND LOWER(TRIM(hs.mandal)) = LOWER(TRIM(?))
      AND hs.site_no = ?

    ORDER BY hs.collection_period_start, hs.id
  `;

  const [rows] = await pool.execute(sql, [datasetCode, mandal, siteNo]);

  return rows;
}

async function getHistoricalSiteExclusions(datasetCode, mandal, siteNo) {
  const sql = `
    SELECT
      he.id,
      hd.dataset_code,
      he.source_sample_reference,
      he.mandal,
      he.site_no,
      he.stage,
      he.reason
    FROM historical_exclusions he
    INNER JOIN historical_datasets hd
      ON hd.id = he.dataset_id
    WHERE hd.dataset_code = ?
      AND LOWER(TRIM(he.mandal)) = LOWER(TRIM(?))
      AND he.site_no = ?
    ORDER BY he.id
  `;

  const [rows] = await pool.execute(sql, [datasetCode, mandal, siteNo]);

  return rows;
}

// ============================================================
// GET HISTORICAL SPATIAL CANDIDATES
// ============================================================
//
// Phase 10.4.5.1
//
// Retrieves historical observations for spatial candidate
// discovery.
//
// This function does NOT:
//   - calculate distance
//   - determine spatial compatibility
//   - determine depth compatibility
//   - perform historical comparison calculations
//   - perform scientific classification
//
// Candidate grouping and spatial/depth interpretation remain
// the responsibility of the historical candidate service.
//
// ============================================================

async function getHistoricalSpatialCandidates() {
  const sql = `
    SELECT
      hs.id,
      hs.dataset_id,

      hd.dataset_code,
      hd.dataset_name,
      hd.publication_year,
      hd.status AS dataset_status,

      hs.sample_code,
      hs.mandal,
      hs.village,
      hs.site_no,

      hs.latitude,
      hs.longitude,

      CASE LOWER(TRIM(hs.stage))
        WHEN 'before' THEN 'Before sowing'
        WHEN 'during' THEN 'During growth'
        WHEN 'after' THEN 'After harvesting'
        ELSE hs.stage
      END AS stage,

      hs.collection_period_start,
      hs.collection_period_end,

      hs.depth_from_cm,
      hs.depth_to_cm,

      hs.source_status,
      hs.exclusion_reason

    FROM historical_samples hs
    INNER JOIN historical_datasets hd
      ON hd.id = hs.dataset_id

    WHERE NOT EXISTS (
      SELECT 1
      FROM historical_exclusions he
      WHERE he.dataset_id = hs.dataset_id
        AND LOWER(TRIM(he.mandal)) = LOWER(TRIM(hs.mandal))
        AND he.site_no = hs.site_no
    )

    ORDER BY
      hd.dataset_code,
      hs.mandal,
      hs.site_no,
      hs.collection_period_start,
      hs.id
  `;

  const [rows] = await pool.execute(sql, []);

  return rows;
}

module.exports = {
  getHistoricalDatasetByCode,
  getHistoricalSiteObservations,
  getHistoricalSiteExclusions,
  getHistoricalSpatialCandidates,
};
