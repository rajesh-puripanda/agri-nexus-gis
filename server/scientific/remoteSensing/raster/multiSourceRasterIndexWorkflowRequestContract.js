"use strict";

const {
    getIndexDefinition
} = require("../indices/indexRegistry");

const MULTI_SOURCE_RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION =
    "1.0";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateIndexCode(indexCode) {
    const errors = [];

    if (
        typeof indexCode !== "string" ||
        indexCode.trim().length === 0
    ) {
        return {
            errors: [
                "indexCode must be a non-empty string."
            ],
            normalizedCode: null
        };
    }

    const normalizedCode =
        indexCode.trim().toUpperCase();

    if (!getIndexDefinition(normalizedCode)) {
        errors.push(
            `Unknown remote sensing index: ${normalizedCode}.`
        );
    }

    return {
        errors,
        normalizedCode
    };
}

function validateSources(sources) {
    const errors = [];

    if (!Array.isArray(sources)) {
        return [
            "sources must be an array."
        ];
    }

    if (sources.length === 0) {
        return [
            "sources must contain at least one raster source."
        ];
    }

    const seenBands = new Set();

    sources.forEach((source, index) => {
        if (!isPlainObject(source)) {
            errors.push(
                `sources[${index}] must be an object.`
            );

            return;
        }

        if (
            typeof source.band !== "string" ||
            source.band.trim().length === 0
        ) {
            errors.push(
                `sources[${index}].band must be a non-empty string.`
            );
        } else {
            const band =
                source.band.trim();

            if (seenBands.has(band)) {
                errors.push(
                    `sources contains duplicate band: ${band}.`
                );
            }

            seenBands.add(band);
        }

        const hasRaster =
            isPlainObject(source.raster);

        const hasInputPath =
            typeof source.inputPath === "string" &&
            source.inputPath.trim().length > 0;

        if (!hasRaster && !hasInputPath) {
            errors.push(
                `sources[${index}] must provide either raster or inputPath.`
            );
        }

        if (
            source.sourceBand !== undefined
        ) {
            if (
                !Number.isInteger(
                    source.sourceBand
                ) ||
                source.sourceBand <= 0
            ) {
                errors.push(
                    `sources[${index}].sourceBand must be a positive integer when supplied.`
                );
            }
        }
    });

    return errors;
}

function validateTargetResolution(
    targetResolution
) {
    if (
        typeof targetResolution !== "number" ||
        !Number.isFinite(targetResolution) ||
        targetResolution <= 0
    ) {
        return [
            "targetResolution must be a positive finite number."
        ];
    }

    return [];
}

function validateOptionalObject(
    value,
    name
) {
    if (value === undefined) {
        return [];
    }

    if (!isPlainObject(value)) {
        return [
            `${name} must be an object when supplied.`
        ];
    }

    return [];
}

function validateRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "request must be an object."
            ]
        };
    }

    const indexValidation =
        validateIndexCode(
            request.indexCode
        );

    errors.push(
        ...indexValidation.errors
    );

    errors.push(
        ...validateSources(
            request.sources
        )
    );

    errors.push(
        ...validateTargetResolution(
            request.targetResolution
        )
    );

    if (
        request.noData !== undefined &&
        request.noData !== null &&
        (
            typeof request.noData !== "number" ||
            !Number.isFinite(request.noData)
        )
    ) {
        errors.push(
            "noData must be a finite number or null."
        );
    }

    errors.push(
        ...validateOptionalObject(
            request.parameters,
            "parameters"
        )
    );

    errors.push(
        ...validateOptionalObject(
            request.processingContext,
            "processingContext"
        )
    );

    errors.push(
        ...validateOptionalObject(
            request.spatialContext,
            "spatialContext"
        )
    );

    if (indexValidation.normalizedCode) {
        const definition =
            getIndexDefinition(
                indexValidation.normalizedCode
            );

        if (definition) {
            const requiredBands =
                new Set(
                    definition.requiredBands
                );

            for (const requiredBand of requiredBands) {
                const supplied =
                    Array.isArray(request.sources) &&
                    request.sources.some(
                        source =>
                            source &&
                            typeof source.band === "string" &&
                            source.band.trim() === requiredBand
                    );

                if (!supplied) {
                    errors.push(
                        `sources is missing required band for ${indexValidation.normalizedCode}: ${requiredBand}.`
                    );
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,

        ...(errors.length === 0
            ? {
                indexCode:
                    indexValidation.normalizedCode
            }
            : {})
    };
}

function createRequestContract(request) {
    const validation =
        validateRequest(request);

    if (!validation.valid) {
        throw new Error(
            validation.errors.join("; ")
        );
    }

    return {
        contractVersion:
            MULTI_SOURCE_RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION,

        indexCode:
            validation.indexCode,

        sources:
            request.sources.map(
                source => ({
                    band:
                        source.band.trim(),

                    ...(source.raster !== undefined
                        ? {
                            raster:
                                source.raster
                        }
                        : {}),

                    ...(source.inputPath !== undefined
                        ? {
                            inputPath:
                                source.inputPath.trim()
                        }
                        : {}),

                    ...(source.sourceBand !== undefined
                        ? {
                            sourceBand:
                                source.sourceBand
                        }
                        : {})
                })
            ),

        targetResolution:
            request.targetResolution,

        ...(request.noData !== undefined
            ? {
                noData:
                    request.noData
            }
            : {}),

        ...(request.parameters !== undefined
            ? {
                parameters:
                    request.parameters
            }
            : {}),

        ...(request.processingContext !== undefined
            ? {
                processingContext:
                    request.processingContext
            }
            : {}),

        ...(request.spatialContext !== undefined
            ? {
                spatialContext:
                    request.spatialContext
            }
            : {})
    };
}

module.exports = {
    MULTI_SOURCE_RASTER_INDEX_WORKFLOW_REQUEST_CONTRACT_VERSION,

    validateMultiSourceRasterIndexWorkflowRequest:
        validateRequest,

    createMultiSourceRasterIndexWorkflowRequestContract:
        createRequestContract
};
