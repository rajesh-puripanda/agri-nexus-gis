"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TOKEN_URL,
    getAccessToken
} = require(
    "../services/remoteSensing/acquisition/copernicusAuthService"
);

test("CDSE token URL is configured", () => {
    assert.match(
        TOKEN_URL,
        /^https:\/\/identity\.dataspace\.copernicus\.eu\//
    );
});

test("missing credentials are rejected", async () => {
    await assert.rejects(
        () =>
            getAccessToken({
                clientId: "",
                clientSecret: ""
            }),
        /CDSE client credentials are not configured/
    );
});

test("successful token response returns access token", async () => {
    const fetchImpl = async (url, options) => {
        assert.equal(url, TOKEN_URL);
        assert.equal(options.method, "POST");

        return {
            ok: true,
            json: async () => ({
                access_token: "TEST_TOKEN"
            })
        };
    };

    const token = await getAccessToken({
        clientId: "TEST_CLIENT",
        clientSecret: "TEST_SECRET",
        fetchImpl
    });

    assert.equal(token, "TEST_TOKEN");
});

test("authentication failure is reported", async () => {
    const fetchImpl = async () => ({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
    });

    await assert.rejects(
        () =>
            getAccessToken({
                clientId: "TEST_CLIENT",
                clientSecret: "TEST_SECRET",
                fetchImpl
            }),
        (error) => {
            assert.equal(
                error.code,
                "CDSE_AUTHENTICATION_FAILED"
            );

            assert.equal(
                error.status,
                401
            );

            return true;
        }
    );
});