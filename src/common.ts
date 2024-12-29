import { JlinkDownload } from "./jlinkAbstract";

export const parseVersion = (
  version: string
): { major: string; minor: string; patch: string } => {
  const regex = /(\d+)\.*(\d\d)(.{0,1})/;
  const [parsedVersion, major, minor, patch] = version.match(regex) ?? [];
  if (parsedVersion)
    return {
      major,
      minor,
      patch: patch.toLowerCase(),
    };
  throw new Error(
    "Invalid version. Supported format: v10.01f, v1001f, v10.01, v1001"
  );
};

export const convertToSeggerVersion = (version: string): string => {
  const parsedVersion = parseVersion(version);
  const { major, minor, patch } = parsedVersion;
  return `V${major}${minor}${patch}`;
};

export const formatDate = (date: Date) => {
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();
  let year = date.getFullYear().toString();
  let hour = "" + date.getHours().toString();
  let minute = "" + date.getMinutes().toString();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;
  if (hour.length < 2) hour = "0" + hour;
  if (minute.length < 2) minute = "0" + minute;

  return [year, month, day, hour, minute].join("");
};

export const sortJlinkIndex = (a: JlinkDownload, b: JlinkDownload) =>
  a.version > b.version ? 1 : -1;
