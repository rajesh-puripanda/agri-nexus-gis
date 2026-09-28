"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    INTEGRATION_EXECUTION_CONTRACT_VERSION,
    INTEGRATION_EXECUTION_TYPE,
    INTEGRATION_DOMAINS,
    EXECUTION_STATUSES,
    REQUIRED_FIELDS,
    OPTIONAL_FIELDS,
    validateIntegrationExecution,
    createIntegrationExecution
} = require(
    "../scientific/integration/integrationExecutionContract"
);

function makeResolvedDomain(domain) {
    return {
        domain,
        authoritativeService:
            `server/services/${domain}.js`,
        authoritativeEntryPoint:
            "authoritativeEntryPoint",
        requiredInputs: [],
        prerequisites: []
    };
}

function makeCompletedResult(domain) {
    return {
        domain,
        status: "completed",
        result: {
            domain,
            scientificResult: true
        },
        prerequisites: []
    };
}

function makeValidExecution() {
    return {
        contractVersion:
            INTEGRATION_EXECUTION_CONTRACT_VERSION,

        executionType:
            INTEGRATION_EXECUTION_TYPE,

        requestedDomains: [
            "SOIL_INTELLIGENCE"
        ],

        resolvedDomains: [
            makeResolvedDomain(
                "SOIL_INTELLIGENCE"
            )
        ],

        domainResults: [
            makeCompletedResult(
                "SOIL_INTELLIGENCE"
            )
        ]
    };
}

test(
    "integration execution contract version and type are defined correctly",
    () => {
        assert.equal(
            INTEGRATION_EXECUTION_CONTRACT_VERSION,
            "1.0"
        );

        assert.equal(
            INTEGRATION_EXECUTION_TYPE,
            "INTEGRATION_EXECUTION_RESULT"
        );
    }
);

test(
    "required and optional execution fields are defined correctly",
    () => {
        assert.deepEqual(
            REQUIRED_FIELDS,
            [
                "contractVersion",
                "executionType",
                "requestedDomains",
                "resolvedDomains",
                "domainResults"
            ]
        );

        assert.deepEqual(
            OPTIONAL_FIELDS,
            [
                "executionMetadata"
            ]
        );
    }
);

test(
    "all eight authoritative integration domains are defined",
    () => {
        assert.equal(
            INTEGRATION_DOMAINS.length,
            8
        );

        assert.deepEqual(
            INTEGRATION_DOMAINS,
            [
                "SOIL_INTELLIGENCE",
                "SPATIAL_INTELLIGENCE",
                "CROP_SUITABILITY",
                "FERTILITY_ZONING",
                "HISTORICAL_CONTEXT",
                "TEMPORAL_OBSERVATION",
                "TEMPORAL_COMPOSITION",
                "TEMPORAL_ANALYSIS"
            ]
        );
    }
);

test(
    "execution statuses are explicitly defined",
    () => {
        assert.deepEqual(
            EXECUTION_STATUSES,
            [
                "completed",
                "blocked",
                "failed"
            ]
        );
    }
);

test(
    "valid completed integration execution is accepted",
    () => {
        const result =
            validateIntegrationExecution(
                makeValidExecution()
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.errors,
            []
        );
    }
);

test(
    "null and non-object executions are rejected",
    () => {
        assert.equal(
            validateIntegrationExecution(
                null
            ).valid,
            false
        );

        assert.equal(
            validateIntegrationExecution(
                []
            ).valid,
            false
        );

        assert.equal(
            validateIntegrationExecution(
                "invalid"
            ).valid,
            false
        );
    }
);

test(
    "invalid execution contract version is rejected",
    () => {
        const execution =
            makeValidExecution();

        execution.contractVersion =
            "9.9";

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "contractVersion"
                    )
            )
        );
    }
);

test(
    "invalid execution type is rejected",
    () => {
        const execution =
            makeValidExecution();

        execution.executionType =
            "INVALID_EXECUTION";

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "executionType"
                    )
            )
        );
    }
);

test(
    "requested domains must be a non-empty array",
    () => {
        const execution =
            makeValidExecution();

        execution.requestedDomains = [];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "requested domains must not contain duplicates",
    () => {
        const execution =
            makeValidExecution();

        execution.requestedDomains = [
            "SOIL_INTELLIGENCE",
            "SOIL_INTELLIGENCE"
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );

        assert.ok(
            result.errors.some(
                error =>
                    error.includes(
                        "duplicates"
                    )
            )
        );
    }
);

test(
    "unsupported requested domain is rejected",
    () => {
        const execution =
            makeValidExecution();

        execution.requestedDomains = [
            "UNSUPPORTED_DOMAIN"
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "resolved domain definitions require authoritative service metadata",
    () => {
        const execution =
            makeValidExecution();

        delete execution
            .resolvedDomains[0]
            .authoritativeService;

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "resolved domain definitions require prerequisite arrays",
    () => {
        const execution =
            makeValidExecution();

        delete execution
            .resolvedDomains[0]
            .prerequisites;

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "completed domain results require a result payload",
    () => {
        const execution =
            makeValidExecution();

        delete execution
            .domainResults[0]
            .result;

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "blocked domain results explicitly preserve missing inputs",
    () => {
        const execution =
            makeValidExecution();

        execution.domainResults = [
            {
                domain:
                    "CROP_SUITABILITY",
                status:
                    "blocked",
                result:
                    null,
                prerequisites: [
                    "SOIL_INTELLIGENCE"
                ],
                missingInputs: [
                    "sample"
                ]
            }
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            true
        );
    }
);

test(
    "blocked domain results cannot contain a scientific result",
    () => {
        const execution =
            makeValidExecution();

        execution.domainResults = [
            {
                domain:
                    "CROP_SUITABILITY",
                status:
                    "blocked",
                result: {
                    fabricated: true
                },
                prerequisites: [],
                missingInputs: [
                    "sample"
                ]
            }
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "failed domain results require an error description",
    () => {
        const execution =
            makeValidExecution();

        execution.domainResults = [
            {
                domain:
                    "SOIL_INTELLIGENCE",
                status:
                    "failed",
                result:
                    null,
                prerequisites: []
            }
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "domain result statuses must be supported",
    () => {
        const execution =
            makeValidExecution();

        execution.domainResults[0]
            .status =
            "running";

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "domain result domains must not be duplicated",
    () => {
        const execution =
            makeValidExecution();

        execution.domainResults = [
            makeCompletedResult(
                "SOIL_INTELLIGENCE"
            ),
            makeCompletedResult(
                "SOIL_INTELLIGENCE"
            )
        ];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "execution metadata is optional",
    () => {
        const execution =
            makeValidExecution();

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            true
        );
    }
);

test(
    "execution metadata must be a plain object",
    () => {
        const execution =
            makeValidExecution();

        execution.executionMetadata =
            [];

        const result =
            validateIntegrationExecution(
                execution
            );

        assert.equal(
            result.valid,
            false
        );
    }
);

test(
    "factory creates a normalized integration execution result",
    () => {
        const execution =
            createIntegrationExecution({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],
                resolvedDomains: [
                    {
                        ...makeResolvedDomain(
                            "SOIL_INTELLIGENCE"
                        ),
                        requiredInputs: [
                            "sample"
                        ],
                        prerequisites: []
                    }
                ],
                domainResults: [
                    {
                        ...makeCompletedResult(
                            "SOIL_INTELLIGENCE"
                        ),
                        prerequisites: []
                    }
                ]
            });

        assert.equal(
            execution.contractVersion,
            "1.0"
        );

        assert.equal(
            execution.executionType,
            "INTEGRATION_EXECUTION_RESULT"
        );

        assert.deepEqual(
            execution.requestedDomains,
            [
                "SOIL_INTELLIGENCE"
            ]
        );

        assert.deepEqual(
            execution.resolvedDomains[0]
                .requiredInputs,
            [
                "sample"
            ]
        );

        assert.deepEqual(
            execution.domainResults[0]
                .prerequisites,
            []
        );
    }
);

test(
    "factory preserves execution metadata",
    () => {
        const execution =
            createIntegrationExecution({
                requestedDomains: [
                    "SOIL_INTELLIGENCE"
                ],
                resolvedDomains: [
                    makeResolvedDomain(
                        "SOIL_INTELLIGENCE"
                    )
                ],
                domainResults: [
                    makeCompletedResult(
                        "SOIL_INTELLIGENCE"
                    )
                ],
                executionMetadata: {
                    phase:
                        "8.14.16"
                }
            });

        assert.deepEqual(
            execution.executionMetadata,
            {
                phase:
                    "8.14.16"
            }
        );
    }
);

test(
    "factory rejects invalid execution with typed error",
    () => {
        assert.throws(
            () =>
                createIntegrationExecution({
                    requestedDomains: [
                        "INVALID_DOMAIN"
                    ],
                    resolvedDomains: [],
                    domainResults: []
                }),
            error => {
                assert.equal(
                    error.code,
                    "INVALID_INTEGRATION_EXECUTION"
                );

                assert.ok(
                    Array.isArray(
                        error.validationErrors
                    )
                );

                return true;
            }
        );
    }
);
