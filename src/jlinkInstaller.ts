import axios from "axios";
import fs from "fs";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import sudo from "@vscode/sudo-prompt";
import Jlink, { JlinkDownload, ProgressCallback } from "./jlinkAbstract";
import { convertToSeggerVersion } from "./common";

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
      (jlink) =>
        jlink.os === this.os &&
        jlink.arch === this.arch &&
        jlink.installType === "installer"
    );
    this.remoteJlinkList = jlinkList;
    return jlinkList;
  }

  async downloadFromSegger(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    // Convert version to file name
    const seggerVersion = convertToSeggerVersion(version);
    let osString = "";
    let extensionString = "";
    switch (this.os) {
      case "darwin":
        osString = "MacOSX";
        extensionString = "pkg";
        break;
      case "linux":
        osString = "Linux";
        extensionString = "deb";
        break;
      case "win32":
        osString = "Windows";
        extensionString = "exe";
        break;
      default:
        throw new Error("Unsupported OS while downloading from Segger");
    }
    let archString = "";
    switch (this.arch) {
      case "arm64":
        archString = "arm64";
        break;
      case "x64":
        archString = "x86_64";
        break;
      default:
        throw new Error("Unsupported ARCH while downloading from Segger");
    }
    const fileName = `JLink_${osString}_${seggerVersion}_${archString}.${extensionString}`;

    return this.downloadFileFromSegger(fileName, progressUpdate);
  }

  protected installMac(): Promise<void> {
    const installCmd = `installer -pkg "${this.downloadedJlinkPath}" -target /`;
    return this.installOnPlatform(installCmd, "macOS");
  }

  protected installLinux(): Promise<void> {
    const installCmd = `dpkg -i ${this.downloadedJlinkPath}`;
    return this.installOnPlatform(installCmd, "Linux");
  }

  protected installWindows(): Promise<void> {
    const installCmd = `"${this.downloadedJlinkPath}"`;
    return this.installOnPlatform(installCmd, "Windows");
  }

  protected installOnPlatform(
    installCmd: string,
    platformDisplayName: string
  ): Promise<void> {
    console.log(
      `Start to install on ${platformDisplayName} with command: ${installCmd}`
    );

    return new Promise((resolve) => {
      sudo.exec(installCmd, (error, stdout, stderr) => {
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
      });
    });
  }

  upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return this.uploadToNordic(filePath, version, "installer", progressUpdate);
  }
}
