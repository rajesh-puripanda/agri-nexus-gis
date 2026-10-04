"use strict";

const {
    validateSatelliteAcquisitionRequest,
    createSatelliteAcquisitionRequestContract,
    ACQUISITION_REQUEST_CONTRACT_VERSION
} = require(
    "../../../scientific/remoteSensing/acquisition/satelliteAcquisitionRequestContract"
);

const {
    getIndexDefinition
} = require(
    "../../../scientific/remoteSensing/indices/indexRegistry"
);

const SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION =
    "1.0";

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateSentinel2IndexProductionRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        return {
            valid: false,
            errors: [
                "Sentinel-2 index production request must be an object."
            ]
        };
    }

    const acquisitionValidation =
        validateSatelliteAcquisitionRequest(request);

    if (!acquisitionValidation.valid) {
        errors.push(
            ...acquisitionValidation.errors
        );
    }

    if (
        typeof request.contractVersion === "string" &&
        request.contractVersion.trim() !== "" &&
        request.contractVersion !==
            SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be ` +
            `${SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION}.`
        );
    }
    if (
        typeof request.indexCode !== "string" ||
        request.indexCode.trim() === ""
    ) {
        errors.push(
            "indexCode is required."
        );
    } else {
        const indexCode =
            request.indexCode
                .trim()
                .toUpperCase();

        try {
            getIndexDefinition(indexCode);
        } catch (error) {
            errors.push(
                `Unknown remote sensing index: ${indexCode}.`
            );
        }
    }

    if (
        typeof request.targetResolution !== "number" ||
        !Number.isFinite(request.targetResolution) ||
        request.targetResolution <= 0
    ) {
        errors.push(
            "targetResolution must be a positive finite number."
        );
    }

    if (
        request.outputNoData !== undefined &&
        (
            typeof request.outputNoData !== "number" ||
            !Number.isFinite(request.outputNoData)
        )
    ) {
        errors.push(
            "outputNoData must be a finite number when provided."
        );
    }

    if (
        request.parameters !== undefined &&
        !isPlainObject(request.parameters)
    ) {
        errors.push(
            "parameters must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createSentinel2IndexProductionRequestContract(
    request
) {
    const validation =
        validateSentinel2IndexProductionRequest(
            request
        );

    if (!validation.valid) {
        const error = new Error(
            "Invalid Sentinel-2 index production request."
        );

        error.code =
            "INVALID_SENTINEL2_INDEX_PRODUCTION_REQUEST";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    const acquisitionRequest =
        createSatelliteAcquisitionRequestContract(
            request
        );

    const indexCode =
        request.indexCode
            .trim()
            .toUpperCase();

    const contract = {
        ...acquisitionRequest,

        contractVersion:
            SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION,

        indexCode,

        targetResolution:
            Number(request.targetResolution)
    };

    if (request.outputNoData !== undefined) {
        contract.outputNoData =
            Number(request.outputNoData);
    }

    if (request.parameters !== undefined) {
        contract.parameters =
            Object.freeze({
                ...request.parameters
            });
    }

    return Object.freeze(contract);
}

module.exports = {
    SENTINEL2_INDEX_PRODUCTION_REQUEST_CONTRACT_VERSION,
    ACQUISITION_REQUEST_CONTRACT_VERSION,
    validateSentinel2IndexProductionRequest,
    createSentinel2IndexProductionRequestContract
};
