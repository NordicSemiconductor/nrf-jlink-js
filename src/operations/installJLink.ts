/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { execFile } from 'child_process';
import os from 'os';
import type { OnUpdate } from '../shared/update';
import { installJLinkWindows } from './installJLinkWindows';
import { promisify } from 'util';

export const installJLink = async (
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

    if (os.platform() === 'win32') {
        await installJLinkWindows(command, args);
    } else {
        const stderr = await promisify(execFile)(command, args);
        if (stderr) throw stderr;
    }
    onUpdate?.({ step: 'install', percentage: 100 });
};
