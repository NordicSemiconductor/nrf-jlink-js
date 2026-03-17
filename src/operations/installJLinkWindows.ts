/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { EOL } from 'os';
import { execFile } from 'child_process';
import { getJLinkState } from './getJLinkState';
import { promisify } from 'util';

interface Process {
    name: string;
    pid: number;
}

export const installJLinkWindows = async (cmd: string, args: string[]) => {
    const installedJLink = await getInstalledJLinkVersion();
    const processesBefore = await findJLinkProcesses();

    // InitialInstaller
    execFile(cmd, args);
    const initialInstallerProcess = await pollForProcess(/JLink_Windows_V\d+[a-z]?_x86_64/, processesBefore);
    await waitForProcessToFinish(initialInstallerProcess);


    // Elevated installer
    const elevatedInstallerProcess = await pollForProcess(/JLink_Windows/, processesBefore).catch(() => {
        // Maybe installer did not need to elevate or user did not install for all users
        // We can check compare installed JLink version instead of throwing here immediately
    });
    if (!elevatedInstallerProcess) {
        const currentInstalledJLink = await getInstalledJLinkVersion();
        if (currentInstalledJLink && currentInstalledJLink !== installedJLink) {
            return;
        }
        throw new Error('Elevated installer process not found after initial installer finished.');
    }
    await waitForProcessToFinish(elevatedInstallerProcess);

    // Check if JLink version is updated after installation
    const currentInstalledJLink = await getInstalledJLinkVersion();
    if (!currentInstalledJLink && currentInstalledJLink === installedJLink) {
        throw new Error('JLink installation failed, version not updated after installer finished.');
    }
}

const getInstalledJLinkVersion = (): Promise<string | undefined> => getJLinkState({ checkOnline: false }).then(state => state.status === 'up to date' ? state.installedVersion : undefined);

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForProcessToFinish = async (installerProcess: Process): Promise<void> => {
    let installerProcessRunning = true;
    while (installerProcessRunning) {
        await wait(3000); // Wait for 3 seconds before checking again
        const processes = await findJLinkProcesses();
        installerProcessRunning = processes.some(p => p.pid === installerProcess.pid);
    }
}

const pollForProcess = async (processRegex: RegExp, knownProcesses: Process[]): Promise<Process> => {
    let process: Process | undefined;
    let otherProcesses: Process[] = [];
    let timeout = 10000;
    while (!process && timeout > 0) {
        otherProcesses = await findJLinkProcesses();


        process = otherProcesses.filter(p => !knownProcesses.some(kb => kb.pid === p.pid)).find(p => processRegex.test(p.name));
        

        timeout -= 3000;
        if (timeout <= 0) {
            break;
        }
        // update Timeout if passed
        await wait(3000); // Wait for 3 seconds before checking again
    }
    if (otherProcesses.length === 0) {
        throw new Error('No JLink processes found after starting installer.');
    }
    if (!process) {
        throw new Error(`Installer process not found.${otherProcesses.length !== 0 ? ` Other JLink processes running: ${otherProcesses.map(p => `${p.name} (${p.pid})`).join(', ')}` : '' }`);
    }

    return process;
}

const findJLinkProcesses = async (): Promise<Process[]> => {
    const { stdout } = await promisify(execFile)('tasklist', [ '/NH', '/FI', 'IMAGENAME eq JLink*', ]);
    return stdout
        .split(EOL)
        .filter(Boolean)
        .map(line => {
            const parts = line.trim().split(/\s+/).slice(0, 2); // [processName, pid]
            if (parts.length !== 2 && !parts[0] && !isNaN(Number(parts[1]))) {
                throw new Error(`Unexpected tasklist output: ${line}`);
            }
            return { name: parts[0], pid: Number(parts[1]) } as Process;
        });
}
