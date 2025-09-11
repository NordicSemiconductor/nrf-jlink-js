# nrf-jlink-js

`nrf-jlink-js` is a Node.js module to check and install the recommended JLink
version used by some products of Nordic Semiconductor ASA.

## Installation

```bash
npm install @nordicsemiconductor/nrf-jlink-js
```

## Usage

```js
const { status } = await getJLinkState();

if (status === 'should be updated') {
    downloadAndInstallJlink(console.log);
}
```
