import axios from "axios";
import sudo from "sudo-prompt";
import { mkdir } from "fs/promises";
import fs from "fs";
import path from "path";
import os from "os";
import Jlink, { JlinkDownload } from "./jlinkAbstract";

const BASE_URL =
  "https://files.nordicsemi.com/artifactory/swtools/external/jlink/jlink-installer";

export default class JlinkInstallerWindows extends Jlink {
  downloadFromNordic() {
    // TODO: Download JLink installer from Nordic
  }

  uploadToNordic() {
    // TODO: Upload JLink installer to Nordic
  }

  async listRemote(): Promise<JlinkDownload[]> {
    const indexUrl = `${BASE_URL}/index.json`;
    const { status, data } = await axios.get(indexUrl, {
      headers: { "Content-Type": "application/json" },
    });
    if (status !== 200) {
      throw new Error(
        `Unable to get index file from ${indexUrl}. Got status code ${status}`
      );
    }
    const jlinkDownloads = data.jlinks as JlinkDownload[];
    const jlinkList = jlinkDownloads.filter(
      (jlink) => jlink.os === this.os && jlink.arch === this.arch
    );
    this.remoteJlinkList = jlinkList;
    return jlinkList;
  }

  async download(version: string): Promise<void> {
    // Check if remote JLink list is empty
    if (this.remoteJlinkList.length === 0) {
      this.listRemote();
    }

    // Find JLink version
    const fileName = this.remoteJlinkList.find(
      (jlink) => jlink.version === version
    )?.name;
    if (!fileName) {
      throw new Error("JLink version not found from remote");
    }

    // Download JLink
    const fileUrl = `${BASE_URL}/${fileName}`;
    const { status, data: stream } = await axios.get(fileUrl, {
      responseType: "stream",
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
          return resolve();
        });
      });
    });
  }

  downloadFromSegger() {
    // TODO: Download JLink installer from Segger
  }

  install(): Promise<void> {
    if (!this.downloadedJlinkPath) {
      throw new Error("JLink not downloaded, call download first");
    }

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
            return resolve();
          }
        }
      );
    });
  }
}
