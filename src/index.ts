/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export {
    downloadAndInstallJLink,
    getVersionToInstall,
    downloadAndSaveJLink,
} from './jlink';

export { installJLink } from './installJLink';

export type { Update as JLinkUpdate } from './update';
