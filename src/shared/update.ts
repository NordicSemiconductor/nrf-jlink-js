/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export interface Update {
    step: 'install' | 'download';
    percentage: number;
}
export type OnUpdate = (update: Update) => void;
