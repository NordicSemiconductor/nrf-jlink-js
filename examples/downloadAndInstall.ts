import Jlink from "../src/index";

const jlink = new Jlink();
await jlink.downloadAndInstall("v810f", console.log);
