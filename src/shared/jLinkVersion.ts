/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { execSync, exec } from 'child_process';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';
import { promisify } from 'util';
import { createTemporaryScriptFile } from './fs';

const reg = () => {
    const defaultRegLocation = path.resolve(
        process.env.SystemRoot ?? 'C:\\Windows',
        'System32',
        'reg.exe'
    );

    return existsSync(defaultRegLocation) ? defaultRegLocation : 'reg.exe';
};

const winRegQuery = (key: string): string => {
    if (process.platform !== 'win32') {
        throw new Error('Unsupported platform');
    }

    return execSync(`${reg()} query ${key}`).toString().trim();
};

const getJLinkExePath = (): string => {
    switch (os.platform()) {
        case 'win32':
            let cwd: string | undefined = winRegQuery(
                'HKEY_CURRENT_USER\\Software\\SEGGER\\J-Link /v InstallPath'
            );
            if (!cwd) {
                cwd = winRegQuery(
                    'HKEY_LOCAL_MACHINE\\Software\\SEGGER\\J-Link /v InstallPath'
                );
            }
            cwd = (/InstallPath\s+\w+\s+(.*)/.exec(cwd) ?? [])[1];
            if (!cwd) {
                throw new Error('JLink not installed');
            }
            return `"${path.join(cwd, 'JLink.exe')}"`;
        case 'linux':
        case 'darwin':
            return 'JLinkExe';
        default:
            throw new Error('Invalid platform');
    }
};

const convertToSemverVersion = (version: string) => {
    const [, majorMinor, patchLetter] = version.match(/V?(\d+\.\d+)(.)?/) ?? [];

    const patch = patchLetter
        ? patchLetter.charCodeAt(0) - 'a'.charCodeAt(0) + 1
        : 0;

    return `${majorMinor}.${patch}`;
};

export const isValidVersion = (
    installedVersion: string,
    expectedVersion: string
) =>
    semver.gte(
        convertToSemverVersion(installedVersion),
        convertToSemverVersion(expectedVersion)
    );

const getEnv = () => {
    if (process.platform !== 'darwin') return undefined;

    return {
        ...process.env,
        PATH: `${process.env.PATH}:/usr/local/bin`
    };
}

export const getInstalledJLinkVersion = async (): Promise<string> => {
    using scriptFile = createTemporaryScriptFile('Exit');

    const output = await promisify(exec)(
        `${getJLinkExePath()} -CommandFile ${scriptFile.filePath}`, {
            env: getEnv()
    }
    ).catch(e => e);

    const versionRegExp = /^SEGGER J-Link Commander V([0-9a-z.]+) .*$/m;
    const match = output.stdout.match(versionRegExp)?.[1];
    if (!match) {
        throw new Error("Couldn't get jlink version.");
    }
    return `v${match}`;
};
