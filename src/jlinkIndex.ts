/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { fetchJSON } from './net';

export const platforms = ['darwin', 'linux', 'win32'] as const;
export const archs = ['arm64', 'x64'] as const;
export type ArchUrl = Record<(typeof archs)[number], string>;
export type JLinkVariant = Record<(typeof platforms)[number], ArchUrl>;

export interface JLinkIndex {
    version: string;
    jlinkUrls: JLinkVariant;
}

export const indexUrl =
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
