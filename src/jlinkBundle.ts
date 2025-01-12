import untildify from "untildify";
import os from "os";
import fs from "fs";
import { create, extract } from "tar";
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

  async listRemote(): Promise<JlinkDownload[]> {
    const jlinkDownloads = (await this.getIndex()).jlinks;
    const jlinkList = jlinkDownloads.filter(
      (jlink) =>
        jlink.os === this.os &&
        jlink.arch === this.arch &&
        jlink.installType === "bundle"
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
        extensionString = "tgz";
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

  installAndPack(version: string, installerPath: string): Promise<string> {
    if (this.os === "darwin") {
      if (!installerPath) {
        throw new Error(
          "Installer path not provided, please specify an installer for macOS"
        );
      }

      return this.installMacAndPack(version, installerPath);
    }

    if (this.os === "linux") {
      return Promise.resolve(installerPath);
    }

    if (this.os === "win32") {
      return Promise.resolve(installerPath);
    }

    throw new Error("Unsupported OS while installing on: " + this.os);
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
    const sourceFolder = `/Applications/SEGGER/JLink_${convertToSeggerVersion(
      version
    )}`;
    await create(
      {
        cwd: sourceFolder,
        gzip: true,
        file: tarballFile,
      },
      fs.readdirSync(sourceFolder)
    ).then(() => {
      console.log("Tarball has been created.");
    });

    return tarballFile;
  }

  protected async unpack(): Promise<void> {
    const targetPath = untildify(this.jlinkPath);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    await extract({
      cwd: targetPath,
      gzip: true,
      file: this.downloadedJlinkPath,
    }).then(() => {
      console.log(`Tarball has been dumped in ${targetPath}.`);
    });
  }

  protected async installMac(): Promise<void> {
    if (!this.jlinkPath) {
      throw new Error(
        "JLink path not provided, please specify a path for unpacking JLink bundle on macOS"
      );
    }
    this.unpack();
  }

  protected async installLinux(): Promise<void> {
    if (!this.jlinkPath) {
      throw new Error(
        "JLink path not provided, please specify a path for unpacking JLink bundle on Linux"
      );
    }
    this.unpack();
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
