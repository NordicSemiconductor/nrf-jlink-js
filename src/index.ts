/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export type { Update as JLinkUpdate } from './shared/update';

export { downloadAndInstallJLink, downloadAndSaveJLink } from './jlink';
export { getVersionToInstall } from './operations/getVersionToInstall';
export { installJLink } from './operations/installJLink';
