// npx ts-node examples/listRemote.ts
import Jlink from "../src/index";

const jlink = new Jlink();
jlink.setJlinkVersion("794b");
console.log(await jlink.getVersion());
