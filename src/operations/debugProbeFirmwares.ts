/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { readdirSync, readSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';

interface HostFirmwareInfo {
    filePath: string;
    compiledOn: Date;
}

interface HostFirmwares {
    [key: string]: HostFirmwareInfo;
}

/**
 * Reads the debug probe firmware files in the given JLink directory and returns
 * a map of their IDs and compilation dates.
 */
export const getHostFirmwareVersions = (jlinkDir: string): HostFirmwares => {
    const buffer = Buffer.alloc(64);

    return Object.fromEntries(
        readdirSync(join(jlinkDir, 'Firmwares'))
            .map(file => {
                const filePath = join(jlinkDir, 'Firmwares', file);
                const fd = openSync(filePath, 'r');
                readSync(fd, buffer, 0, buffer.length, 0);
                const [id, dateStr] = buffer
                    .toString()
                    .split('\0')[0]!
                    .split(' compiled ');
                closeSync(fd);
                return id && dateStr
                    ? [
                          id,
                          <HostFirmwareInfo>{
                              filePath,
                              compiledOn: new Date(dateStr),
                          },
                      ]
                    : undefined;
            })
            .filter(v => v !== undefined)
    );
};

/**
 * Returns whether a debug probe firmware update is available for the given device
 * based on the host firmware versions.
 *
 * @param jlinkObFirmwareVersion The connected debug probe firmware version as returned by
 *         `nrfutil --json --skip-overhead device device-info --serial-number ${serialNumber}`
 * @param hostFirmwares The host firmware versions as returned by `getHostFirmwareVersions`
 * @returns `true` if an update is available, `false` if not, or `undefined` if the
 *          information is insufficient to determine this.
 */
export const isDebugProbeFirmwareUpdateAvailable = (
    jlinkObFirmwareVersion: string,
    hostFirmwares: HostFirmwares
): boolean | undefined => {
    const [deviceObFirmwareId, deviceObFirmwareDateStr] =
        jlinkObFirmwareVersion.split(' compiled ');

    if (!deviceObFirmwareId || !deviceObFirmwareDateStr) {
        // No date info in firmware version
        return;
    }
    const hostFwDate = hostFirmwares[deviceObFirmwareId]?.compiledOn;
    if (!hostFwDate) {
        // No matching firmware found
        return;
    }

    // Return true if host firmware is newer indicating an update is available
    return hostFwDate > new Date(deviceObFirmwareDateStr);
};
