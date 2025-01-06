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

  /**
   * Downloads the specified version of JLink from Nordic.
   *
   * @param version - The version of JLink to download.
   * @param progressUpdate - Optional callback to track the download progress.
   * @returns A promise that resolves to the path of the downloaded JLink.
   */
  async download(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.download(version, progressUpdate);
  }

  /**
   * Downloads the specified version of JLink from Segger.
   *
   * @param version - The version of JLink to download.
   * @param progressUpdate - Optional callback to track the download progress.
   * @returns A promise that resolves to the path of the downloaded JLink.
   */
  async downloadFromSegger(
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.downloadFromSegger(version, progressUpdate);
  }
  async install() {
    await this.jlink.install();
  }

  /**
   * Downloads the specified version of JLink from Nordic and installs it.
   *
   * @param version - The version of JLink to download.
   * @param progressUpdate - Optional callback to track the download progress.
   */
  async downloadAndInstall(version: string, progressUpdate: ProgressCallback) {
    await this.download(version, progressUpdate);
    await this.jlink.install();
  }

  /**
   * Retrieves the version of the installed JLink.
   *
   * @returns A promise that resolves to a string representing the JLink version.
   */
  async getVersion(): Promise<string> {
    return await this.jlink.getVersion();
  }

  /**
   * Uploads the specified file to Nordic's Artifactory.
   *
   * @param filePath - The path to the JLink file to upload.
   * @param version - The version of the JLink being uploaded.
   * @param progressUpdate - Optional callback to track the upload progress.
   * @returns A promise that resolves to the URL the file was uploaded to.
   */
  async upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return await this.jlink.upload(filePath, version, progressUpdate);
  }

  /**
   * Sets the path to the JLink library.
   *
   * @param path - The path to the JLink library.
   */
  setJlinkPath(path: string) {
    this.setJlinkPath(path);
  }

  /**
   * Gets the path to the JLink library.
   *
   * @returns The path to the JLink library.
   */
  getJlinkPath() {
    return this.jlink.getJlinkPath();
  }
}
