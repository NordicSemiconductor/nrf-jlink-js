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

type JLinkNotInstalled = {
    status: 'not installed';
    versionToBeInstalled: string;
};

type JLinkNotInstalledNonAvailable = {
    status: 'not installed but none available';
};

type JLinkUpToDate = {
    status: 'up to date';
    installedVersion: string;
    versionToBeInstalled?: string;
};

type JLinkShouldBeUpdated = {
    status: 'should be updated';
    installedVersion?: string;
    versionToBeInstalled: string;
};

export type JLinkState =
    | JLinkNotInstalled
    | JLinkNotInstalledNonAvailable
    | JLinkUpToDate
    | JLinkShouldBeUpdated;

export const getJLinkState = async ({
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

    if (installedVersion == null) {
        if (versionToBeInstalled == null) {
            return { status: 'not installed but none available' };
        }

        return { status: 'not installed', versionToBeInstalled };
    }

    /* If `versionToBeInstalled` is undefined we do not really know but at
    least there is some J-Link installed and we do not know that it is
    outdated. So, we return 'up to date', but this may be changed to a
    fifth state "installed, unknown if up-to-date" if we see the need for
    this in the future. */
    if (
        versionToBeInstalled == null ||
        isValidVersion(installedVersion, versionToBeInstalled)
    ) {
        return { status: 'up to date', installedVersion, versionToBeInstalled };
    }

    return {
        status: 'should be updated',
        installedVersion,
        versionToBeInstalled,
    };
};
