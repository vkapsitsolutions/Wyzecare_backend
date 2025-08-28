export function incrementVersion(currentVersion: string): string {
  // Remove the "v" prefix and split into major/minor
  const version = currentVersion.replace('v', '').split('.');
  let major = parseInt(version[0], 10);
  let minor = parseInt(version[1], 10);

  // Increment minor version
  minor += 1;

  // If minor reaches 10, bump major and reset minor
  if (minor >= 10) {
    major += 1;
    minor = 0;
  }

  return `v${major}.${minor}`;
}
