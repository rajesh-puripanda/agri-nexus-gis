
"use strict";

const EVIDENCE_QUALITY_CONTRACT_VERSION = "1.0";

const REQUIRED_FIELDS = [
    "contractVersion",
    "evidenceStatus",
    "qualityMetrics",
    "provenance"
];

const VALID_EVIDENCE_STATUSES = [
    "available",
    "unavailable",
    "insufficient",
    "provisional"
];

function isPlainObject(value) {
    return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);
}

function isNonEmptyString(value) {
    return typeof value === "string" &&
        value.trim().length > 0;
}

function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
}

function validateEvidenceQuality(quality) {
    const errors = [];

    if (!isPlainObject(quality)) {
        return {
            valid: false,
            errors: ["Evidence quality must be a plain object."]
        };
    }

    if (quality.contractVersion !== EVIDENCE_QUALITY_CONTRACT_VERSION) {
        errors.push(
            `contractVersion must be "${EVIDENCE_QUALITY_CONTRACT_VERSION}".`
        );
    }

    if (!VALID_EVIDENCE_STATUSES.includes(quality.evidenceStatus)) {
        errors.push(
            `evidenceStatus must be one of: ${VALID_EVIDENCE_STATUSES.join(", ")}.`
        );
    }

    if (!isPlainObject(quality.qualityMetrics)) {
        errors.push("qualityMetrics must be a plain object.");
    } else {
        const metrics = quality.qualityMetrics;
        const countFields = [
            "pixelCount",
            "validPixelCount",
            "noDataPixelCount",
            "outOfRangePixelCount"
        ];

        for (const field of countFields) {
            if (metrics[field] !== undefined &&
                !isNonNegativeInteger(metrics[field])) {
                errors.push(`${field} must be a non-negative integer.`);
            }
        }

        const {
            pixelCount,
            validPixelCount,
            noDataPixelCount,
            outOfRangePixelCount
        } = metrics;

        if (pixelCount !== undefined &&
            validPixelCount !== undefined &&
            validPixelCount > pixelCount) {
            errors.push("validPixelCount cannot exceed pixelCount.");
        }

        if (pixelCount !== undefined &&
            noDataPixelCount !== undefined &&
            noDataPixelCount > pixelCount) {
            errors.push("noDataPixelCount cannot exceed pixelCount.");
        }

        if (pixelCount !== undefined &&
            validPixelCount !== undefined &&
            noDataPixelCount !== undefined &&
            validPixelCount + noDataPixelCount !== pixelCount) {
            errors.push(
                "validPixelCount + noDataPixelCount must equal pixelCount."
            );
        }

        if (outOfRangePixelCount !== undefined &&
            validPixelCount !== undefined &&
            outOfRangePixelCount > validPixelCount) {
            errors.push(
                "outOfRangePixelCount cannot exceed validPixelCount."
            );
        }

        if (pixelCount !== undefined && pixelCount > 0 &&
            validPixelCount !== undefined) {
            const expectedFraction = validPixelCount / pixelCount;

            if (metrics.validPixelFraction !== undefined &&
                (typeof metrics.validPixelFraction !== "number" ||
                 !Number.isFinite(metrics.validPixelFraction) ||
                 metrics.validPixelFraction < 0 ||
                 metrics.validPixelFraction > 1 ||
                 Math.abs(metrics.validPixelFraction - expectedFraction) > 1e-12)) {
                errors.push(
                    "validPixelFraction must equal validPixelCount / pixelCount."
                );
            }
        } else if (metrics.validPixelFraction !== undefined &&
            (typeof metrics.validPixelFraction !== "number" ||
             !Number.isFinite(metrics.validPixelFraction) ||
             metrics.validPixelFraction < 0 ||
             metrics.validPixelFraction > 1)) {
            errors.push(
                "validPixelFraction must be a finite number between 0 and 1."
            );
        }
    }

    if (!isPlainObject(quality.provenance)) {
        errors.push("provenance must be a plain object.");
    } else {
        for (const field of ["source", "workflowVersion"]) {
            if (quality.provenance[field] !== undefined &&
                !isNonEmptyString(quality.provenance[field])) {
                errors.push(
                    `provenance.${field} must be a non-empty string when provided.`
                );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createEvidenceQuality(quality) {
    const result = {
        ...quality,
        contractVersion: EVIDENCE_QUALITY_CONTRACT_VERSION
    };

    const metrics = result.qualityMetrics;
    if (isPlainObject(metrics) &&
        Number.isInteger(metrics.pixelCount) &&
        metrics.pixelCount > 0 &&
        isNonNegativeInteger(metrics.validPixelCount) &&
        metrics.validPixelFraction === undefined) {
        metrics.validPixelFraction =
            metrics.validPixelCount / metrics.pixelCount;
    }

    const validation = validateEvidenceQuality(result);

    if (!validation.valid) {
        const error = new TypeError(
            "Invalid evidence quality: " + validation.errors.join("; ")
        );
        error.code = "INVALID_EVIDENCE_QUALITY";
        error.validationErrors = validation.errors;
        throw error;
    }

    return result;
}

module.exports = {
    EVIDENCE_QUALITY_CONTRACT_VERSION,
    REQUIRED_FIELDS,
    VALID_EVIDENCE_STATUSES,
    validateEvidenceQuality,
    createEvidenceQuality
};
