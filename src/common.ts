export const parseVersion = (version: string) => {
  const regex = /(\d+)\.*(\d\d)(.{0,1})/;
  const matchedVersion = version.match(regex);
  console.log(matchedVersion);
  const [parsedVersion, major, minor, patch] = version.match(regex) ?? [];
  if (parsedVersion)
    return {
      major,
      minor,
      patch: patch.toLowerCase(),
    };
};
