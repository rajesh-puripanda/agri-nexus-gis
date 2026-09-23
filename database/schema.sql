-- ============================================================
-- Soil Analysis GIS
-- Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS soil_analysis_gis;

USE soil_analysis_gis;

-- ============================================================
-- SOIL SAMPLES
-- ============================================================

CREATE TABLE IF NOT EXISTS soil_samples (
    id INT AUTO_INCREMENT PRIMARY KEY,

    sample_code VARCHAR(50) NOT NULL UNIQUE,

    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,

    depth_from_cm DECIMAL(6,2),
    depth_to_cm DECIMAL(6,2),

    sample_date DATE,

    ph DECIMAL(5,2),

    nitrogen DECIMAL(10,2),
    phosphorus DECIMAL(10,2),
    potassium DECIMAL(10,2),

    organic_carbon DECIMAL(6,3),

    electrical_conductivity DECIMAL(8,3),

    soil_texture VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);