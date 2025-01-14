// npx ts-node examples/downloadAndInstall.ts
import Jlink from "../src/index";

process.env.NRF_JLINK_PATH = "~/.nrfconnect-apps/jlink";
const jlink = new Jlink("bundle");
await jlink.downloadAndInstall("v810c", console.log);
