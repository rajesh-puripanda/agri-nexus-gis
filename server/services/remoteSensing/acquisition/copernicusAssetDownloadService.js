"use strict";

const fs = require("fs");
const path = require("path");

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

    const response = await fetchImpl(
        url,
        {
            method: "GET",
            headers: {
                Authorization:
                    `Bearer ${accessToken}`
            }
        }
    );

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

    const directory =
        path.dirname(outputPath);

    await fs.promises.mkdir(
        directory,
        { recursive: true }
    );

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

                writable.write(value);
            }
        } finally {
            writable.end();

            await new Promise(
                (resolve, reject) => {
                    writable.on(
                        "finish",
                        resolve
                    );

                    writable.on(
                        "error",
                        reject
                    );
                }
            );
        }
    } finally {
        await fileHandle.close();
    }

    return {
        outputPath
    };
}

module.exports = {
    downloadAsset
};
