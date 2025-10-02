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

interface NrfUtilDevice {
    deviceInfo: { jlink: { jlinkObFirmwareVersion: string } };
}

/**
 * Reads the debug probe firmware files in the given JLink directory and returns
 * a map of their IDs and compilation dates.
 */
export const getHostFirmwareVersions = (jlinkDir: string): HostFirmwares => {
    const buffer = Buffer.alloc(64);

    return Object.fromEntries(
        readdirSync(jlinkDir)
            .map(file => {
                const filePath = join(jlinkDir, file);
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
 * @param device The connected debug probe device as the device element returned by
 *         `nrfutil --json --skip-overhead device device-info --serial-number ${serialNumber}`
 * @param hostFirmwares The host firmware versions as returned by `getHostFirmwareVersions`
 * @returns `true` if an update is available, `false` if not, or `undefined` if the
 *          information is insufficient to determine this.
 */
export const isDebugProbeFirmwareUpdateAvailable = (
    device: NrfUtilDevice,
    hostFirmwares: HostFirmwares
): boolean | undefined => {
    const { jlinkObFirmwareVersion } = device.deviceInfo.jlink;
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
