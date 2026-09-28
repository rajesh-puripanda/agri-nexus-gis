"use strict";

/**
 * ============================================================
 * Integration Domain Resolution Contract
 * ============================================================
 *
 * Phase 8.14.14
 *
 * Responsibility:
 *   Resolve requested Integrated Agricultural Intelligence
 *   domains into authoritative domain definitions, required
 *   inputs, and prerequisite domain dependencies.
 *
 * This contract does NOT:
 *   - execute services
 *   - calculate scientific results
 *   - interpolate data
 *   - classify soil or raster data
 *   - apply weights
 *   - calculate scores
 *   - rank domains
 *   - invent thresholds
 *   - modify domain semantics
 *
 * Scientific authority remains within the existing domain
 * services and their authoritative contracts.
 *
 * ============================================================
 */

const INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION = "1.0";

const INTEGRATION_DOMAIN_RESOLUTION_TYPE =
    "INTEGRATION_DOMAIN_RESOLUTION";

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

const INTEGRATION_DOMAIN_SET = new Set(
    INTEGRATION_DOMAINS
);

const DOMAIN_DEFINITIONS = Object.freeze({
    SOIL_INTELLIGENCE: Object.freeze({
        domain: "SOIL_INTELLIGENCE",
        authoritativeService:
            "server/services/soilAnalysisService.js",
        authoritativeEntryPoint: "analyzeSample",
        requiredInputs: Object.freeze([
            "sample"
        ]),
        prerequisites: Object.freeze([])
    }),

    SPATIAL_INTELLIGENCE: Object.freeze({
        domain: "SPATIAL_INTELLIGENCE",
        authoritativeService:
            "server/services/spatialAnalysisService.js",
        authoritativeEntryPoint: "getSpatialAnalysis",
        requiredInputs: Object.freeze([
            "latitude",
            "longitude"
        ]),
        prerequisites: Object.freeze([])
    }),

    CROP_SUITABILITY: Object.freeze({
        domain: "CROP_SUITABILITY",
        authoritativeService:
            "server/services/cropSuitabilityService.js",
        authoritativeEntryPoint:
            "generateCropRecommendations",
        requiredInputs: Object.freeze([
            "sample",
            "analysis"
        ]),
        prerequisites: Object.freeze([
            "SOIL_INTELLIGENCE"
        ])
    }),

    FERTILITY_ZONING: Object.freeze({
        domain: "FERTILITY_ZONING",
        authoritativeService:
            "server/services/fertilityZoningService.js",
        authoritativeEntryPoint:
            "prepareFertilityZoning",
        requiredInputs: Object.freeze([
            "options"
        ]),
        prerequisites: Object.freeze([])
    }),

    HISTORICAL_CONTEXT: Object.freeze({
        domain: "HISTORICAL_CONTEXT",
        authoritativeService:
            "server/services/historicalContextService.js",
        authoritativeEntryPoint:
            "getHistoricalContext",
        requiredInputs: Object.freeze([
            "sampleId",
            "parameter"
        ]),
        prerequisites: Object.freeze([])
    }),

    TEMPORAL_OBSERVATION: Object.freeze({
        domain: "TEMPORAL_OBSERVATION",
        authoritativeService:
            "server/services/remoteSensing/temporal/temporalObservationWorkflowService.js",
        authoritativeEntryPoint:
            "processTemporalObservationWorkflow",
        requiredInputs: Object.freeze([
            "temporalIdentity",
            "rasterIdentity",
            "workflowRequest"
        ]),
        prerequisites: Object.freeze([])
    }),

    TEMPORAL_COMPOSITION: Object.freeze({
        domain: "TEMPORAL_COMPOSITION",
        authoritativeService:
            "server/services/remoteSensing/temporal/temporalCompositionWorkflowService.js",
        authoritativeEntryPoint:
            "processTemporalCompositionWorkflow",
        requiredInputs: Object.freeze([
            "compositionId",
            "indexCode",
            "observations",
            "temporalContext",
            "spatialContext",
            "processingContext"
        ]),
        prerequisites: Object.freeze([
            "TEMPORAL_OBSERVATION"
        ])
    }),

    TEMPORAL_ANALYSIS: Object.freeze({
        domain: "TEMPORAL_ANALYSIS",
        authoritativeService:
            "server/services/remoteSensing/temporal/temporalAnalysisWorkflowService.js",
        authoritativeEntryPoint:
            "processTemporalAnalysisWorkflow",
        requiredInputs: Object.freeze([
            "analysisId",
            "analysisType",
            "composition"
        ]),
        prerequisites: Object.freeze([
            "TEMPORAL_COMPOSITION"
        ])
    })
});

function isPlainObject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateRequestedDomains(requestedDomains) {
    const errors = [];

    if (
        !Array.isArray(requestedDomains) ||
        requestedDomains.length === 0
    ) {
        errors.push(
            "requestedDomains must be a non-empty array."
        );

        return errors;
    }

    const uniqueDomains = new Set(
        requestedDomains
    );

    if (
        uniqueDomains.size !==
        requestedDomains.length
    ) {
        errors.push(
            "requestedDomains must not contain duplicates."
        );
    }

    requestedDomains.forEach(
        (domain, index) => {
            if (
                typeof domain !== "string" ||
                !INTEGRATION_DOMAIN_SET.has(domain)
            ) {
                errors.push(
                    `requestedDomains[${index}] contains an unsupported integration domain.`
                );
            }
        }
    );

    return errors;
}

function addDomainWithDependencies(
    domain,
    resolvedDomains,
    visiting
) {
    if (resolvedDomains.has(domain)) {
        return;
    }

    if (visiting.has(domain)) {
        throw new Error(
            `Circular integration domain dependency detected at "${domain}".`
        );
    }

    const definition =
        DOMAIN_DEFINITIONS[domain];

    if (!definition) {
        throw new Error(
            `Unsupported integration domain "${domain}".`
        );
    }

    visiting.add(domain);

    definition.prerequisites.forEach(
        prerequisite => {
            addDomainWithDependencies(
                prerequisite,
                resolvedDomains,
                visiting
            );
        }
    );

    visiting.delete(domain);

    resolvedDomains.set(
        domain,
        definition
    );
}

function buildResolvedDomains(
    requestedDomains
) {
    const resolvedDomains = new Map();

    requestedDomains.forEach(
        domain => {
            addDomainWithDependencies(
                domain,
                resolvedDomains,
                new Set()
            );
        }
    );

    return Array.from(
        resolvedDomains.values()
    ).map(definition => ({
        domain: definition.domain,
        authoritativeService:
            definition.authoritativeService,
        authoritativeEntryPoint:
            definition.authoritativeEntryPoint,
        requiredInputs: [
            ...definition.requiredInputs
        ],
        prerequisites: [
            ...definition.prerequisites
        ]
    }));
}

function validateIntegrationDomainResolution(
    resolution
) {
    const errors = [];

    if (!isPlainObject(resolution)) {
        errors.push(
            "resolution must be a plain object."
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        resolution.contractVersion !==
        INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION}".`
        );
    }

    if (
        resolution.resolutionType !==
        INTEGRATION_DOMAIN_RESOLUTION_TYPE
    ) {
        errors.push(
            `resolutionType must be "${INTEGRATION_DOMAIN_RESOLUTION_TYPE}".`
        );
    }

    errors.push(
        ...validateRequestedDomains(
            resolution.requestedDomains
        )
    );

    if (
        !Array.isArray(
            resolution.resolvedDomains
        ) ||
        resolution.resolvedDomains.length === 0
    ) {
        errors.push(
            "resolvedDomains must be a non-empty array."
        );
    } else {
        const resolvedDomainNames =
            resolution.resolvedDomains.map(
                entry =>
                    isPlainObject(entry)
                        ? entry.domain
                        : undefined
            );

        const uniqueResolvedDomains =
            new Set(resolvedDomainNames);

        if (
            uniqueResolvedDomains.size !==
            resolvedDomainNames.length
        ) {
            errors.push(
                "resolvedDomains must not contain duplicates."
            );
        }

        resolution.resolvedDomains.forEach(
            (entry, index) => {
                if (!isPlainObject(entry)) {
                    errors.push(
                        `resolvedDomains[${index}] must be a plain object.`
                    );
                    return;
                }

                if (
                    !INTEGRATION_DOMAIN_SET.has(
                        entry.domain
                    )
                ) {
                    errors.push(
                        `resolvedDomains[${index}].domain is unsupported.`
                    );
                }

                if (
                    typeof entry.authoritativeService !==
                    "string" ||
                    !entry.authoritativeService.trim()
                ) {
                    errors.push(
                        `resolvedDomains[${index}].authoritativeService must be a non-empty string.`
                    );
                }

                if (
                    typeof entry.authoritativeEntryPoint !==
                    "string" ||
                    !entry.authoritativeEntryPoint.trim()
                ) {
                    errors.push(
                        `resolvedDomains[${index}].authoritativeEntryPoint must be a non-empty string.`
                    );
                }

                if (
                    !Array.isArray(
                        entry.requiredInputs
                    )
                ) {
                    errors.push(
                        `resolvedDomains[${index}].requiredInputs must be an array.`
                    );
                }

                if (
                    !Array.isArray(
                        entry.prerequisites
                    )
                ) {
                    errors.push(
                        `resolvedDomains[${index}].prerequisites must be an array.`
                    );
                }
            }
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createIntegrationDomainResolution(
    input = {}
) {
    const source =
        isPlainObject(input)
            ? input
            : {};

    const requestedDomains =
        Array.isArray(
            source.requestedDomains
        )
            ? [...source.requestedDomains]
            : [];

    const requestedDomainValidation =
        validateRequestedDomains(
            requestedDomains
        );

    if (
        requestedDomainValidation.length > 0
    ) {
        const error = new Error(
            "Invalid integration domain resolution request."
        );

        error.code =
            "INVALID_INTEGRATION_DOMAIN_RESOLUTION";

        error.validationErrors =
            requestedDomainValidation;

        throw error;
    }

    const requestResolution = {
        contractVersion:
            INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION,

        resolutionType:
            INTEGRATION_DOMAIN_RESOLUTION_TYPE,

        requestedDomains,

        resolvedDomains:
            buildResolvedDomains(
                requestedDomains
            )
    };

    const validation =
        validateIntegrationDomainResolution(
            requestResolution
        );

    if (!validation.valid) {
        const error = new Error(
            "Invalid integration domain resolution."
        );

        error.code =
            "INVALID_INTEGRATION_DOMAIN_RESOLUTION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return requestResolution;
}

module.exports = {
    INTEGRATION_DOMAIN_RESOLUTION_CONTRACT_VERSION,
    INTEGRATION_DOMAIN_RESOLUTION_TYPE,
    INTEGRATION_DOMAINS,
    DOMAIN_DEFINITIONS,
    validateIntegrationDomainResolution,
    createIntegrationDomainResolution
};