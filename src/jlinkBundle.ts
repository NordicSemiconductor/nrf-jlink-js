import path from "path";
import fs from "fs";
import JlinkAbstract, {
  JlinkDownload,
  ProgressCallback,
} from "./jlinkAbstract";

export default class JlinkBundle extends JlinkAbstract {
  constructor(os: typeof process.platform, arch: typeof process.arch) {
    super(os, arch);
    this.baseUrl =
      "https://files.nordicsemi.com/artifactory/swtools/external/jlink/";
  }

  listRemote(): Promise<JlinkDownload[]> {
    throw new Error("Method not implemented.");
  }
  install(): void {
    throw new Error("Method not implemented.");
  }
  download(version: string, processUpdate?: ProgressCallback): Promise<string> {
    throw new Error("Method not implemented.");
  }
  upload(
    filePath: string,
    version: string,
    progressUpdate?: ProgressCallback
  ): Promise<string> {
    return this.uploadToNordic(filePath, version, "bundle", progressUpdate);
  }
}
