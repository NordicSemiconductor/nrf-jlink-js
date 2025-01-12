import { spawn } from "child_process";
import fs from "fs";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import { convertToSeggerVersion, formatDate, sortJlinkIndex } from "./common";
import axios from "axios";

const SEGGER_BASE_URL = "https://www.segger.com/downloads/jlink";

export type JlinkIndex = {
  version: number;
  jlinks: JlinkDownload[];
};

export type JlinkInstallType = "installer" | "bundle";

export type JlinkDownload = {
  version: string;
  os: typeof process.platform;
  arch: typeof process.arch;
  name: string;
  installType: JlinkInstallType;
};

export type ProgressStep = {
  action: string;
  step: string;
  stepNumber: number;
  stepTotalNumber: number;
  stepPercentage: string;
};

export type ProgressCallback = (step: ProgressStep) => {} | void;

export default abstract class JlinkAbstract {
  os: typeof process.platform;
  arch: typeof process.arch;
  remoteJlinkList: JlinkDownload[] = [];
  localJlinkList: string[] = [];
  downloadedJlinkPath: string = "";
  baseUrl: string = "";
  jlinkPath: string = "";

  constructor(os: typeof process.platform, arch: typeof process.arch) {
    this.os = os;
    this.arch = arch;
    this.jlinkPath = process.env["NRF_JLINK_PATH"] || "";
  }

  abstract listRemote(): Promise<JlinkDownload[]>;

  install(installPath?: string): Promise<void> {
    if (!this.downloadedJlinkPath) {
      throw new Error("JLink not downloaded, call download first");
    }

    if (installPath) {
      this.setJlinkPath(installPath);
      console.log(`JLink installation path is set to ${installPath}`);
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

  protected abstract installMac(): Promise<void>;

  protected abstract installLinux(): Promise<void>;

  protected abstract installWindows(): Promise<void>;

  abstract upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string>;

  uploadToNordic(
    filePath: string,
    version: string,
    installType: JlinkInstallType,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    const nordicArtifactoryToken = process.env.NORDIC_ARTIFACTORY_TOKEN;
    if (!nordicArtifactoryToken) {
      throw new Error("NORDIC_ARTIFACTORY_TOKEN environment variable not set");
    }

    return new Promise(async (resolve) => {
      // Upload JLink file
      const fileName = path.basename(filePath);
      const targetUrl = `${this.baseUrl}/${fileName}`;
      let fileSize = fs.statSync(filePath).size;
      let status;
      ({ status } = await axios.put(targetUrl, fs.createReadStream(filePath), {
        headers: {
          "X-JFrog-Art-Api": nordicArtifactoryToken,
          "Content-Length": fileSize,
        },
        onUploadProgress(progressEvent) {
          progressUpdate &&
            progressUpdate({
              action: "Upload",
              step: `Upload JLink ${installType}`,
              stepNumber: 1,
              stepTotalNumber: 3,
              stepPercentage: `${(
                (progressEvent.loaded / (progressEvent.total || fileSize)) *
                100
              ).toFixed(2)}%`,
            });
        },
      }));

      if (status != 200 && status != 201) {
        throw new Error(
          `Unable to upload ${targetUrl}. Got status code ${status}.`
        );
      }

      // Upload backup index file
      const jlinkIndex = await this.getIndex();
      jlinkIndex.jlinks = jlinkIndex.jlinks.sort(sortJlinkIndex) || [];
      const indexName = "index.json";
      const indexBackupName = `index-${formatDate(new Date())}.json`;
      const indexUrl = `${this.baseUrl}/${indexName}`;
      const indexBackupUrl = `${this.baseUrl}/index-backup/${indexBackupName}`;
      let uploadData = JSON.stringify(jlinkIndex, null, 2);
      fileSize = uploadData.length;

      ({ status } = await axios.put(indexBackupUrl, uploadData, {
        headers: {
          "X-JFrog-Art-Api": nordicArtifactoryToken,
          "Content-Length": fileSize,
        },
        onUploadProgress(progressEvent) {
          progressUpdate &&
            progressUpdate({
              action: "Upload",
              step: "Upload backup index",
              stepNumber: 2,
              stepTotalNumber: 3,
              stepPercentage: `${(
                (progressEvent.loaded / (progressEvent.total || fileSize)) *
                100
              ).toFixed(2)}%`,
            });
        },
      }));
      if (status != 200 && status != 201) {
        throw new Error(
          `Unable to upload ${targetUrl}. Got status code ${status}.`
        );
      }

      // Upload index file
      const indexEntry = {
        version: convertToSeggerVersion(version),
        os: this.os,
        arch: this.arch,
        name: path.basename(filePath),
        installType,
      };
      jlinkIndex.jlinks = jlinkIndex.jlinks.filter(
        (jlink) =>
          jlink.version !== indexEntry.version ||
          jlink.os !== indexEntry.os ||
          jlink.arch !== indexEntry.arch ||
          jlink.installType !== indexEntry.installType
      );
      jlinkIndex.jlinks.push(indexEntry);
      jlinkIndex.jlinks = jlinkIndex.jlinks.sort(sortJlinkIndex);
      uploadData = JSON.stringify(jlinkIndex, null, 2);
      fileSize = uploadData.length;
      ({ status } = await axios.put(indexUrl, uploadData, {
        headers: {
          "X-JFrog-Art-Api": nordicArtifactoryToken,
          "Content-Length": fileSize,
        },
        onUploadProgress(progressEvent) {
          progressUpdate &&
            progressUpdate({
              action: "Upload",
              step: "Upload backup index",
              stepNumber: 3,
              stepTotalNumber: 3,
              stepPercentage: `${(
                (progressEvent.loaded / (progressEvent.total || fileSize)) *
                100
              ).toFixed(2)}%`,
            });
        },
      }));
      if (status != 200 && status != 201) {
        throw new Error(
          `Unable to upload ${targetUrl}. Got status code ${status}.`
        );
      }

      return resolve(targetUrl);
    });
  }

  listLocalInstalled(): string[] {
    if (this.os === "darwin") {
      return this.listLocalInstalledMac();
    }

    if (this.os === "linux") {
      return this.listLocalInstalledLinux();
    }

    if (this.os === "win32") {
      return this.listLocalInstalledWindows();
    }

    throw new Error("Unsupported OS while listing local installed: " + this.os);
  }

  listLocalInstalledMac(): string[] {
    const seggerPath = "/Applications/SEGGER/";
    const installedJlink: string[] = [];
    fs.readdirSync(seggerPath).forEach((file) => {
      if (file.startsWith("JLink")) {
        installedJlink.push(seggerPath + file);
      }
    });
    return installedJlink;
  }

  listLocalInstalledLinux() {
    // TODO
    return [];
  }
  listLocalInstalledWindows() {
    // TODO
    return [];
  }

  getVersion(jlinkPath?: string): Promise<string> {
    let PATH = process.env.PATH;
    if (jlinkPath) {
      console.log(`JLink path set to ${jlinkPath}`);
      PATH = `${jlinkPath}:${process.env.PATH}`;
    } else {
      console.log("JLink path not set, will use the global JLink");
    }
    return new Promise((resolve) => {
      const jlinkExeCmd = spawn("JLinkExe", ["-NoGUI", "1"], {
        shell: true,
        env: {
          ...process.env,
          PATH,
        },
      });

      jlinkExeCmd.stdout.on("data", (data: string) => {
        const output = data.toString();
        const versionRegExp = /DLL version (V\d+\.\d*\w+),.*/;
        const versionMatch = output.match(versionRegExp);
        if (versionMatch) {
          jlinkExeCmd.kill(9);
          return resolve(versionMatch[1]);
        }
        if (data.toString().includes("Connecting to")) {
          jlinkExeCmd.kill(9);
          return;
        }
      });

      jlinkExeCmd.stderr.on("data", (data: string) => {
        console.error(`stderr: ${data}`);
      });
    });
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
          `Expected version: ${seggerVersion}.\n` +
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
          console.log("🏁 Finished downloading from", fileUrl);
          console.log("🏁 Saved to", destinationFile);
          this.downloadedJlinkPath = destinationFile;
          return resolve(destinationFile);
        });
      });
    });
  }

  abstract downloadFromSegger(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string>;

  protected async downloadFileFromSegger(
    fileName: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    // Download JLink
    const fileUrl = `${SEGGER_BASE_URL}/${fileName}`;
    console.log("Start downloading from", fileUrl);
    const {
      status,
      data: stream,
      headers,
    } = await axios.postForm(
      fileUrl,
      { accept_license_agreement: "accepted" },
      {
        responseType: "stream",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        onDownloadProgress: (progressEvent) => {
          const total = progressEvent.total || headers["content-length"];
          progressUpdate &&
            progressUpdate({
              action: "Download from Segger",
              step: "Download",
              stepNumber: 1,
              stepTotalNumber: 1,
              stepPercentage: `${((progressEvent.loaded / total) * 100).toFixed(
                2
              )}%`,
            });
        },
      }
    );
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
          console.log("🏁 Finished downloading from", fileUrl);
          console.log("🏁 Saved to", destinationFile);
          return resolve(destinationFile);
        });
      });
    });
  }

  async getIndex(): Promise<JlinkIndex> {
    const indexUrl = `${this.baseUrl}/index.json`;
    const { status, data } = await axios.get(indexUrl, {
      headers: { "Content-Type": "application/json" },
    });
    if (status !== 200) {
      throw new Error(
        `Unable to get index file from ${indexUrl}. Got status code ${status}.`
      );
    }
    return data;
  }

  setJlinkPath(path: string) {
    process.env["NRF_JLINK_PATH"] = path;
    this.jlinkPath = path;
  }

  getJlinkPath() {
    return this.jlinkPath;
  }
}
