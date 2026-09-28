"use strict";

// ============================================================
// server/scientific/integration/
// integrationDomainExecutionAdapter.js
//
// AgriNexus GIS
//
// Phase 8.15.11
// Integration Domain Execution Adapter
//
// Purpose:
// - Bridge resolved integration-domain service arguments to the
//   authoritative domain entry points.
// - Preserve authoritative domain results without transformation.
// - Provide one deterministic execution boundary for the
//   integration layer.
//
// Responsibilities:
// - Validate the requested integration domain.
// - Validate the resolved service arguments.
// - Dispatch to the authoritative domain service.
// - Await synchronous or asynchronous authoritative services.
// - Execute temporal observation requests sequentially.
// - Preserve authoritative result values unchanged.
//
// Non-responsibilities:
// - No scientific calculations.
// - No classification.
// - No ranking.
// - No scoring.
// - No weighting.
// - No prerequisite resolution.
// - No input resolution.
// - No missing-value inference.
// - No temporal reinterpretation.
// - No result transformation.
// - No duplicate domain logic.
// ============================================================

const {
    INTEGRATION_DOMAINS,
    DOMAIN_DEFINITIONS
} = require(
    "./integrationDomainResolutionContract"
);

const {
    analyzeSample
} = require(
    "../../services/soilAnalysisService"
);

const {
    getSpatialAnalysis
} = require(
    "../../services/spatialAnalysisService"
);

const {
    generateCropRecommendations
} = require(
    "../../services/cropSuitabilityService"
);

const {
    prepareFertilityZoning
} = require(
    "../../services/fertilityZoningService"
);

const {
    getHistoricalContext
} = require(
    "../../services/historicalContextService"
);

const {
    processTemporalObservationWorkflow
} = require(
    "../../services/remoteSensing/temporal/temporalObservationWorkflowService"
);

const {
    processTemporalCompositionWorkflow
} = require(
    "../../services/remoteSensing/temporal/temporalCompositionWorkflowService"
);

const {
    processTemporalAnalysisWorkflow
} = require(
    "../../services/remoteSensing/temporal/temporalAnalysisWorkflowService"
);

// ============================================================
// Constants
// ============================================================

const INTEGRATION_DOMAIN_EXECUTION_ADAPTER_VERSION =
    "1.0";

const INTEGRATION_DOMAIN_EXECUTION_ADAPTER_TYPE =
    "INTEGRATION_DOMAIN_EXECUTION_ADAPTER";

const ADAPTER_ERROR_CODES = Object.freeze({
    INVALID_DOMAIN:
        "INVALID_INTEGRATION_DOMAIN",

    INVALID_SERVICE_ARGUMENTS:
        "INVALID_INTEGRATION_SERVICE_ARGUMENTS",

    INVALID_DOMAIN_DEFINITION:
        "INVALID_INTEGRATION_DOMAIN_DEFINITION",

    INVALID_AUTHORITATIVE_ENTRY_POINT:
        "INVALID_AUTHORITATIVE_ENTRY_POINT",

    INVALID_TEMPORAL_OBSERVATION_REQUESTS:
        "INVALID_TEMPORAL_OBSERVATION_REQUESTS"
});

// ============================================================
// Helpers
// ============================================================

function isPlainObject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function isSupportedDomain(domain) {
    return (
        typeof domain === "string" &&
        INTEGRATION_DOMAINS.includes(domain)
    );
}

function createAdapterError(
    code,
    message
) {
    const error =
        new Error(message);

    error.name =
        "IntegrationDomainExecutionAdapterError";

    error.code =
        code;

    return error;
}

// ============================================================
// Authoritative dispatch table
//
// Each entry is deliberately explicit.
// The table does not contain scientific logic.
// It only binds an integration domain to the already-established
// authoritative service entry point.
// ============================================================

const DOMAIN_EXECUTORS = Object.freeze({
    SOIL_INTELLIGENCE:
        async function executeSoilIntelligence(
            serviceArguments
        ) {
            return analyzeSample(
                serviceArguments.sample
            );
        },

    SPATIAL_INTELLIGENCE:
        async function executeSpatialIntelligence(
            serviceArguments
        ) {
            return getSpatialAnalysis(
                serviceArguments.latitude,
                serviceArguments.longitude
            );
        },

    CROP_SUITABILITY:
        async function executeCropSuitability(
            serviceArguments
        ) {
            return generateCropRecommendations(
                serviceArguments.sample,
                serviceArguments.analysis
            );
        },

    FERTILITY_ZONING:
        async function executeFertilityZoning(
            serviceArguments
        ) {
            return prepareFertilityZoning(
                serviceArguments.options
            );
        },

    HISTORICAL_CONTEXT:
        async function executeHistoricalContext(
            serviceArguments
        ) {
            return getHistoricalContext({
                sampleId:
                    serviceArguments.sampleId,

                parameter:
                    serviceArguments.parameter
            });
        },

    TEMPORAL_OBSERVATION:
        async function executeTemporalObservation(
            serviceArguments
        ) {
            const observationRequests =
                serviceArguments.observationRequests;

            if (
                !Array.isArray(
                    observationRequests
                ) ||
                observationRequests.length === 0
            ) {
                throw createAdapterError(
                    ADAPTER_ERROR_CODES
                        .INVALID_TEMPORAL_OBSERVATION_REQUESTS,
                    "TEMPORAL_OBSERVATION.serviceArguments.observationRequests must be a non-empty array."
                );
            }

            const results = [];

            for (
                const request
                of observationRequests
            ) {
                const result =
                    await processTemporalObservationWorkflow(
                        request
                    );

                results.push(result);
            }

            return results;
        },

    TEMPORAL_COMPOSITION:
        async function executeTemporalComposition(
            serviceArguments
        ) {
            return processTemporalCompositionWorkflow(
                serviceArguments.request
            );
        },

    TEMPORAL_ANALYSIS:
        async function executeTemporalAnalysis(
            serviceArguments
        ) {
            return processTemporalAnalysisWorkflow(
                serviceArguments.request
            );
        }
});

// ============================================================
// Definition consistency validation
// ============================================================

function validateDomainExecutorDefinition(
    domain
) {
    const definition =
        DOMAIN_DEFINITIONS[domain];

    if (
        !isPlainObject(definition)
    ) {
        throw createAdapterError(
            ADAPTER_ERROR_CODES
                .INVALID_DOMAIN_DEFINITION,
            `No authoritative domain definition exists for '${domain}'.`
        );
    }

    const executor =
        DOMAIN_EXECUTORS[domain];

    if (
        typeof executor !== "function"
    ) {
        throw createAdapterError(
            ADAPTER_ERROR_CODES
                .INVALID_AUTHORITATIVE_ENTRY_POINT,
            `No execution adapter is defined for integration domain '${domain}'.`
        );
    }

    if (
        typeof definition.authoritativeEntryPoint !==
        "string" ||
        !definition.authoritativeEntryPoint.trim()
    ) {
        throw createAdapterError(
            ADAPTER_ERROR_CODES
                .INVALID_AUTHORITATIVE_ENTRY_POINT,
            `Integration domain '${domain}' has no valid authoritative entry point.`
        );
    }

    return {
        definition,
        executor
    };
}

// ============================================================
// Primary execution boundary
// ============================================================

async function executeIntegrationDomain(
    domain,
    serviceArguments
) {
    if (
        !isSupportedDomain(domain)
    ) {
        throw createAdapterError(
            ADAPTER_ERROR_CODES.INVALID_DOMAIN,
            `Unsupported integration domain '${domain}'.`
        );
    }

    if (
        !isPlainObject(serviceArguments)
    ) {
        throw createAdapterError(
            ADAPTER_ERROR_CODES
                .INVALID_SERVICE_ARGUMENTS,
            "serviceArguments must be a plain object."
        );
    }

    const {
        executor
    } =
        validateDomainExecutorDefinition(
            domain
        );

    return executor(
        serviceArguments
    );
}

// ============================================================
// Adapter metadata
// ============================================================

const INTEGRATION_DOMAIN_EXECUTION_ADAPTER_METADATA =
    Object.freeze({
        contractVersion:
            INTEGRATION_DOMAIN_EXECUTION_ADAPTER_VERSION,

        executionType:
            INTEGRATION_DOMAIN_EXECUTION_ADAPTER_TYPE,

        supportedDomains:
            Object.freeze([
                ...INTEGRATION_DOMAINS
            ])
    });

// ============================================================
// Exports
// ============================================================

module.exports = {
    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_VERSION,

    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_TYPE,

    ADAPTER_ERROR_CODES,

    INTEGRATION_DOMAIN_EXECUTION_ADAPTER_METADATA,

    DOMAIN_EXECUTORS,

    executeIntegrationDomain
};