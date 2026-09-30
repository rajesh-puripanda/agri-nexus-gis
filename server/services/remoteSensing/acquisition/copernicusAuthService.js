"use strict";

const TOKEN_URL =
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

async function getAccessToken({
    clientId = process.env.CDSE_CLIENT_ID,
    clientSecret = process.env.CDSE_CLIENT_SECRET,
    fetchImpl = globalThis.fetch
} = {}) {
    if (!clientId || !clientSecret) {
        throw new Error(
            "CDSE client credentials are not configured."
        );
    }

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
    });

    const response = await fetchImpl(
        TOKEN_URL,
        {
            method: "POST",
            headers: {
                "content-type":
                    "application/x-www-form-urlencoded"
            },
            body
        }
    );

    if (!response.ok) {
        const error = new Error(
            `CDSE authentication failed: ${response.status} ${response.statusText}`
        );

        error.code = "CDSE_AUTHENTICATION_FAILED";
        error.status = response.status;

        throw error;
    }

    const result = await response.json();

    if (!result.access_token) {
        throw new Error(
            "CDSE authentication response did not contain an access token."
        );
    }

    return result.access_token;
}

module.exports = {
    TOKEN_URL,
    getAccessToken
};