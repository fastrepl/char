export type DownloadPlatform = "macos" | "linux";
export type DownloadArch = "aarch64" | "x86_64";
export type DownloadFormat = "dmg" | "appimage" | "deb";

export interface DownloadLink {
  platform: DownloadPlatform;
  arch: DownloadArch;
  format: DownloadFormat;
  url: string;
  label: string;
}

export function getDownloadLinks(version: string): DownloadLink[] {
  const baseUrl = `https://github.com/fastrepl/char/releases/download/desktop_v${version}`;

  return [
    {
      platform: "macos",
      arch: "aarch64",
      format: "dmg",
      url: `${baseUrl}/hyprnote-macos-aarch64.dmg`,
      label: "Apple Silicon",
    },
    {
      platform: "macos",
      arch: "x86_64",
      format: "dmg",
      url: `${baseUrl}/hyprnote-macos-x86_64.dmg`,
      label: "Intel",
    },
    {
      platform: "linux",
      arch: "x86_64",
      format: "appimage",
      url: `${baseUrl}/hyprnote-linux-x86_64.AppImage`,
      label: "AppImage",
    },
    {
      platform: "linux",
      arch: "x86_64",
      format: "deb",
      url: `${baseUrl}/hyprnote-linux-x86_64.deb`,
      label: "Debian",
    },
  ];
}

export function groupDownloadLinks(links: DownloadLink[]) {
  return {
    macos: links.filter((link) => link.platform === "macos"),
    linux: links.filter((link) => link.platform === "linux"),
  };
}
