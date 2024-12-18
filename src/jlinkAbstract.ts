import { spawn } from "child_process";
import fs from "fs";

export type JlinkDownload = {
  version: string;
  os: typeof process.platform;
  arch: typeof process.arch;
  name: string;
};
export default abstract class JlinkAbstract {
  os: typeof process.platform;
  arch: typeof process.arch;
  remoteJlinkList: JlinkDownload[] = [];
  localJlinkList: string[] = [];
  downloadedJlinkPath: string = "";

  constructor(os: typeof process.platform, arch: typeof process.arch) {
    this.os = os;
    this.arch = arch;
  }

  abstract listRemote(): Promise<JlinkDownload[]>;
  abstract downloadFromSegger(): void;
  abstract downloadFromNordic(): void;
  abstract uploadToNordic(): void;
  abstract install(): void;
  abstract download(version: string): Promise<void>;

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
}
