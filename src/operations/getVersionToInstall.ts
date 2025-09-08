/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { fetchIndex } from './fetchIndex';
import {
    getInstalledJLinkVersion,
    isValidVersion,
} from '../shared/jLinkVersion';

interface JLinkState {
    outdated: boolean;
    installed: boolean;
    versionToBeInstalled?: string;
    installedVersion?: string;
}

export const getVersionToInstall = async ({
    fallbackVersion,
    checkOnline = true,
}: {
    fallbackVersion?: string;
    checkOnline?: boolean;
} = {}): Promise<JLinkState> => {
    const onlineRecommendedVersion = checkOnline
        ? (await fetchIndex().catch(() => undefined))?.version
        : undefined;
    const versionToBeInstalled = onlineRecommendedVersion ?? fallbackVersion;
    const installedVersion = await getInstalledJLinkVersion().catch(
        () => undefined
    );
    const installed = !!installedVersion;
    const outdated =
        !installed ||
        !versionToBeInstalled ||
        !isValidVersion(installedVersion, versionToBeInstalled);

    return {
        outdated,
        installedVersion,
        installed,
        versionToBeInstalled,
    };
};
