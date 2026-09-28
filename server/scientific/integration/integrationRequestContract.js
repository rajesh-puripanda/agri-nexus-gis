"use strict";

const INTEGRATION_REQUEST_CONTRACT_VERSION = "1.0";
const INTEGRATION_REQUEST_TYPE = "INTEGRATED_AGRICULTURAL_INTELLIGENCE_REQUEST";

const INTEGRATION_DOMAINS = Object.freeze([
    "SOIL_INTELLIGENCE",
    "SPATIAL_INTELLIGENCE",
    "CROP_SUITABILITY",
    "FERTILITY_ZONING",
    "HISTORICAL_CONTEXT",
    "TEMPORAL_OBSERVATION",
    "TEMPORAL_COMPOSITION",
    "TEMPORAL_ANALYSIS"
]);

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "requestType",
    "requestedDomains"
]);

const OPTIONAL_FIELDS = Object.freeze([
    "inputs",
    "context",
    "metadata"
]);

const INTEGRATION_DOMAIN_SET = new Set(INTEGRATION_DOMAINS);

function isPlainObject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateIntegrationRequest(request) {
    const errors = [];

    if (!isPlainObject(request)) {
        errors.push("request must be a plain object.");
        return {
            valid: false,
            errors
        };
    }

    if (request.contractVersion !== INTEGRATION_REQUEST_CONTRACT_VERSION) {
        errors.push(
            `contractVersion must be "${INTEGRATION_REQUEST_CONTRACT_VERSION}".`
        );
    }

    if (request.requestType !== INTEGRATION_REQUEST_TYPE) {
        errors.push(
            `requestType must be "${INTEGRATION_REQUEST_TYPE}".`
        );
    }

    if (!Array.isArray(request.requestedDomains) || request.requestedDomains.length === 0) {
        errors.push("requestedDomains must be a non-empty array.");
    } else {
        const uniqueDomains = new Set(request.requestedDomains);

        if (uniqueDomains.size !== request.requestedDomains.length) {
            errors.push("requestedDomains must not contain duplicates.");
        }

        request.requestedDomains.forEach((domain, index) => {
            if (typeof domain !== "string" || !INTEGRATION_DOMAIN_SET.has(domain)) {
                errors.push(
                    `requestedDomains[${index}] contains an unsupported integration domain.`
                );
            }
        });
    }

    if (request.inputs !== undefined && !isPlainObject(request.inputs)) {
        errors.push("inputs must be a plain object when provided.");
    }

    if (request.context !== undefined && !isPlainObject(request.context)) {
        errors.push("context must be a plain object when provided.");
    }

    if (request.metadata !== undefined && !isPlainObject(request.metadata)) {
        errors.push("metadata must be a plain object when provided.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createIntegrationRequest(input = {}) {
    const source = isPlainObject(input) ? input : {};

    const request = {
        contractVersion: INTEGRATION_REQUEST_CONTRACT_VERSION,
        requestType: INTEGRATION_REQUEST_TYPE,
        requestedDomains: Array.isArray(source.requestedDomains)
            ? [...source.requestedDomains]
            : [],
        inputs: source.inputs !== undefined
            ? source.inputs
            : {},
        context: source.context !== undefined
            ? source.context
            : {}
    };

    if (source.metadata !== undefined) {
        request.metadata = source.metadata;
    }

    const validation = validateIntegrationRequest(request);

    if (!validation.valid) {
        const error = new Error("Invalid integration request.");
        error.code = "INVALID_INTEGRATION_REQUEST";
        error.validationErrors = validation.errors;
        throw error;
    }

    return request;
}

module.exports = {
    INTEGRATION_REQUEST_CONTRACT_VERSION,
    INTEGRATION_REQUEST_TYPE,
    INTEGRATION_DOMAINS,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateIntegrationRequest,
    createIntegrationRequest
};
