"use strict";

/**
 * ============================================================
 * Integration Input Resolution Contract
 * ============================================================
 *
 * Phase 8.14.18.6
 *
 * Contract version: 1.0
 *
 * Responsibility:
 *   Resolve authoritative service arguments for an integration
 *   domain from:
 *
 *   1. integration request inputs/context
 *   2. completed prerequisite domain results
 *
 * This contract does NOT:
 *   - execute services
 *   - calculate scientific results
 *   - transform scientific values
 *   - classify observations
 *   - interpolate
 *   - rank domains
 *   - apply weights
 *   - invent thresholds
 *   - bypass domain dependencies
 *
 * Scientific authority remains inside the existing domain
 * services and their authoritative request/result contracts.
 *
 * ============================================================
 */

const {
    createTemporalObservationWorkflowRequestContract
} = require(
    "../remoteSensing/temporal/temporalObservationWorkflowRequestContract"
);

const {
    createTemporalCompositionWorkflowRequest
} = require(
    "../remoteSensing/temporal/temporalCompositionWorkflowRequestContract"
);

const {
    createTemporalAnalysisWorkflowRequest
} = require(
    "../remoteSensing/temporal/temporalAnalysisWorkflowRequestContract"
);

const INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION = "1.0";

const INTEGRATION_INPUT_RESOLUTION_TYPE =
    "INTEGRATION_INPUT_RESOLUTION";

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

const RESOLUTION_STATUSES = Object.freeze([
    "resolved",
    "blocked"
]);

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "resolutionType",
    "domain",
    "status"
]);

const OPTIONAL_FIELDS = Object.freeze([
    "serviceArguments",
    "missingInputs",
    "sourceDomains"
]);

const DOMAIN_SET = new Set(
    INTEGRATION_DOMAINS
);

const STATUS_SET = new Set(
    RESOLUTION_STATUSES
);

function isPlainObject(value) {
    return Boolean(
        value &&
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

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(
        object,
        property
    );
}

function getPrerequisiteResult(
    prerequisiteResults,
    domain
) {
    if (!isPlainObject(prerequisiteResults)) {
        return undefined;
    }

    return prerequisiteResults[domain];
}

function createBlockedResolution(
    domain,
    missingInputs,
    sourceDomains = []
) {
    return {
        contractVersion:
            INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION,

        resolutionType:
            INTEGRATION_INPUT_RESOLUTION_TYPE,

        domain,

        status: "blocked",

        missingInputs: [
            ...missingInputs
        ],

        sourceDomains: [
            ...sourceDomains
        ]
    };
}

function createResolvedResolution(
    domain,
    serviceArguments,
    sourceDomains = []
) {
    return {
        contractVersion:
            INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION,

        resolutionType:
            INTEGRATION_INPUT_RESOLUTION_TYPE,

        domain,

        status: "resolved",

        serviceArguments,

        sourceDomains: [
            ...sourceDomains
        ]
    };
}

function resolveSoilIntelligence(
    inputs
) {
    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "sample") ||
        inputs.sample === undefined ||
        inputs.sample === null
    ) {
        return createBlockedResolution(
            "SOIL_INTELLIGENCE",
            ["inputs.sample"]
        );
    }

    return createResolvedResolution(
        "SOIL_INTELLIGENCE",
        {
            sample: inputs.sample
        },
        ["inputs.sample"]
    );
}

function resolveSpatialIntelligence(
    inputs
) {
    const missingInputs = [];

    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "latitude") ||
        inputs.latitude === undefined ||
        inputs.latitude === null
    ) {
        missingInputs.push("inputs.latitude");
    }

    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "longitude") ||
        inputs.longitude === undefined ||
        inputs.longitude === null
    ) {
        missingInputs.push("inputs.longitude");
    }

    if (missingInputs.length > 0) {
        return createBlockedResolution(
            "SPATIAL_INTELLIGENCE",
            missingInputs
        );
    }

    return createResolvedResolution(
        "SPATIAL_INTELLIGENCE",
        {
            latitude: inputs.latitude,
            longitude: inputs.longitude
        },
        [
            "inputs.latitude",
            "inputs.longitude"
        ]
    );
}

function resolveCropSuitability(
    inputs,
    prerequisiteResults
) {
    const missingInputs = [];
    const soilResult =
        getPrerequisiteResult(
            prerequisiteResults,
            "SOIL_INTELLIGENCE"
        );

    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "sample") ||
        inputs.sample === undefined ||
        inputs.sample === null
    ) {
        missingInputs.push("inputs.sample");
    }

    if (
        soilResult === undefined ||
        soilResult === null
    ) {
        missingInputs.push(
            "SOIL_INTELLIGENCE.result"
        );
    }

    if (missingInputs.length > 0) {
        return createBlockedResolution(
            "CROP_SUITABILITY",
            missingInputs,
            ["SOIL_INTELLIGENCE"]
        );
    }

    return createResolvedResolution(
        "CROP_SUITABILITY",
        {
            sample: inputs.sample,
            analysis: soilResult
        },
        [
            "inputs.sample",
            "SOIL_INTELLIGENCE.result"
        ]
    );
}

function resolveFertilityZoning(
    inputs
) {
    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "options") ||
        inputs.options === undefined ||
        inputs.options === null
    ) {
        return createBlockedResolution(
            "FERTILITY_ZONING",
            ["inputs.options"]
        );
    }

    return createResolvedResolution(
        "FERTILITY_ZONING",
        {
            options: inputs.options
        },
        ["inputs.options"]
    );
}

function resolveHistoricalContext(
    inputs
) {
    const missingInputs = [];

    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "sampleId") ||
        inputs.sampleId === undefined ||
        inputs.sampleId === null
    ) {
        missingInputs.push(
            "inputs.sampleId"
        );
    }

    if (
        !isPlainObject(inputs) ||
        !hasOwn(inputs, "parameter") ||
        inputs.parameter === undefined ||
        inputs.parameter === null
    ) {
        missingInputs.push(
            "inputs.parameter"
        );
    }

    if (missingInputs.length > 0) {
        return createBlockedResolution(
            "HISTORICAL_CONTEXT",
            missingInputs
        );
    }

    return createResolvedResolution(
        "HISTORICAL_CONTEXT",
        {
            sampleId: inputs.sampleId,
            parameter: inputs.parameter
        },
        [
            "inputs.sampleId",
            "inputs.parameter"
        ]
    );
}

function resolveTemporalObservation(
    inputs
) {
    if (
        !isPlainObject(inputs) ||
        !Array.isArray(
            inputs.observationRequests
        ) ||
        inputs.observationRequests.length === 0
    ) {
        return createBlockedResolution(
            "TEMPORAL_OBSERVATION",
            ["inputs.observationRequests"]
        );
    }

    try {
        const observationRequests =
            inputs.observationRequests.map(
                request =>
                    createTemporalObservationWorkflowRequestContract(
                        request
                    )
            );

        return createResolvedResolution(
            "TEMPORAL_OBSERVATION",
            {
                observationRequests
            },
            ["inputs.observationRequests"]
        );
    } catch (error) {
        return createBlockedResolution(
            "TEMPORAL_OBSERVATION",
            [
                `inputs.observationRequests: ${
                    error.message
                }`
            ]
        );
    }
}

function resolveTemporalComposition(
    inputs,
    prerequisiteResults
) {
    const missingInputs = [];

    if (
        !isPlainObject(inputs) ||
        !isPlainObject(inputs.composition)
    ) {
        missingInputs.push(
            "inputs.composition"
        );
    }

    const observationResult =
        getPrerequisiteResult(
            prerequisiteResults,
            "TEMPORAL_OBSERVATION"
        );

    if (
        observationResult === undefined ||
        observationResult === null
    ) {
        missingInputs.push(
            "TEMPORAL_OBSERVATION.result"
        );
    }

    if (missingInputs.length > 0) {
        return createBlockedResolution(
            "TEMPORAL_COMPOSITION",
            missingInputs,
            ["TEMPORAL_OBSERVATION"]
        );
    }

    if (
        !Array.isArray(
            observationResult
        )
    ) {
        return createBlockedResolution(
            "TEMPORAL_COMPOSITION",
            [
                "TEMPORAL_OBSERVATION.result must be an array of completed observations."
            ],
            ["TEMPORAL_OBSERVATION"]
        );
    }

    const composition =
        inputs.composition;

    try {
        const request =
            createTemporalCompositionWorkflowRequest({
                contractVersion: "1.0",
                compositionId:
                    composition.compositionId,
                indexCode:
                    composition.indexCode,
                observations:
                    observationResult,
                temporalContext:
                    composition.temporalContext,
                spatialContext:
                    composition.spatialContext,
                processingContext:
                    composition.processingContext,
                metadata:
                    composition.metadata
            });

        return createResolvedResolution(
            "TEMPORAL_COMPOSITION",
            {
                request
            },
            [
                "inputs.composition",
                "TEMPORAL_OBSERVATION.result"
            ]
        );
    } catch (error) {
        return createBlockedResolution(
            "TEMPORAL_COMPOSITION",
            [
                `inputs.composition: ${
                    error.message
                }`
            ],
            ["TEMPORAL_OBSERVATION"]
        );
    }
}

function resolveTemporalAnalysis(
    inputs,
    prerequisiteResults
) {
    const missingInputs = [];

    if (
        !isPlainObject(inputs) ||
        !isPlainObject(inputs.analysis)
    ) {
        missingInputs.push(
            "inputs.analysis"
        );
    }

    const compositionResult =
        getPrerequisiteResult(
            prerequisiteResults,
            "TEMPORAL_COMPOSITION"
        );

    if (
        compositionResult === undefined ||
        compositionResult === null
    ) {
        missingInputs.push(
            "TEMPORAL_COMPOSITION.result"
        );
    }

    if (missingInputs.length > 0) {
        return createBlockedResolution(
            "TEMPORAL_ANALYSIS",
            missingInputs,
            ["TEMPORAL_COMPOSITION"]
        );
    }

    if (
        !isPlainObject(compositionResult)
    ) {
        return createBlockedResolution(
            "TEMPORAL_ANALYSIS",
            [
                "TEMPORAL_COMPOSITION.result must be a composition object."
            ],
            ["TEMPORAL_COMPOSITION"]
        );
    }

    const analysis =
        inputs.analysis;

    try {
        const request =
            createTemporalAnalysisWorkflowRequest({
                contractVersion: "1.0",
                analysisId:
                    analysis.analysisId,
                analysisType:
                    analysis.analysisType,
                composition:
                    compositionResult,
                parameters:
                    analysis.parameters,
                metadata:
                    analysis.metadata
            });

        return createResolvedResolution(
            "TEMPORAL_ANALYSIS",
            {
                request
            },
            [
                "inputs.analysis",
                "TEMPORAL_COMPOSITION.result"
            ]
        );
    } catch (error) {
        return createBlockedResolution(
            "TEMPORAL_ANALYSIS",
            [
                `inputs.analysis: ${
                    error.message
                }`
            ],
            ["TEMPORAL_COMPOSITION"]
        );
    }
}

function resolveIntegrationDomainInputs(
    domain,
    inputs = {},
    context = {},
    prerequisiteResults = {}
) {
    if (!DOMAIN_SET.has(domain)) {
        return createBlockedResolution(
            domain,
            [`unsupported domain: ${domain}`]
        );
    }

    switch (domain) {
        case "SOIL_INTELLIGENCE":
            return resolveSoilIntelligence(
                inputs,
                context
            );

        case "SPATIAL_INTELLIGENCE":
            return resolveSpatialIntelligence(
                inputs,
                context
            );

        case "CROP_SUITABILITY":
            return resolveCropSuitability(
                inputs,
                prerequisiteResults
            );

        case "FERTILITY_ZONING":
            return resolveFertilityZoning(
                inputs,
                context
            );

        case "HISTORICAL_CONTEXT":
            return resolveHistoricalContext(
                inputs,
                context
            );

        case "TEMPORAL_OBSERVATION":
            return resolveTemporalObservation(
                inputs,
                context
            );

        case "TEMPORAL_COMPOSITION":
            return resolveTemporalComposition(
                inputs,
                prerequisiteResults
            );

        case "TEMPORAL_ANALYSIS":
            return resolveTemporalAnalysis(
                inputs,
                prerequisiteResults
            );

        default:
            return createBlockedResolution(
                domain,
                [`unsupported domain: ${domain}`]
            );
    }
}

function validateIntegrationInputResolution(
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

    REQUIRED_FIELDS.forEach(
        field => {
            if (!hasOwn(resolution, field)) {
                errors.push(
                    `Missing required field: ${field}.`
                );
            }
        }
    );

    if (
        resolution.contractVersion !==
        INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION}".`
        );
    }

    if (
        resolution.resolutionType !==
        INTEGRATION_INPUT_RESOLUTION_TYPE
    ) {
        errors.push(
            `resolutionType must be "${INTEGRATION_INPUT_RESOLUTION_TYPE}".`
        );
    }

    if (
        typeof resolution.domain !== "string" ||
        !DOMAIN_SET.has(resolution.domain)
    ) {
        errors.push(
            "domain must be a supported integration domain."
        );
    }

    if (
        typeof resolution.status !== "string" ||
        !STATUS_SET.has(resolution.status)
    ) {
        errors.push(
            "status must be a supported resolution status."
        );
    }

    if (resolution.status === "resolved") {
        if (
            !isPlainObject(
                resolution.serviceArguments
            )
        ) {
            errors.push(
                "resolved input resolution requires serviceArguments."
            );
        }

        if (
            !Array.isArray(
                resolution.sourceDomains
            )
        ) {
            errors.push(
                "resolved input resolution requires sourceDomains."
            );
        }

        if (
            resolution.missingInputs !== undefined
        ) {
            errors.push(
                "resolved input resolution must not contain missingInputs."
            );
        }
    }

    if (resolution.status === "blocked") {
        if (
            !Array.isArray(
                resolution.missingInputs
            ) ||
            resolution.missingInputs.length === 0
        ) {
            errors.push(
                "blocked input resolution requires missingInputs."
            );
        }

        if (
            resolution.serviceArguments !== undefined
        ) {
            errors.push(
                "blocked input resolution must not contain serviceArguments."
            );
        }
    }

    if (
        resolution.sourceDomains !== undefined &&
        !Array.isArray(
            resolution.sourceDomains
        )
    ) {
        errors.push(
            "sourceDomains must be an array when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    INTEGRATION_INPUT_RESOLUTION_CONTRACT_VERSION,
    INTEGRATION_INPUT_RESOLUTION_TYPE,
    INTEGRATION_DOMAINS,
    RESOLUTION_STATUSES,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    resolveIntegrationDomainInputs,
    validateIntegrationInputResolution
};