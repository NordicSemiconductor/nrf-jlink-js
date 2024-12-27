import Jlink from "../dist/index.js";

const jlink = new Jlink();
console.log(await jlink.listRemote());
