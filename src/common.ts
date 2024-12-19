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
