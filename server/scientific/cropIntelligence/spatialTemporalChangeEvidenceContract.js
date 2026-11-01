"use strict";

// ============================================================
// AgriNexus GIS
//
// Spatial Temporal Change Evidence Contract
// Contract version: 1.0
//
// Defines pixel-wise spatial temporal change evidence.
//
// This contract does NOT:
//   - calculate temporal change
//   - read or write raster files
//   - calculate file checksums
//   - validate cache integrity
//   - interpret crop health or moisture stress
//   - define crop-specific thresholds
// ============================================================

const SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION = "1.0";

const EVIDENCE_TYPE = "SPATIAL_TEMPORAL_CHANGE";

const REQUIRED_FIELDS = [
    "contractVersion",
    "evidenceType",
    "identity",
    "spatialReference",
    "raster",
    "evidence",
    "processingContext"
];

const REQUIRED_GEO_KEYS = [
    "ProjectedCSTypeGeoKey",
    "GTRasterTypeGeoKey"
];

const EXPECTED_INDEX_CODE = "NDVI";
const EXPECTED_PRODUCT_CODE = "NDVI_TEMPORAL_CHANGE";
const EXPECTED_METHOD = "comparison_minus_baseline";
const EXPECTED_CALIBRATION_STATUS = "not_calibrated";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isNonEmptyString(value) {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
}

function isFiniteNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function isPositiveInteger(value) {
    return (
        Number.isSafeInteger(value) &&
        value > 0
    );
}

function isValidIsoDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function validateIdentity(identity) {
    const errors = [];

    if (!isPlainObject(identity)) {
        return ["identity must be a plain object."];
    }

    if (identity.indexCode !== EXPECTED_INDEX_CODE) {
        errors.push('identity.indexCode must be "NDVI".');
    }

    for (const role of ["baseline", "comparison"]) {
        const observation = identity[role];

        if (!isPlainObject(observation)) {
            errors.push(`identity.${role} must be a plain object.`);
            continue;
        }

        if (!isNonEmptyString(observation.sceneId)) {
            errors.push(
                `identity.${role}.sceneId must be a non-empty string.`
            );
        }

        if (!isValidIsoDate(observation.date)) {
            errors.push(
                `identity.${role}.date must be a valid ISO date.`
            );
        }

        if (observation.indexCode !== EXPECTED_INDEX_CODE) {
            errors.push(
                `identity.${role}.indexCode must be "NDVI".`
            );
        }
    }

    if (
        isValidIsoDate(identity.baseline?.date) &&
        isValidIsoDate(identity.comparison?.date) &&
        identity.baseline.date >= identity.comparison.date
    ) {
        errors.push(
            "identity comparison date must be later than baseline date."
        );
    }

    const footprint = identity.commonFootprint;

    if (!isPlainObject(footprint)) {
        errors.push(
            "identity.commonFootprint must be a plain object."
        );

        return errors;
    }

    if (!isPositiveInteger(footprint.width)) {
        errors.push(
            "identity.commonFootprint.width must be a positive integer."
        );
    }

    if (!isPositiveInteger(footprint.height)) {
        errors.push(
            "identity.commonFootprint.height must be a positive integer."
        );
    }

    if (
        !Array.isArray(footprint.boundingBox) ||
        footprint.boundingBox.length !== 4 ||
        !footprint.boundingBox.every(isFiniteNumber)
    ) {
        errors.push(
            "identity.commonFootprint.boundingBox must contain four finite numbers."
        );
    }

    if (
        !Array.isArray(footprint.windows) ||
        footprint.windows.length < 2 ||
        !footprint.windows.every(
            window =>
                Array.isArray(window) &&
                window.length >= 4 &&
                window.every(isFiniteNumber)
        )
    ) {
        errors.push(
            "identity.commonFootprint.windows must contain at least two valid windows."
        );
    }

    const sourceSpatialContext = footprint.spatialContext;

    if (!isPlainObject(sourceSpatialContext)) {
        errors.push(
            "identity.commonFootprint.spatialContext must be a plain object."
        );
    } else {
        if (
            !Array.isArray(sourceSpatialContext.origin) ||
            sourceSpatialContext.origin.length < 2 ||
            !sourceSpatialContext.origin.every(isFiniteNumber)
        ) {
            errors.push(
                "identity.commonFootprint.spatialContext.origin is invalid."
            );
        }

        if (
            !Array.isArray(sourceSpatialContext.resolution) ||
            sourceSpatialContext.resolution.length < 2 ||
            !sourceSpatialContext.resolution.every(isFiniteNumber) ||
            sourceSpatialContext.resolution[0] === 0 ||
            sourceSpatialContext.resolution[1] === 0
        ) {
            errors.push(
                "identity.commonFootprint.spatialContext.resolution is invalid."
            );
        }

        if (sourceSpatialContext.projectedCrsCode == null) {
            errors.push(
                "identity.commonFootprint.spatialContext.projectedCrsCode is required."
            );
        }

        if (sourceSpatialContext.rasterType == null) {
            errors.push(
                "identity.commonFootprint.spatialContext.rasterType is required."
            );
        }
    }

    return errors;
}

function validateSpatialReference(spatialReference) {
    const errors = [];

    if (!isPlainObject(spatialReference)) {
        return ["spatialReference must be a plain object."];
    }

    if (
        !Array.isArray(spatialReference.origin) ||
        spatialReference.origin.length < 2 ||
        !spatialReference.origin.every(isFiniteNumber)
    ) {
        errors.push(
            "spatialReference.origin must contain at least two finite numbers."
        );
    }

    if (
        !Array.isArray(spatialReference.resolution) ||
        spatialReference.resolution.length < 2 ||
        !spatialReference.resolution.every(isFiniteNumber) ||
        spatialReference.resolution[0] === 0 ||
        spatialReference.resolution[1] === 0
    ) {
        errors.push(
            "spatialReference.resolution must contain non-zero finite values."
        );
    }

    if (!isPlainObject(spatialReference.geoKeys)) {
        errors.push(
            "spatialReference.geoKeys must be a plain object."
        );
    } else {
        for (const key of REQUIRED_GEO_KEYS) {
            if (
                spatialReference.geoKeys[key] == null ||
                !Number.isFinite(Number(spatialReference.geoKeys[key]))
            ) {
                errors.push(
                    `spatialReference.geoKeys.${key} is required and must be numeric.`
                );
            }
        }
    }

    return errors;
}

function validateRaster(raster, identity) {
    const errors = [];

    if (!isPlainObject(raster)) {
        return ["raster must be a plain object."];
    }

    if (raster.fileName !== "NDVI_CHANGE.tif") {
        errors.push('raster.fileName must be "NDVI_CHANGE.tif".');
    }

    if (raster.productCode !== EXPECTED_PRODUCT_CODE) {
        errors.push(
            `raster.productCode must be "${EXPECTED_PRODUCT_CODE}".`
        );
    }

    if (raster.format !== "GeoTIFF") {
        errors.push('raster.format must be "GeoTIFF".');
    }

    if (raster.dataType !== "Float32") {
        errors.push('raster.dataType must be "Float32".');
    }

    if (!isFiniteNumber(raster.noData)) {
        errors.push("raster.noData must be a finite number.");
    }

    if (!isPositiveInteger(raster.width)) {
        errors.push("raster.width must be a positive integer.");
    }

    if (!isPositiveInteger(raster.height)) {
        errors.push("raster.height must be a positive integer.");
    }

    if (
        isPositiveInteger(raster.width) &&
        isPositiveInteger(raster.height)
    ) {
        const expectedPixelCount = raster.width * raster.height;

        if (
            !Number.isSafeInteger(expectedPixelCount) ||
            raster.pixelCount !== expectedPixelCount
        ) {
            errors.push(
                "raster.pixelCount must equal raster.width multiplied by raster.height."
            );
        }
    } else if (!isPositiveInteger(raster.pixelCount)) {
        errors.push("raster.pixelCount must be a positive integer.");
    }

    if (!isPositiveInteger(raster.byteLength)) {
        errors.push("raster.byteLength must be a positive integer.");
    }

    if (
        typeof raster.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(raster.sha256)
    ) {
        errors.push("raster.sha256 must be a valid lowercase SHA-256 hash.");
    }

    if (
        isPlainObject(identity?.commonFootprint) &&
        raster.width !== identity.commonFootprint.width
    ) {
        errors.push(
            "raster.width must match identity.commonFootprint.width."
        );
    }

    if (
        isPlainObject(identity?.commonFootprint) &&
        raster.height !== identity.commonFootprint.height
    ) {
        errors.push(
            "raster.height must match identity.commonFootprint.height."
        );
    }

    return errors;
}

function validateStatistics(statistics, raster) {
    const errors = [];

    if (!isPlainObject(statistics)) {
        return ["evidence.statistics must be a plain object."];
    }

    const {
        totalPixelCount,
        validPixelCount,
        noDataPixelCount,
        validCoveragePercent,
        noDataCoveragePercent,
        min,
        max,
        mean
    } = statistics;

    if (
        !isPositiveInteger(totalPixelCount) ||
        totalPixelCount !== raster.pixelCount
    ) {
        errors.push(
            "evidence.statistics.totalPixelCount must match raster.pixelCount."
        );
    }

    if (
        !Number.isSafeInteger(validPixelCount) ||
        validPixelCount < 0
    ) {
        errors.push(
            "evidence.statistics.validPixelCount must be a non-negative integer."
        );
    }

    if (
        !Number.isSafeInteger(noDataPixelCount) ||
        noDataPixelCount < 0
    ) {
        errors.push(
            "evidence.statistics.noDataPixelCount must be a non-negative integer."
        );
    }

    if (
        Number.isSafeInteger(validPixelCount) &&
        Number.isSafeInteger(noDataPixelCount) &&
        Number.isSafeInteger(totalPixelCount) &&
        validPixelCount + noDataPixelCount !== totalPixelCount
    ) {
        errors.push(
            "Valid and NoData pixel counts must sum to totalPixelCount."
        );
    }

    for (const field of [
        "validCoveragePercent",
        "noDataCoveragePercent"
    ]) {
        if (
            !isFiniteNumber(statistics[field]) ||
            statistics[field] < 0 ||
            statistics[field] > 100
        ) {
            errors.push(
                `evidence.statistics.${field} must be between 0 and 100.`
            );
        }
    }

    if (
        isFiniteNumber(validCoveragePercent) &&
        isFiniteNumber(noDataCoveragePercent) &&
        Math.abs(
            validCoveragePercent + noDataCoveragePercent - 100
        ) > 0.000001
    ) {
        errors.push(
            "Valid and NoData coverage percentages must sum to 100."
        );
    }

    if (validPixelCount === 0) {
        if (min !== null || max !== null || mean !== null) {
            errors.push(
                "Statistics min, max and mean must be null when there are no valid pixels."
            );
        }
    } else {
        for (const field of ["min", "max", "mean"]) {
            if (!isFiniteNumber(statistics[field])) {
                errors.push(
                    `evidence.statistics.${field} must be a finite number when valid pixels exist.`
                );
            }
        }

        if (
            isFiniteNumber(min) &&
            isFiniteNumber(max) &&
            min > max
        ) {
            errors.push(
                "evidence.statistics.min cannot exceed max."
            );
        }

        if (
            isFiniteNumber(min) &&
            isFiniteNumber(max) &&
            isFiniteNumber(mean) &&
            (mean < min || mean > max)
        ) {
            errors.push(
                "evidence.statistics.mean must lie between min and max."
            );
        }
    }

    return errors;
}

function validateEvidence(evidence, raster) {
    const errors = [];

    if (!isPlainObject(evidence)) {
        return ["evidence must be a plain object."];
    }

    errors.push(
        ...validateStatistics(evidence.statistics, raster)
    );

    if (evidence.method !== EXPECTED_METHOD) {
        errors.push(
            `evidence.method must be "${EXPECTED_METHOD}".`
        );
    }

    if (
        evidence.calibrationStatus !==
        EXPECTED_CALIBRATION_STATUS
    ) {
        errors.push(
            `evidence.calibrationStatus must be "${EXPECTED_CALIBRATION_STATUS}".`
        );
    }

    return errors;
}

function validateSpatialTemporalChangeEvidence(evidence) {
    const errors = [];

    if (!isPlainObject(evidence)) {
        return {
            valid: false,
            errors: [
                "Spatial temporal change evidence must be a plain object."
            ]
        };
    }

    if (
        evidence.contractVersion !==
        SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION}".`
        );
    }

    if (evidence.evidenceType !== EVIDENCE_TYPE) {
        errors.push(
            `evidenceType must be "${EVIDENCE_TYPE}".`
        );
    }

    errors.push(
        ...validateIdentity(evidence.identity)
    );

    errors.push(
        ...validateSpatialReference(evidence.spatialReference)
    );

    errors.push(
        ...validateRaster(
            evidence.raster,
            evidence.identity
        )
    );

    errors.push(
        ...validateEvidence(
            evidence.evidence,
            evidence.raster
        )
    );

    if (
        !isPlainObject(evidence.processingContext) ||
        !isNonEmptyString(
            evidence.processingContext.processingVersion
        )
    ) {
        errors.push(
            "processingContext.processingVersion must be a non-empty string."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSpatialTemporalChangeEvidence(evidence) {
    const result = {
        ...evidence,
        contractVersion:
            SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION,
        evidenceType: EVIDENCE_TYPE
    };

    const validation =
        validateSpatialTemporalChangeEvidence(result);

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid spatial temporal change evidence: " +
            validation.errors.join("; ")
        );

        error.code =
            "INVALID_SPATIAL_TEMPORAL_CHANGE_EVIDENCE";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return result;
}

module.exports = {
    SPATIAL_TEMPORAL_CHANGE_EVIDENCE_CONTRACT_VERSION,
    EVIDENCE_TYPE,
    REQUIRED_FIELDS,
    validateSpatialTemporalChangeEvidence,
    createSpatialTemporalChangeEvidence
};
