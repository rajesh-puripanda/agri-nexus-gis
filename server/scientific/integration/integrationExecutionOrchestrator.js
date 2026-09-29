"use strict";

const {
    createIntegrationRequest
} = require("./integrationRequestContract");

const {
    createIntegrationDomainResolution
} = require("./integrationDomainResolutionContract");

const {
    resolveIntegrationDomainInputs,
    validateIntegrationInputResolution
} = require("./integrationInputResolutionContract");

const {
    executeIntegrationDomain
} = require("./integrationDomainExecutionAdapter");

const {
    createIntegrationExecution
} = require("./integrationExecutionContract");

const INTEGRATION_EXECUTION_ORCHESTRATOR_VERSION = "1.0";

const INTEGRATION_EXECUTION_ORCHESTRATOR_TYPE =
    "INTEGRATION_EXECUTION_ORCHESTRATOR";

function createExecutionFailure(
    domain,
    prerequisites,
    error
) {
    return {
        domain,
        status: "failed",
        prerequisites: [
            ...prerequisites
        ],
        error:
            error instanceof Error
                ? error.message
                : String(error)
    };
}

async function executeIntegrationRequest(
    requestInput = {}
) {
    const request =
        createIntegrationRequest(
            requestInput
        );

    const domainResolution =
        createIntegrationDomainResolution(
            request
        );

    const prerequisiteResults = {};

    const domainResults = [];

    for (
        const resolvedDomain
        of domainResolution.resolvedDomains
    ) {
        const domain =
            resolvedDomain.domain;

        const prerequisites =
            Array.isArray(
                resolvedDomain.prerequisites
            )
                ? [
                    ...resolvedDomain.prerequisites
                ]
                : [];

        const inputResolution =
            resolveIntegrationDomainInputs(
                domain,
                request.inputs,
                request.context,
                prerequisiteResults
            );

        const inputValidation =
            validateIntegrationInputResolution(
                inputResolution
            );

        if (!inputValidation.valid) {
            const error =
                new Error(
                    "Invalid integration input resolution."
                );

            error.code =
                "INVALID_INTEGRATION_INPUT_RESOLUTION";

            error.validationErrors =
                inputValidation.errors;

            throw error;
        }

        if (
            inputResolution.status ===
            "blocked"
        ) {
            const blockedResult = {
                domain,
                status: "blocked",
                prerequisites,
                missingInputs: [
                    ...inputResolution.missingInputs
                ],
                result: null
            };

            domainResults.push(
                blockedResult
            );

            prerequisiteResults[domain] =
                undefined;

            continue;
        }

        try {
            const result =
                await executeIntegrationDomain(
                    domain,
                    inputResolution.serviceArguments
                );

            domainResults.push({
                domain,
                status: "completed",
                prerequisites,
                result
            });

            prerequisiteResults[domain] =
                result;
        } catch (error) {
            domainResults.push(
                createExecutionFailure(
                    domain,
                    prerequisites,
                    error
                )
            );

            prerequisiteResults[domain] =
                undefined;
        }
    }

    const resolvedDomains =
        domainResolution.resolvedDomains.map(
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
        );

    return createIntegrationExecution({
        requestedDomains:
            domainResolution.requestedDomains,

        resolvedDomains,

        domainResults,

        executionMetadata: {
            orchestratorVersion:
                INTEGRATION_EXECUTION_ORCHESTRATOR_VERSION,

            orchestratorType:
                INTEGRATION_EXECUTION_ORCHESTRATOR_TYPE
        }
    });
}

module.exports = {
    INTEGRATION_EXECUTION_ORCHESTRATOR_VERSION,
    INTEGRATION_EXECUTION_ORCHESTRATOR_TYPE,
    executeIntegrationRequest
};
