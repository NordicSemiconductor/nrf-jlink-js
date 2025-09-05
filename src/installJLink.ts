/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { execFile } from 'child_process';
import os from 'os';
import type { OnUpdate } from './update';

export const installJLink = (
    installerPath: string,
    onUpdate?: OnUpdate
): Promise<void> => {
    let command;
    let args: string[];
    switch (os.platform()) {
        case 'darwin':
            command = 'open';
            args = ['-W', installerPath];
            break;
        case 'linux':
            command = 'pkexec';
            args = ['sh', '-c', `dpkg -i "${installerPath}"`];
            break;
        case 'win32':
            command = installerPath;
            args = ['-InstUSBDriver=1'];
            break;
        default:
            throw new Error('Invalid platform');
    }

    onUpdate?.({ step: 'install', percentage: 0 });

    return new Promise((resolve, reject) => {
        execFile(command, args, (error, _, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(stderr);
            }
            onUpdate?.({ step: 'install', percentage: 100 });
            return resolve();
        });
    });
};
