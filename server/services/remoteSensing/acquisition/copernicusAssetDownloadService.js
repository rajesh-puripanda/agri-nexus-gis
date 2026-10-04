"use strict";

const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const MAX_DOWNLOAD_ATTEMPTS = 5;

function isTransientDownloadError(error) {
    return (
        error?.cause?.code === "ECONNRESET" ||
        error?.cause?.code === "ETIMEDOUT" ||
        error?.cause?.code === "ECONNREFUSED" ||
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNREFUSED" ||
        error?.message === "fetch failed"
    );
}

async function downloadAsset({
    asset,
    outputPath,
    accessToken,
    fetchImpl = globalThis.fetch
} = {}) {
    if (!asset || typeof asset !== "object") {
        throw new TypeError(
            "CDSE asset is required."
        );
    }

    const url =
        asset.alternate?.https?.href;

    if (!url) {
        throw new Error(
            "CDSE asset does not contain an HTTPS download URL."
        );
    }

    if (!accessToken) {
        throw new Error(
            "CDSE access token is required."
        );
    }

    if (
        typeof outputPath !== "string" ||
        outputPath.trim().length === 0
    ) {
        throw new TypeError(
            "outputPath must be a non-empty string."
        );
    }

    const directory =
        path.dirname(outputPath);

    await fs.promises.mkdir(
        directory,
        { recursive: true }
    );

    for (
        let attempt = 1;
        attempt <= MAX_DOWNLOAD_ATTEMPTS;
        attempt++
    ) {
        let response;

        try {
            response = await fetchImpl(
                url,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${accessToken}`
                    }
                }
            );
        } catch (error) {
            if (
                !isTransientDownloadError(error) ||
                attempt === MAX_DOWNLOAD_ATTEMPTS
            ) {
                throw error;
            }

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000 * attempt
                    )
            );

            continue;
        }

        if (!response.ok) {
            const error =
                new Error(
                    `CDSE asset download failed: ` +
                    `${response.status} ` +
                    `${response.statusText}`
                );

            error.code =
                "CDSE_ASSET_DOWNLOAD_FAILED";

            error.status =
                response.status;

            throw error;
        }

        if (!response.body) {
            throw new Error(
                "CDSE asset download response has no body."
            );
        }

        try {
            const readable =
                Readable.fromWeb(
                    response.body
                );

            const writable =
                fs.createWriteStream(
                    outputPath
                );

            await pipeline(
                readable,
                writable
            );

            return {
                outputPath,
                url
            };
        } catch (error) {
            try {
                await fs.promises.rm(
                    outputPath,
                    { force: true }
                );
            } catch {}

            if (
                isTransientDownloadError(error) &&
                attempt < MAX_DOWNLOAD_ATTEMPTS
            ) {
                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1000 * attempt
                        )
                );

                continue;
            }

            throw error;
        }
    }

    throw new Error(
        "CDSE asset download failed after retries."
    );
}

module.exports = {
    downloadAsset
};
