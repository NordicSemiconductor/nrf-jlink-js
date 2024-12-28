/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import Jlink from "../src/index";

const main = async () => {
  const jlink = new Jlink();
  await jlink.download("v810f", (process) =>
    console.log(process.stepPercentage)
  );
};

main();
