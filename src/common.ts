/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const platforms = ['darwin', 'linux', 'win32'] as const;
export const archs = ['arm64', 'x64'] as const;
export type ArchUrl = Record<(typeof archs)[number], string>;
export type JLinkVariant = Record<(typeof platforms)[number], ArchUrl>;

export interface JLinkIndex {
    version: string;
    jlinkUrls: JLinkVariant;
}

const fetchJSON = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            Range: 'bytes=0-',
        },
    });
    if (!response.ok) {
        throw new Error(
            `Unable to fetch file from ${indexUrl}. Got status code ${status}.`
        );
    }
    return response.json();
};

const indexUrl =
    'https://files.nordicsemi.com/ui/api/v1/download?isNativeBrowsing=true&repoKey=swtools&path=external/ncd/jlink/index.json';
export const fetchIndex = async () => {
    const res = await fetchJSON<JLinkIndex>(indexUrl);

    if (
        res == null ||
        typeof res !== 'object' ||
        res.version === undefined ||
        res.jlinkUrls === undefined
    ) {
        throw new Error('`index.json` does not have the expected content.');
    }

    return res;
};

export const saveToFile = async (
    destinationFile: string,
    data: string | NodeJS.ArrayBufferView
): Promise<string> => {
    mkdirSync(path.dirname(destinationFile), { recursive: true });
    try {
        writeFileSync(destinationFile, data);
    } catch (e) {
        throw new Error(
            `Unable to write file to ${destinationFile}. Error: ${e}`
        );
    }
    return destinationFile;
};
