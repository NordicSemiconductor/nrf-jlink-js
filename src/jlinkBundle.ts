import os from "os";
import { create } from "tar";
import sudo from "@vscode/sudo-prompt";
import JlinkAbstract, {
  JlinkDownload,
  ProgressCallback,
} from "./jlinkAbstract";
import { convertToSeggerVersion } from "./common";
import { execSync } from "child_process";
import path from "path";

export default class JlinkBundle extends JlinkAbstract {
  bundleName;

  constructor(os: typeof process.platform, arch: typeof process.arch) {
    super(os, arch);
    this.baseUrl =
      "https://files.nordicsemi.com/artifactory/swtools/external/jlink/";
    this.bundleName = "";
  }

  listRemote(): Promise<JlinkDownload[]> {
    throw new Error("Method not implemented.");
  }
  download(version: string, processUpdate?: ProgressCallback): Promise<string> {
    throw new Error("Method not implemented.");
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
        extensionString = "pkg";
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
    const fileNameWithoutExtension = `JLink_${osString}_${seggerVersion}_${archString}`;
    const fileName = `${fileNameWithoutExtension}.${extensionString}`;
    this.bundleName = `${fileNameWithoutExtension}.tgz`;

    return this.downloadFileFromSegger(fileName, progressUpdate);
  }

  protected installMac(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  installAndPack(version: string, installerPath?: string): Promise<string> {
    if (this.os === "darwin") {
      if (!installerPath) {
        throw new Error(
          "Installer path not provided, please specify an installer for macOS"
        );
      }

      return this.installMacAndPack(version, installerPath);
    }

    // if (this.os === "linux") {
    //   return this.installLinux();
    // }

    // if (this.os === "win32") {
    //   return this.installWindows();
    // }

    // throw new Error("Unsupported OS while installing on: " + this.os);
  }

  async installMacAndPack(
    version: string,
    installerPath: string
  ): Promise<string> {
    const installCmd = `installer -pkg "${installerPath}" -target /`;
    console.log(`Start to install on macOS with command: ${installCmd}`);
    await new Promise<void>((resolve) => {
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

    const tarballFile = path.join(os.tmpdir(), this.bundleName);
    const sourceFolder = "/Applications/SEGGER/";
    await create(
      {
        cwd: sourceFolder,
        gzip: true,
        file: tarballFile,
      },
      [`JLink_${convertToSeggerVersion(version)}`]
    ).then((_) => {
      "Tarball has been created.";
    });

    return tarballFile;
  }

  protected installLinux(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected installWindows(): Promise<void> {
    const installCmd = `"${this.downloadedJlinkPath}" -Silent=1 -InstUSBDriver=1 -InstAllUsers=0`;
    console.log(`Start to install on Windows with command: ${installCmd}`);

    execSync(installCmd);
    console.log("Installed successfully");
    return Promise.resolve();
  }

  upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return this.uploadToNordic(filePath, version, "bundle", progressUpdate);
  }
}
