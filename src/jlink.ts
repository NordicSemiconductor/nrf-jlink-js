/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { fetchIndex } from './jlinkIndex';
import type { OnUpdate } from './update';
import { downloadJLink } from './downloadJLink';
import { installJLink } from './installJLink';
import { getInstalledJLinkVersion, isValidVersion } from './jLinkVersion';

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

export const downloadAndSaveJLink = (
    destinationDir: string,
    destinationFileName?: string,
    onUpdate?: OnUpdate
) =>
    fetchIndex().then(v =>
        downloadJLink(v, onUpdate, destinationDir, destinationFileName)
    );

export const downloadAndInstallJLink = (onUpdate?: OnUpdate) =>
    fetchIndex()
        .then(v => downloadJLink(v, onUpdate))
        .then(v => installJLink(v, onUpdate));
