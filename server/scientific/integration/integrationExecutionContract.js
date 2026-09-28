"use strict";

/**
 * ============================================================
 * Integration Execution Contract
 * ============================================================
 *
 * AgriNexus GIS
 *
 * Phase 8.14.16
 *
 * Responsibility:
 *   Define the structural result boundary for execution of
 *   resolved Integrated Agricultural Intelligence domains.
 *
 * This contract does NOT:
 *   - execute services
 *   - calculate scientific results
 *   - classify agricultural data
 *   - calculate scores
 *   - rank domains
 *   - apply weights
 *   - infer missing scientific values
 *   - substitute missing prerequisites
 *
 * Scientific authority remains within the existing domain
 * services and workflow contracts.
 *
 * ============================================================
 */

const INTEGRATION_EXECUTION_CONTRACT_VERSION = "1.0";

const INTEGRATION_EXECUTION_TYPE =
    "INTEGRATION_EXECUTION_RESULT";

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

const INTEGRATION_DOMAIN_SET =
    new Set(INTEGRATION_DOMAINS);

const EXECUTION_STATUSES = Object.freeze([
    "completed",
    "blocked",
    "failed"
]);

const EXECUTION_STATUS_SET =
    new Set(EXECUTION_STATUSES);

const REQUIRED_FIELDS = Object.freeze([
    "contractVersion",
    "executionType",
    "requestedDomains",
    "resolvedDomains",
    "domainResults"
]);

const OPTIONAL_FIELDS = Object.freeze([
    "executionMetadata"
]);

function isPlainObject(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function validateDomainArray(
    domains,
    fieldName
) {
    const errors = [];

    if (
        !Array.isArray(domains) ||
        domains.length === 0
    ) {
        errors.push(
            `${fieldName} must be a non-empty array.`
        );

        return errors;
    }

    const uniqueDomains =
        new Set(domains);

    if (
        uniqueDomains.size !==
        domains.length
    ) {
        errors.push(
            `${fieldName} must not contain duplicates.`
        );
    }

    domains.forEach(
        (domain, index) => {
            if (
                typeof domain !== "string" ||
                !INTEGRATION_DOMAIN_SET.has(domain)
            ) {
                errors.push(
                    `${fieldName}[${index}] contains an unsupported integration domain.`
                );
            }
        }
    );

    return errors;
}

function validateResolvedDomains(
    resolvedDomains
) {
    const errors = [];

    if (
        !Array.isArray(resolvedDomains) ||
        resolvedDomains.length === 0
    ) {
        errors.push(
            "resolvedDomains must be a non-empty array."
        );

        return errors;
    }

    const resolvedNames =
        resolvedDomains.map(
            entry =>
                isPlainObject(entry)
                    ? entry.domain
                    : undefined
        );

    if (
        new Set(resolvedNames).size !==
        resolvedNames.length
    ) {
        errors.push(
            "resolvedDomains must not contain duplicates."
        );
    }

    resolvedDomains.forEach(
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

    return errors;
}

function validateDomainResults(
    domainResults
) {
    const errors = [];

    if (
        !Array.isArray(domainResults) ||
        domainResults.length === 0
    ) {
        errors.push(
            "domainResults must be a non-empty array."
        );

        return errors;
    }

    const resultDomains =
        domainResults.map(
            entry =>
                isPlainObject(entry)
                    ? entry.domain
                    : undefined
        );

    if (
        new Set(resultDomains).size !==
        resultDomains.length
    ) {
        errors.push(
            "domainResults must not contain duplicate domains."
        );
    }

    domainResults.forEach(
        (entry, index) => {
            if (!isPlainObject(entry)) {
                errors.push(
                    `domainResults[${index}] must be a plain object.`
                );
                return;
            }

            if (
                !INTEGRATION_DOMAIN_SET.has(
                    entry.domain
                )
            ) {
                errors.push(
                    `domainResults[${index}].domain is unsupported.`
                );
            }

            if (
                !EXECUTION_STATUS_SET.has(
                    entry.status
                )
            ) {
                errors.push(
                    `domainResults[${index}].status must be one of: ${EXECUTION_STATUSES.join(", ")}.`
                );
            }

            if (
                !Array.isArray(
                    entry.prerequisites
                )
            ) {
                errors.push(
                    `domainResults[${index}].prerequisites must be an array.`
                );
            }

            if (
                entry.missingInputs !== undefined &&
                !Array.isArray(
                    entry.missingInputs
                )
            ) {
                errors.push(
                    `domainResults[${index}].missingInputs must be an array when provided.`
                );
            }

            if (
                entry.status === "completed" &&
                entry.result === undefined
            ) {
                errors.push(
                    `domainResults[${index}].result is required when status is completed.`
                );
            }

            if (
                entry.status === "blocked" &&
                entry.result !== null &&
                entry.result !== undefined
            ) {
                errors.push(
                    `domainResults[${index}].result must be null or undefined when status is blocked.`
                );
            }

            if (
                entry.status === "failed" &&
                typeof entry.error !== "string"
            ) {
                errors.push(
                    `domainResults[${index}].error must be a string when status is failed.`
                );
            }
        }
    );

    return errors;
}

function validateIntegrationExecution(
    execution
) {
    const errors = [];

    if (!isPlainObject(execution)) {
        return {
            valid: false,
            errors: [
                "execution must be a plain object."
            ]
        };
    }

    if (
        execution.contractVersion !==
        INTEGRATION_EXECUTION_CONTRACT_VERSION
    ) {
        errors.push(
            `contractVersion must be "${INTEGRATION_EXECUTION_CONTRACT_VERSION}".`
        );
    }

    if (
        execution.executionType !==
        INTEGRATION_EXECUTION_TYPE
    ) {
        errors.push(
            `executionType must be "${INTEGRATION_EXECUTION_TYPE}".`
        );
    }

    errors.push(
        ...validateDomainArray(
            execution.requestedDomains,
            "requestedDomains"
        )
    );

    errors.push(
        ...validateResolvedDomains(
            execution.resolvedDomains
        )
    );

    errors.push(
        ...validateDomainResults(
            execution.domainResults
        )
    );

    if (
        execution.executionMetadata !== undefined &&
        !isPlainObject(
            execution.executionMetadata
        )
    ) {
        errors.push(
            "executionMetadata must be a plain object when provided."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function createIntegrationExecution(
    input = {}
) {
    const source =
        isPlainObject(input)
            ? input
            : {};

    const execution = {
        contractVersion:
            INTEGRATION_EXECUTION_CONTRACT_VERSION,

        executionType:
            INTEGRATION_EXECUTION_TYPE,

        requestedDomains:
            Array.isArray(
                source.requestedDomains
            )
                ? [...source.requestedDomains]
                : [],

        resolvedDomains:
            Array.isArray(
                source.resolvedDomains
            )
                ? source.resolvedDomains.map(
                    entry => ({
                        ...entry,
                        requiredInputs:
                            Array.isArray(
                                entry.requiredInputs
                            )
                                ? [
                                    ...entry.requiredInputs
                                ]
                                : [],
                        prerequisites:
                            Array.isArray(
                                entry.prerequisites
                            )
                                ? [
                                    ...entry.prerequisites
                                ]
                                : []
                    })
                )
                : [],

        domainResults:
            Array.isArray(
                source.domainResults
            )
                ? source.domainResults.map(
                    entry => ({
                        ...entry,
                        prerequisites:
                            Array.isArray(
                                entry.prerequisites
                            )
                                ? [
                                    ...entry.prerequisites
                                ]
                                : [],
                        ...(Array.isArray(
                            entry.missingInputs
                        )
                            ? {
                                missingInputs: [
                                    ...entry.missingInputs
                                ]
                            }
                            : {})
                    })
                )
                : []
    };

    if (
        source.executionMetadata !== undefined
    ) {
        execution.executionMetadata =
            source.executionMetadata;
    }

    const validation =
        validateIntegrationExecution(
            execution
        );

    if (!validation.valid) {
        const error = new Error(
            "Invalid integration execution result."
        );

        error.code =
            "INVALID_INTEGRATION_EXECUTION";

        error.validationErrors =
            validation.errors;

        throw error;
    }

    return execution;
}

module.exports = {
    INTEGRATION_EXECUTION_CONTRACT_VERSION,
    INTEGRATION_EXECUTION_TYPE,
    INTEGRATION_DOMAINS,
    EXECUTION_STATUSES,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateIntegrationExecution,
    createIntegrationExecution
};
