# nrf-jlink-js

`nrf-jlink-js` is a Node.js module to handle jlink installer and bundle by Nordic Semiconductor ASA.

## Installation

```bash
npm install nrf-jlink-js
```

## Usage

```js
const jlink = new Jlink();
const remoteJlinkList = await jlink.listRemote();
const localJlinkList = await jlink.listLocalInstalled();
```

For more usage, see [`examples`](./examples)
