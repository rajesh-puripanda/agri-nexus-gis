"use strict";

const fs = require("fs");
const path = require("path");

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
        throw new TypeError("CDSE asset is required.");
    }

    const url = asset.alternate?.https?.href;

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

    const directory = path.dirname(outputPath);

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
                (resolve) =>
                    setTimeout(
                        resolve,
                        1000 * attempt
                    )
            );

            continue;
        }

        if (!response.ok) {
            const error = new Error(
                `CDSE asset download failed: ${response.status} ${response.statusText}`
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

        const fileHandle =
            await fs.promises.open(
                outputPath,
                "w"
            );

        try {
            const reader =
                response.body.getReader();

            const writable =
                fileHandle.createWriteStream();

            try {
                while (true) {
                    const { done, value } =
                        await reader.read();

                    if (done) {
                        break;
                    }

                    if (value) {
                        if (!writable.write(value)) {
                            await new Promise(
                                (resolve) =>
                                    writable.once(
                                        "drain",
                                        resolve
                                    )
                            );
                        }
                    }
                }

                await new Promise(
                    (resolve, reject) => {
                        writable.end(
                            resolve
                        );

                        writable.once(
                            "error",
                            reject
                        );
                    }
                );
            } finally {
                writable.destroy();
            }
        } catch (error) {
            await fileHandle.close();

            try {
                await fs.promises.unlink(
                    outputPath
                );
            } catch {}

            if (
                isTransientDownloadError(error) &&
                attempt < MAX_DOWNLOAD_ATTEMPTS
            ) {
                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            1000 * attempt
                        )
                );

                continue;
            }

            throw error;
        }

        await fileHandle.close();

        return {
            outputPath,
            url
        };
    }

    throw new Error(
        "CDSE asset download failed after retries."
    );
}

module.exports = {
    MAX_DOWNLOAD_ATTEMPTS,
    isTransientDownloadError,
    downloadAsset
};
