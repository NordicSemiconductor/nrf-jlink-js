import JlinkAbstract, {
  JlinkDownload,
  ProgressCallback,
} from "./jlinkAbstract";

export default class JlinkBundle extends JlinkAbstract {
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
    throw new Error("Method not implemented.");
  }
}
