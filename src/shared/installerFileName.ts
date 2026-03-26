/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import os from 'os';
import { getStandardisedVersion } from './jLinkVersion';

const platformToJlinkPlatform = (variant: NodeJS.Platform) => {
    switch (variant) {
        case 'win32':
            return 'Windows';
        case 'linux':
            return 'Linux';
        case 'darwin':
            return 'MacOSX';
        default:
            throw new Error(`Unknown variant ${variant}`);
    }
};

const getFileFormat = (platform: NodeJS.Platform) => {
    switch (platform) {
        case 'win32':
            return 'exe';
        case 'darwin':
            return 'pkg';
        case 'linux':
            return 'deb';
        default:
            throw new Error(`Unknown platform ${platform}`);
    }
};

export default (
    rawVersion: string,
    platform = os.platform(),
    arch = os.arch(),
): string => {
    const version = getStandardisedVersion(rawVersion);

    const formattedPlatform = platformToJlinkPlatform(platform);
    const formattedVersion = `V${version.major}${version.minor}${version.patch ?? ''}`;
    const formattedArch = arch === 'x64' ? 'x86_64' : arch;
    const formattedFileFormat = getFileFormat(platform);

    return `JLink_${formattedPlatform}_${formattedVersion}_${formattedArch}.${formattedFileFormat}`;
};
