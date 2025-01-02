// npx ts-node examples/listLocalInstalled.ts
import Jlink from "../src/index";

const jlink = new Jlink();
console.log(jlink.listLocalInstalled());
