// npx ts-node examples/listRemote.ts
import Jlink from "../src/index";

const jlink = new Jlink();
jlink.setJlinkPath("/Applications/SEGGER/JLink_V766");
console.log(await jlink.getVersion());
