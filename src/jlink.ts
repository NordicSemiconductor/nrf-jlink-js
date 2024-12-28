import JlinkAbstract, {
  JlinkDownload,
  ProgressCallback,
} from "./jlinkAbstract";
import JlinkBundle from "./jlinkBundle";
import JlinkInstaller from "./jlinkInstaller";

export default class Jlink {
  installType: "installer" | "bundle";
  os: typeof process.platform;
  arch: typeof process.arch;
  jlink: JlinkAbstract;
  jlinkPath?: string;

  constructor(
    installType?: "installer" | "bundle",
    os?: typeof process.platform,
    arch?: typeof process.arch
  ) {
    this.installType = installType || "installer";
    this.os = os || process.platform;
    this.arch = arch || process.arch;

    switch (this.installType) {
      case "installer":
        this.jlink = new JlinkInstaller(this.os, this.arch);
        return;
      case "bundle":
        this.jlink = new JlinkBundle(this.os, this.arch);
        return;
      default:
        throw new Error("Invalid install type");
    }
  }

  setJlinkPath(path: string) {
    this.jlinkPath = path;
  }

  getJlinkPath() {
    return this.jlinkPath;
  }

  /**
   * Lists all JLink versions installed locally.
   *
   * @returns An array of strings representing the path of the installed JLink.
   */

  listLocalInstalled(): string[] {
    return this.jlink.listLocalInstalled();
  }
  /**
   * Lists all JLink versions provided by Nordic.
   *
   * @returns An array of object representing the content of the JLink.
   */
  async listRemote(): Promise<JlinkDownload[]> {
    return await this.jlink.listRemote();
  }

  async download(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.download(version, progressUpdate);
  }

  async downloadFromSegger(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.downloadFromSegger(version, progressUpdate);
  }
  async install() {
    await this.jlink.install();
  }

  async downloadAndInstall(version: string, progressUpdate: ProgressCallback) {
    await this.download(version, progressUpdate);
    await this.jlink.install();
  }

  async getVersion(): Promise<string> {
    return await this.jlink.getVersion(this.jlinkPath);
  }

  async upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.upload(filePath, version, progressUpdate);
  }
}
