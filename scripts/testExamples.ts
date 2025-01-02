/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
const main = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const examplesPath = `${__dirname}/../examples`;

  fs.readdirSync(examplesPath).forEach(async (file) => {
    if (file.endsWith(".ts")) {
      console.log(`Running ${file}`);
      import(`${examplesPath}/${file}`);
    }
  });
};

main();
