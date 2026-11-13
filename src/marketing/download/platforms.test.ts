import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMING_SOON, DOWNLOAD_LINKS, WINDOWS_SUMS_URL, WINDOWS_VERSIONS_URL, desktopLayout, detectPlatform, detectWindowsArch, downloadOption, parseSums, parseVersion, pickArch, platformList, type DownloadLinks, type LinkedPlatform, type NavLike, type Platform, type WindowsArch } from "./platforms";

// Task O, FM: the download button's detection and options, with real user-agent
// strings (each browser's own UA, platform and maxTouchPoints).

const UA = {
  win11Chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  win11Edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ipadOld: "Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1",
  androidChrome: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  chromeOS: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ubuntuFirefox: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
};

const CASES: [string, NavLike, Platform][] = [
  ["Windows 11 Chrome (userAgentData)", { userAgentData: { platform: "Windows" }, userAgent: UA.win11Chrome, platform: "Win32", maxTouchPoints: 0 }, "windows"],
  ["Windows 11 Chrome (no userAgentData)", { userAgent: UA.win11Chrome, platform: "Win32", maxTouchPoints: 0 }, "windows"],
  ["Windows 11 Edge (userAgentData)", { userAgentData: { platform: "Windows" }, userAgent: UA.win11Edge, platform: "Win32", maxTouchPoints: 10 }, "windows"],
  ["macOS Safari (no userAgentData)", { userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 0 }, "mac"],
  ["macOS Chrome (userAgentData)", { userAgentData: { platform: "macOS" }, userAgent: UA.macChrome, platform: "MacIntel", maxTouchPoints: 0 }, "mac"],
  ["iPhone Safari", { userAgent: UA.iphoneSafari, platform: "iPhone", maxTouchPoints: 5 }, "ios"],
  ["iPadOS Safari, desktop mode (Macintosh + touch)", { userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 5 }, "ios"],
  ["iPad Safari, iPad user agent", { userAgent: UA.ipadOld, platform: "iPad", maxTouchPoints: 5 }, "ios"],
  ["Android Chrome (userAgentData)", { userAgentData: { platform: "Android" }, userAgent: UA.androidChrome, platform: "Linux armv81", maxTouchPoints: 5 }, "android"],
  ["Android Chrome (no userAgentData)", { userAgent: UA.androidChrome, platform: "Linux armv81", maxTouchPoints: 5 }, "android"],
  ["ChromeOS Chrome (userAgentData)", { userAgentData: { platform: "Chrome OS" }, userAgent: UA.chromeOS, platform: "Linux x86_64", maxTouchPoints: 0 }, "chromeos"],
  ["ChromeOS Chrome (no userAgentData)", { userAgent: UA.chromeOS, platform: "Linux x86_64", maxTouchPoints: 0 }, "chromeos"],
  ["Ubuntu Firefox", { userAgent: UA.ubuntuFirefox, platform: "Linux x86_64", maxTouchPoints: 0 }, "linux"],
  ["empty user agent", { userAgent: "", platform: "", maxTouchPoints: 0 }, "unknown"],
  ["nothing reported", {}, "unknown"],
  ["unknown user agent", { userAgent: "curl/8.4.0", platform: "", maxTouchPoints: 0 }, "unknown"],
  ["userAgentData only (UA frozen to unknown)", { userAgentData: { platform: "Windows" }, userAgent: "", platform: "", maxTouchPoints: 0 }, "windows"],
  ["userAgentData with an empty platform falls back to the UA", { userAgentData: { platform: "" }, userAgent: UA.macChrome, platform: "MacIntel", maxTouchPoints: 0 }, "mac"],
];

describe("detectPlatform", () => {
  for (const [name, nav, want] of CASES) it(name, () => assert.equal(detectPlatform(nav), want));

  it("a Mac with no touch stays a Mac; one touch point (a trackpad report) too", () => {
    assert.equal(detectPlatform({ userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 1 }), "mac");
  });
});

const NONE: DownloadLinks = { windows: null, mac: null, ios: null, android: null };
const WIN = { x64: "https://downloads.centium.atraxia.org/windows/Centium-setup-x64.exe", arm64: "https://downloads.centium.atraxia.org/windows/Centium-setup-arm64.exe" };
const ALL: DownloadLinks = {
  windows: WIN,
  mac: "https://downloads.centium.atraxia.org/mac/Centium.dmg",
  ios: "https://apps.apple.com/app/id000",
  android: "https://play.google.com/store/apps/details?id=org.atraxia.centium",
};
const only = (p: LinkedPlatform): DownloadLinks => ({ ...NONE, [p]: ALL[p] });
const PLATFORMS: Platform[] = ["windows", "mac", "ios", "android", "chromeos", "linux", "unknown"];
const LABEL = "Download the app";
/** [label, href, other arch, other href] or null (hidden), outside the desktop app. */
const shown = (platform: Platform, links: DownloadLinks, arch: WindowsArch = "x64") => {
  const o = downloadOption(platform, links, arch, false);
  return o && [o.label, o.href, o.other?.arch ?? null, o.other?.href ?? null];
};

describe("the config", () => {
  it("fills the Windows installers (the Desktop session's stable latest links); the rest wait", () => {
    assert.deepEqual(DOWNLOAD_LINKS, { windows: WIN, mac: null, ios: null, android: null });
    assert.equal(WINDOWS_VERSIONS_URL, "https://downloads.centium.atraxia.org/windows/versions.json");
    assert.equal(WINDOWS_SUMS_URL, "https://downloads.centium.atraxia.org/windows/SHA256SUMS.txt");
  });
});

describe("downloadOption", () => {
  it("all links null: the button is hidden on every system", () => {
    for (const p of PLATFORMS) assert.equal(shown(p, NONE), null, p);
  });

  it("each link set: its own system shows Download the app, the rest stay hidden", () => {
    assert.deepEqual(shown("windows", only("windows")), [LABEL, WIN.x64, "arm64", WIN.arm64]);
    assert.deepEqual(shown("mac", only("mac")), [LABEL, ALL.mac, null, null]);
    assert.deepEqual(shown("ios", only("ios")), [LABEL, ALL.ios, null, null]);
    assert.deepEqual(shown("android", only("android")), [LABEL, ALL.android, null, null]);
    assert.equal(shown("mac", only("windows")), null);
    assert.equal(shown("android", only("ios")), null);
    assert.equal(shown("ios", only("mac")), null);
    assert.equal(shown("windows", only("mac")), null);
  });

  it("ChromeOS and Linux never have a button", () => {
    assert.equal(shown("chromeos", ALL), null);
    assert.equal(shown("linux", ALL), null);
  });

  it("unknown: the Windows download (x64, ARM64 as the other), only when it exists", () => {
    assert.deepEqual(shown("unknown", ALL), [LABEL, WIN.x64, "arm64", WIN.arm64]);
    assert.deepEqual(shown("unknown", ALL, "arm64"), [LABEL, WIN.x64, "arm64", WIN.arm64]);
    assert.equal(shown("unknown", only("mac")), null);
    assert.equal(shown("unknown", NONE), null);
  });

  it("Windows on ARM: the ARM64 installer, x64 as the other download", () => {
    assert.deepEqual(shown("windows", ALL, "arm64"), [LABEL, WIN.arm64, "x64", WIN.x64]);
  });

  it("inside the desktop app: no button anywhere (passed, or read from window.centiumDesktop)", () => {
    for (const p of PLATFORMS) assert.equal(downloadOption(p, ALL, "x64", true), null, p);
    const g = globalThis as { centiumDesktop?: unknown };
    try {
      g.centiumDesktop = { platform: "windows", version: "1.0.0" };
      for (const p of PLATFORMS) assert.equal(downloadOption(p, ALL), null, p);
      assert.deepEqual(
        platformList(ALL).map((r) => r.id),
        ["mac", "ios", "android"],
      );
    } finally {
      delete g.centiumDesktop;
    }
    assert.equal(downloadOption("windows", ALL)?.href, WIN.x64);
    assert.equal(platformList(ALL)[0].id, "windows");
  });

  it("never links to /contact or /app", () => {
    for (const links of [NONE, ALL, only("ios")])
      for (const p of PLATFORMS)
        for (const a of ["x64", "arm64"] as WindowsArch[]) {
          const o = downloadOption(p, links, a, false);
          if (o) assert.ok(!/contact|^\/app/.test(o.href) && !/contact/.test(o.other?.href ?? ""));
        }
  });
});

describe("Windows architecture", () => {
  it("pickArch: arm is ARM64, anything else x64", () => {
    assert.equal(pickArch("arm"), "arm64");
    for (const a of ["x86", "", undefined, null, "ARM", "arm64"]) assert.equal(pickArch(a), "x64", String(a));
  });

  const nav = (getHighEntropyValues?: (h: string[]) => Promise<{ architecture?: string }>): NavLike => ({
    userAgentData: { platform: "Windows", getHighEntropyValues },
    userAgent: UA.win11Chrome,
    platform: "Win32",
  });
  it("detectWindowsArch: Chromium's architecture hint, and only that one", async () => {
    let asked: string[] = [];
    assert.equal(
      await detectWindowsArch(
        nav(async (h) => {
          asked = h;
          return { architecture: "arm" };
        }),
      ),
      "arm64",
    );
    assert.deepEqual(asked, ["architecture"]);
    assert.equal(await detectWindowsArch(nav(async () => ({ architecture: "x86" }))), "x64");
  });
  it("detectWindowsArch: x64 when the hint is missing, refused or empty", async () => {
    assert.equal(await detectWindowsArch(nav()), "x64");
    assert.equal(await detectWindowsArch({ userAgent: UA.win11Chrome }), "x64");
    assert.equal(await detectWindowsArch(nav(() => Promise.reject(new Error("NotAllowedError")))), "x64");
    assert.equal(await detectWindowsArch(nav(async () => ({}))), "x64");
  });
});

describe("platformList (Other platforms)", () => {
  const rows = (links: DownloadLinks, arch: WindowsArch = "x64") =>
    platformList(links, arch, false).map((e) => [e.name, e.option ? [e.option.label, e.option.href, e.option.other?.href ?? null] : COMING_SOON]);

  it("all links null: the four platforms say Coming soon (no link); no Browser row", () => {
    assert.deepEqual(rows(NONE), [
      ["Windows", "Coming soon"],
      ["Mac", "Coming soon"],
      ["iPhone and iPad", "Coming soon"],
      ["Android", "Coming soon"],
    ]);
  });

  it("all links set: Download the app on each, Windows with both installers", () => {
    assert.deepEqual(rows(ALL), [
      ["Windows", [LABEL, WIN.x64, WIN.arm64]],
      ["Mac", [LABEL, ALL.mac, null]],
      ["iPhone and iPad", [LABEL, ALL.ios, null]],
      ["Android", [LABEL, ALL.android, null]],
    ]);
    assert.deepEqual(rows(ALL, "arm64")[0], ["Windows", [LABEL, WIN.arm64, WIN.x64]]);
  });

  it("each link set alone switches only its own row", () => {
    (["windows", "mac", "ios", "android"] as LinkedPlatform[]).forEach((p, i) => {
      rows(only(p)).forEach((row, j) => assert.equal(row[1] === COMING_SOON, j !== i, `${p} row ${j}`));
    });
  });

  it("has no Browser, ChromeOS or Linux row; inside the desktop app no Windows row", () => {
    assert.deepEqual(
      platformList(NONE, "x64", false).map((e) => e.name),
      ["Windows", "Mac", "iPhone and iPad", "Android"],
    );
    assert.deepEqual(
      platformList(ALL, "x64", true).map((e) => e.name),
      ["Mac", "iPhone and iPad", "Android"],
    );
  });
});

describe("versions.json", () => {
  it("reads latest", () => {
    assert.equal(parseVersion({ latest: "1.0.0", versions: ["1.0.0"] }), "1.0.0");
    assert.equal(parseVersion({ latest: "1.2" }), "1.2");
    assert.equal(parseVersion({ latest: "10.20.30.4" }), "10.20.30.4");
  });
  it("anything malformed is no version", () => {
    for (const j of [null, undefined, "1.0.0", 1, [], {}, { latest: 1 }, { latest: "" }, { latest: "v1.0.0" }, { latest: "1.0.0<script>" }, { latest: "1.0.0 beta" }, { version: "1.0.0" }])
      assert.equal(parseVersion(j), null, JSON.stringify(j));
  });
});

describe("SHA256SUMS.txt", () => {
  const H = (c: string) => c.repeat(64);
  const TEXT = [`${H("a")}  Centium_1.0.0_x64-setup.exe`, `${H("B")}  Centium_1.0.0_arm64-setup.exe`, `${H("c")}  Centium_0.9.0_x64-setup.exe`, ""].join("\n");
  it("reads the installers of the given version (lower-case)", () => {
    assert.deepEqual(parseSums(TEXT, "1.0.0"), [
      { arch: "x64", file: "Centium_1.0.0_x64-setup.exe", sha256: H("a") },
      { arch: "arm64", file: "Centium_1.0.0_arm64-setup.exe", sha256: H("b") },
    ]);
  });
  it("no version, or one not listed: every installer line", () => {
    assert.equal(parseSums(TEXT, null).length, 3);
    assert.equal(parseSums(TEXT, "2.0.0").length, 3);
  });
  it("CRLF and the binary-mode star are fine", () => {
    assert.equal(parseSums(`${H("d")} *Centium_1.0.0_x64-setup.exe\r\n`, "1.0.0").length, 1);
  });
  it("malformed lines are ignored", () => {
    const bad = [
      `${H("a").slice(1)}  Centium_1.0.0_x64-setup.exe`,
      `${H("z")}  Centium_1.0.0_x64-setup.exe`,
      `${H("a")}  Other_1.0.0_x64-setup.exe`,
      `${H("a")}  Centium_1.0.0_x86-setup.exe`,
      "<html>404</html>",
      `${H("a")}  Centium_1.0.0_x64-setup.exe.sig`,
    ].join("\n");
    assert.deepEqual(parseSums(bad, "1.0.0"), []);
    assert.deepEqual(parseSums("", null), []);
  });
});

describe("desktopLayout (the landing's download panel)", () => {
  it("is on from 1024px wide on any system, as before", () => {
    for (const p of ["windows", "mac", "linux", "chromeos", "ios", "android", "unknown"] as Platform[]) assert.equal(desktopLayout(true, false, p), true, p);
  });
  it("is on below 1024px on a computer with a hovering mouse or trackpad (zoom, display scaling, a smaller window)", () => {
    for (const p of ["windows", "mac", "linux", "chromeos"] as Platform[]) assert.equal(desktopLayout(false, true, p), true, p);
  });
  it("is off below 1024px on phones and tablets, even with a fine pointer (an iPad with a trackpad)", () => {
    for (const p of ["ios", "android", "unknown"] as Platform[]) assert.equal(desktopLayout(false, true, p), false, p);
  });
  it("is off below 1024px with a touch screen as the main pointer, on any system", () => {
    for (const p of ["windows", "mac", "linux", "chromeos", "ios", "android", "unknown"] as Platform[]) assert.equal(desktopLayout(false, false, p), false, p);
  });
});
