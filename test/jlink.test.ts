import Jlink from "../src/jlink";

// Need to have at least one  JLink installed to run this test

test("List remote provided JLink", async () => {
  const jlink = new Jlink();
  expect((await jlink.listRemote()).length).toBeGreaterThan(0);
});

test("List local installed JLink", () => {
  const jlink = new Jlink();
  expect(jlink.listLocalInstalled().length).toBeGreaterThan(0);
  expect(jlink.listLocalInstalled()[0]).toContain("JLink");
});

test("Get Jlink version without specifying jlink path", async () => {
  const jlink = new Jlink();
  expect(await jlink.getVersion()).toBeDefined();
});

test("Get Jlink version with specifying jlink path", async () => {
  const jlink = new Jlink();
  const listLocalInstalled = jlink.listLocalInstalled();
  jlink.setJlinkPath(listLocalInstalled[1]);
  expect(await jlink.getVersion()).toBeDefined();
});

test("Download JLink from Nordic Artifactory", async () => {
  const jlink = new Jlink();
  const jlinkList = await jlink.listRemote();

  expect(await jlink.download(jlinkList[0].version));
});

test("Download JLink from Segger", async () => {
  const jlink = new Jlink();
  expect(await jlink.downloadFromSegger("v8.10i"));
});

test("Upload JLink to Nordic Artifactory", async () => {
  const jlink = new Jlink();
  const filePath = await jlink.downloadFromSegger("v8.10i");
  expect(await jlink.upload(filePath, console.log)).toBeDefined();
}, 30000);

// Interaction is required
test("Install JLink", async () => {
  const jlink = new Jlink();
  const jlinkList = await jlink.listRemote();
  await jlink.download(jlinkList[0].version, console.log);
  expect(await jlink.install());
}, 30000);
