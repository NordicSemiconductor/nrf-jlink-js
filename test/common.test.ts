import { parseVersion } from "../src/common";

test("Parse version", async () => {
  expect(parseVersion("v8.10f")).toEqual({
    major: "8",
    minor: "10",
    patch: "f",
  });
  expect(parseVersion("v8.10")).toEqual({
    major: "8",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("v810")).toEqual({
    major: "8",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("v10.10f")).toEqual({
    major: "10",
    minor: "10",
    patch: "f",
  });
  expect(parseVersion("v10.10")).toEqual({
    major: "10",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("v1010f")).toEqual({
    major: "10",
    minor: "10",
    patch: "f",
  });
  expect(parseVersion("v1010")).toEqual({
    major: "10",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("8.10f")).toEqual({
    major: "8",
    minor: "10",
    patch: "f",
  });
  expect(parseVersion("8.10")).toEqual({
    major: "8",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("810")).toEqual({
    major: "8",
    minor: "10",
    patch: "",
  });
  expect(parseVersion("10.01f")).toEqual({
    major: "10",
    minor: "01",
    patch: "f",
  });
  expect(parseVersion("10.01")).toEqual({
    major: "10",
    minor: "01",
    patch: "",
  });
  expect(parseVersion("1001f")).toEqual({
    major: "10",
    minor: "01",
    patch: "f",
  });
  expect(parseVersion("1001")).toEqual({
    major: "10",
    minor: "01",
    patch: "",
  });
});
