import axios from "axios";
import fs from "fs";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import sudo from "@vscode/sudo-prompt";
import Jlink, { JlinkDownload, ProgressCallback } from "./jlinkAbstract";
import { convertToSeggerVersion, formatDate, sortJlinkIndex } from "./common";
import { execSync } from "child_process";

export default class JlinkInstaller extends Jlink {
  constructor(os: typeof process.platform, arch: typeof process.arch) {
    super(os, arch);
    this.baseUrl =
      "https://files.nordicsemi.com/artifactory/swtools/external/jlink/";
  }

  downloadFromNordic() {
    // TODO: Download JLink installer from Nordic
  }

  async listRemote(): Promise<JlinkDownload[]> {
    const jlinkDownloads = (await this.getIndex()).jlinks;
    const jlinkList = jlinkDownloads.filter(
      (jlink) => jlink.os === this.os && jlink.arch === this.arch
    );
    this.remoteJlinkList = jlinkList;
    return jlinkList;
  }

  async download(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    // Check if remote JLink list is empty
    if (this.remoteJlinkList.length === 0) {
      await this.listRemote();
    }

    // Find JLink version
    const seggerVersion = convertToSeggerVersion(version);
    const fileName = this.remoteJlinkList.find(
      (jlink) => jlink.version === seggerVersion
    )?.name;
    if (!fileName) {
      throw new Error(
        `JLink version not found from remote.\n` +
          `Expected version: ${seggerVersion}\n` +
          `Remote provided JLink list: \n` +
          `${this.remoteJlinkList.map((jlink) => `${jlink.version}\n`)}`
      );
    }

    // Download JLink
    const fileUrl = `${this.baseUrl}/${fileName}`;
    const {
      status,
      data: stream,
      headers,
    } = await axios.get(fileUrl, {
      responseType: "stream",
      onDownloadProgress: (progressEvent) => {
        const total = progressEvent.total || headers["content-length"];
        progressUpdate &&
          progressUpdate({
            action: "Download from Nordic",
            step: "Download",
            stepNumber: 1,
            stepTotalNumber: 1,
            stepPercentage: `${((progressEvent.loaded / total) * 100).toFixed(
              2
            )}%`,
          });
      },
    });

    if (status !== 200) {
      throw new Error(
        `Unable to download ${fileUrl}. Got status code ${status}.`
      );
    }

    // Save JLink
    const destinationFile = path.join(os.tmpdir(), fileName);
    await mkdir(path.dirname(destinationFile), { recursive: true });

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destinationFile);
      stream.pipe(file);
      stream.on("error", reject);
      stream.on("end", () => {
        file.end(() => {
          console.log("🏁 Finish Download", fileUrl);
          console.log("🏁 Saved to", destinationFile);
          this.downloadedJlinkPath = destinationFile;
          return resolve(destinationFile);
        });
      });
    });
  }

  install(): Promise<void> {
    if (!this.downloadedJlinkPath) {
      throw new Error("JLink not downloaded, call download first");
    }

    if (this.os === "darwin") {
      return this.installMac();
    }

    if (this.os === "linux") {
      return this.installLinux();
    }

    if (this.os === "win32") {
      return this.installWindows();
    }

    throw new Error("Unsupported OS while installing on: " + this.os);
  }

  installMac(): Promise<void> {
    const installCmd = `installer -pkg "${this.downloadedJlinkPath}" -target /`;
    console.log(`Start to install on macOS with command: ${installCmd}`);

    return new Promise((resolve) => {
      sudo.exec(
        `installer -pkg "${this.downloadedJlinkPath}" -target /`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(error);
          }
          if (stderr) {
            console.log(stderr);
          }
          if (stdout && stdout.includes("successful")) {
            console.log("Installed successfully");
            return resolve();
          }
        }
      );
    });
  }

  installLinux(): Promise<void> {
    const installCmd = `installer -pkg "${this.downloadedJlinkPath}" -target /`;
    console.log(`Start to install on macOS with command: ${installCmd}`);

    return new Promise((resolve) => {
      sudo.exec(
        `installer -pkg "${this.downloadedJlinkPath}" -target /`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(error);
          }
          if (stderr) {
            console.log(stderr);
          }
          if (stdout && stdout.includes("successful")) {
            console.log("Installed successfully");
            return resolve();
          }
        }
      );
    });
  }

  installWindows(): Promise<void> {
    const installCmd = `"${this.downloadedJlinkPath}" -Silent=1 -InstUSBDriver=1 -InstAllUsers=0`;
    console.log(`Start to install on Windows with command: ${installCmd}`);

    execSync(installCmd);
    return Promise.resolve();
  }

  upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return this.uploadToNordic(filePath, version, "installer", progressUpdate);
  }
}
