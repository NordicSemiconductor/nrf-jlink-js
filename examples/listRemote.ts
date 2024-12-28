import Jlink from "../src/index";

const jlink = new Jlink();
console.log(await jlink.listRemote());
