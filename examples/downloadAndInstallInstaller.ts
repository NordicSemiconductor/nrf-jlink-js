// npx ts-node examples/downloadAndInstall.ts
import Jlink from "../src/index";

const jlink = new Jlink();
jlink.acceptLicense();
await jlink.downloadAndInstall("v810f", console.log);
