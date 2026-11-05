
-- AgriNexus GIS — Phase C.3
-- Crop Condition Calibration Registry

USE soil_analysis_gis;

CREATE TABLE IF NOT EXISTS crop_condition_calibrations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    calibration_id VARCHAR(191) NOT NULL UNIQUE,
    crop_code VARCHAR(50) NOT NULL,
    index_code VARCHAR(50) NOT NULL,
    sensor VARCHAR(100) NULL,
    season VARCHAR(100) NOT NULL,

    status ENUM('proposed', 'validated', 'retired')
        NOT NULL DEFAULT 'proposed',

    calibration_json JSON NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_calibration_crop (crop_code),
    INDEX idx_calibration_index (index_code),
    INDEX idx_calibration_sensor (sensor),
    INDEX idx_calibration_season (season),
    INDEX idx_calibration_status (status)
);

CREATE TABLE IF NOT EXISTS crop_condition_calibration_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    calibration_id VARCHAR(191) NOT NULL,

    action ENUM(
        'registered',
        'validated',
        'validation_rejected',
        'retired'
    ) NOT NULL,

    previous_status ENUM('proposed', 'validated', 'retired') NULL,
    new_status ENUM('proposed', 'validated', 'retired') NOT NULL,

    actor_id VARCHAR(191) NULL,
    decision_reason TEXT NULL,
    decision_evidence JSON NULL,

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_calibration_history_id (calibration_id),
    INDEX idx_calibration_history_time (recorded_at),

    CONSTRAINT fk_calibration_history_registry
        FOREIGN KEY (calibration_id)
        REFERENCES crop_condition_calibrations (calibration_id)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
);