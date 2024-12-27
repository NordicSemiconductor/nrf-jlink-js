import { spawn } from "child_process";
import fs from "fs";
import { mkdir } from "fs/promises";
import os from "os";
import path from "path";
import { convertToSeggerVersion } from "./common";
import axios from "axios";

const SEGGER_BASE_URL = "https://www.segger.com/downloads/jlink";

export type JlinkDownload = {
  version: string;
  os: typeof process.platform;
  arch: typeof process.arch;
  name: string;
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

  constructor(os: typeof process.platform, arch: typeof process.arch) {
    this.os = os;
    this.arch = arch;
  }

  abstract listRemote(): Promise<JlinkDownload[]>;
  abstract install(): void;
  abstract download(
    version: string,
    processUpdate?: ProgressCallback
  ): Promise<void>;
  abstract upload(
    filePath: string,
    progressUpdate?: ProgressCallback
  ): Promise<string>;

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

  async downloadFromSegger(
    version: string,
    inputOs?: typeof process.platform,
    inputArch?: typeof process.arch
  ): Promise<string> {
    // Convert version to file name
    const seggerVersion = convertToSeggerVersion(version);
    let osString = "";
    let extensionString = "";
    switch (inputOs || this.os) {
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
    switch (inputArch || this.arch) {
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

    // Download JLink
    const fileUrl = `${SEGGER_BASE_URL}/${fileName}`;
    const { status, data: stream } = await axios.postForm(
      fileUrl,
      { accept_license_agreement: "accepted" },
      {
        responseType: "stream",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log(status);
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
          return resolve(destinationFile);
        });
      });
    });
  }
}
