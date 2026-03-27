## 0.17.0 - 2026-03-26

### Added

-   `downloadJLinkByVersion` to download a certain version of the J-Link installer
    for the current platform, which is not necessarily the latest one (which is
    what `downloadAndSaveJLink` would do).

## 0.16.0 - 2026-03-26

### Added

-   Windows: Improved detection speed of successful install.

## 0.15.1 - 2026-03-17

### Fixed

-   Windows: Handle case when no processes are detected during install.
-   Windows: regex for detecting JLink install did not expect trucated value.
-   Windows: regex for detecting JLink install did not handle patch version.
-   Some errors were passed incorrect values.

## 0.15.0 - 2026-03-12

### Changed

-   Completed install is now detected by polling for the process on windows.

## 0.14.1 - 2026-02-04

### Fixed

-   Fixed an issue with handling missing registry entries on Windows when
    looking for J-Link installation path.

## 0.14.0 - 2025-10-02

### Added

-   `getHostFirmwareVersions` to extract available debug probe firmware
    information from a given JLink installation
-   `isDebugProbeFirmwareUpdateAvailable` to check whether a newer firmware is
    available for a given debug probe

## 0.13.1 - 2025-09-15

### Fixed

-   On macOS `/usr/local/bin` is not in `$PATH` by default but this is where
    `JLinkExe` is placed by the SEGGER J-Link installer. Even if one configures
    shells to include `/usr/local/bin` in `$PATH`, that usually doesn't take
    effect for GUI apps, so we must add it manually.

## 0.13.0 - 2025-09-11

### Breaking

-   `downloadAndSaveJLink` no longer returns the file name but instead an object
    with the file name and the version of the downloaded J-Link.

## 0.12.0 - 2025-09-11

### Breaking

-   The new function `getJLinkState` has a different signature and replaces
    `getVersionToInstall`.

## 0.11.0 - 2025-09-08

### Added

-   Windows: preselect to install the legacy drivers in installation wizard.

## 0.10.0 - 2025-09-04

### Added

-   Option to turn off online check.

## 0.9.1 - 2025-08-19

### Fixed

-   Windows: install previously did not successfully execute installer file.

## 0.9.0 - 2025-08-18

### Changed

-   `installedVersion` and `versionToBeInstalled` now have the same format

### Fixed

-   Windows: now able to check installed JLink version

## 0.0.11 - 2025-08-14

### Fixed

-   Fixed executing JLink.exe to check current installed version

## 0.0.10 - 2025-07-28

### Changed

-   `destination` parameter in `downloadAndSaveJLink` split into
    `destinationDir` and optional `destinationFileName`

## 0.0.9 - 2025-07-23

### Changed

-   Use exclusively `fetch`.

## 0.0.8 - 2025-07-21

### Fixed

-   Use artifactory download url to avoid redirects

## 0.0.7 - 2025-07-18

### Added

-   export for `JLinkUpdate` type

### Changed

-   `installJLink` now passes the whole `Update` object to `onUpdate`

## 0.0.6 - 2025-07-11

### Added

-   Added export to `installJLink`

### Fixed

-   Don't alter `destination` passed to `downloadAndSaveJLink`

## 0.0.5 - 2025-07-10

### Fixed

-   Remove mistaken transpile of file

## 0.0.4 - 2025-07-10

### Added

-   Export `downloadAndSaveJLink`.

## 0.0.3 - 2025-06-27

### Fixed

-   Always resolve `install` promise.

## 0.0.2 - 2025-06-27

### Fixed

-   Outdated is set to false if version is not valid.
-   Consistent format for `versionToInstall` and `installedVersion`.

## 0.0.1 - 2025-06-27

-   First stable release

## 0.0.0-alpha4 - 2025-06-26

### Fixed

-   Better spawn exit handling
-   More consistent `getVersionToInstall`

## 0.0.0-alpha3 - 2025-06-24

### Fixed

-   Handle local JLink version

## 0.0.0-alpha2 - 2025-06-24

### Fixed

-   Incorrect type checking for index.json
-   Release script

## 0.0.0-alpha1 - 2025-06-24

-   First alpha release.
