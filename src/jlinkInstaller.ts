import axios from "axios";
import fs from "fs";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import sudo from "sudo-prompt";
import Jlink, { JlinkDownload, ProgressCallback } from "./jlinkAbstract";
import { convertToSeggerVersion } from "./common";

export default class JlinkInstaller extends Jlink {
  constructor(os: typeof process.platform, arch: typeof process.arch) {
    super(os, arch);
    this.baseUrl =
      "https://files.nordicsemi.com/artifactory/swtools/external/jlink/jlink-installer";
  }
  downloadFromNordic() {
    // TODO: Download JLink installer from Nordic
  }

  async listRemote(): Promise<JlinkDownload[]> {
    const indexUrl = `${this.baseUrl}/index.json`;
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

  upload(filePath: string, progressUpdate?: ProgressCallback): Promise<string> {
    const nordicArtifactoryToken = process.env.NORDIC_ARTIFACTORY_TOKEN;
    if (!nordicArtifactoryToken) {
      throw new Error("NORDIC_ARTIFACTORY_TOKEN environment variable not set");
    }
    return new Promise(async (resolve) => {
      const fileName = path.basename(filePath);
      const fileUrl = `${this.baseUrl}/${fileName}`;
      const fileSize = fs.statSync(filePath).size;
      let status;
      ({ status } = await axios.put(fileUrl, fs.createReadStream(filePath), {
        headers: {
          "X-JFrog-Art-Api": nordicArtifactoryToken,
        },
        onUploadProgress(progressEvent) {
          progressUpdate &&
            progressUpdate({
              action: "Upload",
              step: "Upload",
              stepNumber: 1,
              stepTotalNumber: 1,
              stepPercentage: `${(
                (progressEvent.loaded / fileSize) *
                100
              ).toFixed(2)}%`,
            });
        },
      }));

      if (status != 200 && status != 201) {
        throw new Error(
          `Unable to upload ${fileUrl}. Got status code ${status}.`
        );
      }
      return resolve(fileUrl);
    });
  }
}
