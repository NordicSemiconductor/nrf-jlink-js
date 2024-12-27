import Jlink from "../dist/index.js";

const jlink = new Jlink();
await jlink.downloadAndInstall("v810f", console.log);
