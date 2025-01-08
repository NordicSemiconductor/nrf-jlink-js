/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// Need to run on macOS
import Jlink from "../src/index";
import JlinkBundle from "../src/jlinkBundle";

const main = async () => {
  const version = process.argv.slice(2)[0];
  console.log(`Publishing JLink installer for ${version}`);

  const matrix: { os: typeof process.platform; arch: typeof process.arch }[] = [
    { os: "win32", arch: "x64" },
    { os: "linux", arch: "x64" },
    { os: "darwin", arch: "x64" },
    { os: "darwin", arch: "arm64" },
  ];

  for (const { os, arch } of matrix) {
    const jlink = new Jlink("bundle", os, arch);
    const jlinkInstallerPath = await jlink.downloadFromSegger(
      version,
      (progress) => console.log(`${progress.step}: ${progress.stepPercentage}`)
    );
    const jlinkBundlePath = await (jlink.jlink as JlinkBundle).installAndPack(
      version,
      jlinkInstallerPath
    );
    console.log(`Jlink bundle packed at ${jlinkBundlePath}`);
    await jlink.upload(jlinkBundlePath, version, (progress) =>
      console.log(`${progress.step}: ${progress.stepPercentage}`)
    );
  }
};

main();
