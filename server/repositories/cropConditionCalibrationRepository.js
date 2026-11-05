"use strict";

// ============================================================
// server/repositories/cropConditionCalibrationRepository.js
// AgriNexus GIS — Phase C.3
// Crop Condition Calibration Registry
// ============================================================

const { pool } = require("../config/db");
function parseCalibrationJson(value) {
  return typeof value === "string"
    ? JSON.parse(value)
    : value;
}
async function rollbackSafely(connection, error) {
  try {
    await connection.rollback();
  } catch (rollbackError) {
    error.rollbackError = rollbackError;
  }
}

async function registerCalibration(calibration, actorId = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sql = `
      INSERT INTO crop_condition_calibrations (
        calibration_id,
        crop_code,
        index_code,
        sensor,
        season,
        status,
        calibration_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(sql, [
      calibration.calibrationId,
      calibration.crop.cropCode,
      calibration.indexContext.indexCode,
      calibration.indexContext.sensor ?? null,
      calibration.season,
      "proposed",
      JSON.stringify({
        ...calibration,
        status: "proposed",
      }),
    ]);

    const historySql = `
      INSERT INTO crop_condition_calibration_history (
        calibration_id,
        action,
        previous_status,
        new_status,
        actor_id,
        decision_reason
      )
      VALUES (?, 'registered', NULL, 'proposed', ?, ?)
    `;

    await connection.execute(historySql, [
      calibration.calibrationId,
      actorId,
      "Calibration registered.",
    ]);

    await connection.commit();

    return {
      calibrationId: calibration.calibrationId,
      status: "proposed",
    };
  } catch (error) {
    await rollbackSafely(connection, error);
    throw error;
  } finally {
    connection.release();
  }
}

async function getCalibration(calibrationId) {
  const sql = `
    SELECT
      calibration_id,
      status,
      calibration_json,
      created_at,
      updated_at
    FROM crop_condition_calibrations
    WHERE calibration_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [calibrationId]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

    return {
    calibrationId: row.calibration_id,
    status: row.status,
    calibration: parseCalibrationJson(row.calibration_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCalibrationHistory(calibrationId) {
  const sql = `
    SELECT
      action,
      previous_status,
      new_status,
      actor_id,
      decision_reason,
      decision_evidence,
      recorded_at
    FROM crop_condition_calibration_history
    WHERE calibration_id = ?
    ORDER BY recorded_at ASC, id ASC
  `;

  const [rows] = await pool.execute(sql, [calibrationId]);

return rows.map((row) => ({
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    actorId: row.actor_id,
    reason: row.decision_reason,
    evidence: row.decision_evidence,
    recordedAt: row.recorded_at,
    }));
}

async function listCalibrations(filters = {}) {
  const conditions = [];
  const params = [];

  const filterMap = {
    cropCode: "crop_code",
    indexCode: "index_code",
    sensor: "sensor",
    season: "season",
    status: "status",
  };

  for (const [key, column] of Object.entries(filterMap)) {
    if (filters[key] !== undefined && filters[key] !== null) {
      conditions.push(`${column} = ?`);
      params.push(filters[key]);
    }
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const sql = `
    SELECT
      calibration_id,
      crop_code,
      index_code,
      sensor,
      season,
      status,
      created_at,
      updated_at
    FROM crop_condition_calibrations
    ${whereClause}
    ORDER BY created_at DESC, id DESC
  `;

  const [rows] = await pool.execute(sql, params);

  return rows.map((row) => ({
    calibrationId: row.calibration_id,
    cropCode: row.crop_code,
    indexCode: row.index_code,
    sensor: row.sensor,
    season: row.season,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function recordValidationDecision({
  calibrationId,
  decision,
  actorId = null,
  reason,
  evidence,
}) {
  if (!["validated", "validation_rejected"].includes(decision)) {
    throw new TypeError("Invalid calibration validation decision.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    throw new TypeError("A decision reason is required.");
  }

  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence)
  ) {
    throw new TypeError("Decision evidence must be an object.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
        SELECT status, calibration_json
        FROM crop_condition_calibrations
        WHERE calibration_id = ?
        FOR UPDATE
      `,
      [calibrationId],
    );

    if (rows.length === 0) {
      throw new Error("Calibration not found.");
    }

    const row = rows[0];

    if (row.status !== "proposed") {
      throw new Error(
        `Cannot review calibration with status "${row.status}".`,
      );
    }

    const calibration = parseCalibrationJson(
      row.calibration_json,
    );

    if (
      !calibration ||
      calibration.status !== "proposed"
    ) {
      throw new Error(
        "Calibration JSON status is inconsistent with registry status.",
      );
    }

    const newStatus =
      decision === "validated" ? "validated" : "proposed";

    calibration.status = newStatus;

    await connection.execute(
      `
        UPDATE crop_condition_calibrations
        SET status = ?, calibration_json = ?
        WHERE calibration_id = ?
      `,
      [
        newStatus,
        JSON.stringify(calibration),
        calibrationId,
      ],
    );

    await connection.execute(
      `
        INSERT INTO crop_condition_calibration_history (
          calibration_id,
          action,
          previous_status,
          new_status,
          actor_id,
          decision_reason,
          decision_evidence
        )
        VALUES (?, ?, 'proposed', ?, ?, ?, ?)
      `,
      [
        calibrationId,
        decision,
        newStatus,
        actorId,
        reason.trim(),
        JSON.stringify(evidence),
      ],
    );

    await connection.commit();

    return {
      calibrationId,
      previousStatus: "proposed",
      status: newStatus,
      decision,
    };
  } catch (error) {
    await rollbackSafely(connection, error);
    throw error;
  } finally {
    connection.release();
  }
}

async function retireCalibration({
  calibrationId,
  actorId = null,
  reason,
}) {
  if (typeof reason !== "string" || !reason.trim()) {
    throw new TypeError("A retirement reason is required.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
        SELECT status, calibration_json
        FROM crop_condition_calibrations
        WHERE calibration_id = ?
        FOR UPDATE
      `,
      [calibrationId],
    );

    if (rows.length === 0) {
      throw new Error("Calibration not found.");
    }

    const row = rows[0];

    if (row.status !== "validated") {
      throw new Error(
        `Cannot retire calibration with status "${row.status}".`,
      );
    }

    const calibration = parseCalibrationJson(
      row.calibration_json,
    );

    if (
      !calibration ||
      calibration.status !== "validated"
    ) {
      throw new Error(
        "Calibration JSON status is inconsistent with registry status.",
      );
    }

    calibration.status = "retired";

    await connection.execute(
      `
        UPDATE crop_condition_calibrations
        SET status = 'retired', calibration_json = ?
        WHERE calibration_id = ?
      `,
      [JSON.stringify(calibration), calibrationId],
    );

    await connection.execute(
      `
        INSERT INTO crop_condition_calibration_history (
          calibration_id,
          action,
          previous_status,
          new_status,
          actor_id,
          decision_reason
        )
        VALUES (?, 'retired', 'validated', 'retired', ?, ?)
      `,
      [calibrationId, actorId, reason.trim()],
    );

    await connection.commit();

    return {
      calibrationId,
      previousStatus: "validated",
      status: "retired",
    };
  } catch (error) {
    await rollbackSafely(connection, error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  registerCalibration,
  getCalibration,
  getCalibrationHistory,
  listCalibrations,
  recordValidationDecision,
  retireCalibration,
};