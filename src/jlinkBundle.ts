import JlinkAbstract, { JlinkDownload } from "./jlinkAbstract";

export default class JlinkBundle extends JlinkAbstract {
  listRemote(): Promise<JlinkDownload[]> {
    throw new Error("Method not implemented.");
  }
  downloadFromSegger(): void {
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
  download(version: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
