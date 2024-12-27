import JlinkAbstract, {
  JlinkDownload,
  ProgressCallback,
} from "./jlinkAbstract";

export default class JlinkBundle extends JlinkAbstract {
  upload(filePath: string, progressUpdate?: ProgressCallback): Promise<string> {
    throw new Error("Method not implemented.");
  }
  listRemote(): Promise<JlinkDownload[]> {
    throw new Error("Method not implemented.");
  }
  downloadFromNordic(): void {
    throw new Error("Method not implemented.");
  }
  uploadToNordic(): void {
    throw new Error("Method not implemented.");
  }
  install(): void {
    throw new Error("Method not implemented.");
  }
  download(version: string, processUpdate?: ProgressCallback): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
