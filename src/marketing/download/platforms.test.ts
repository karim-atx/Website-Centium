import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BROWSER_OPTION, COMING_SOON, DOWNLOAD_LINKS, detectPlatform, downloadOptions, platformList, type LinkedPlatform, type NavLike, type Platform } from "./platforms";

// Task O: the download button's detection and fallbacks, with real user-agent
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

const NONE: Record<LinkedPlatform, string | null> = { windows: null, mac: null, ios: null, android: null };
const ALL: Record<LinkedPlatform, string> = {
  windows: "https://apps.microsoft.com/detail/9TEST",
  mac: "https://centium.atraxia.org/download/Centium.dmg",
  ios: "https://apps.apple.com/app/id000",
  android: "https://play.google.com/store/apps/details?id=org.atraxia.centium",
};
const only = (p: LinkedPlatform) => ({ ...NONE, [p]: ALL[p] });
const shown = (platform: Platform, links: Record<LinkedPlatform, string | null>) => downloadOptions(platform, links).map((o) => [o.label, o.href]);
const FALLBACK = ["Open Centium in your browser", "/app"];

describe("downloadOptions", () => {
  it("ships with every link empty (decision 8)", () => {
    assert.deepEqual(DOWNLOAD_LINKS, NONE);
  });

  it("all links null: every platform shows the one browser fallback, once", () => {
    for (const p of ["windows", "mac", "ios", "android", "chromeos", "linux", "unknown"] as Platform[]) assert.deepEqual(shown(p, NONE), [FALLBACK], p);
    assert.deepEqual(BROWSER_OPTION, { id: "browser", label: "Open Centium in your browser", href: "/app" });
  });

  it("each link set: its own platform switches over, the rest keep the fallback", () => {
    assert.deepEqual(shown("windows", only("windows")), [["Download for Windows", ALL.windows]]);
    assert.deepEqual(shown("mac", only("mac")), [["Download for Mac", ALL.mac]]);
    assert.deepEqual(shown("ios", only("ios")), [["Download on the App Store", ALL.ios]]);
    assert.deepEqual(shown("android", only("android")), [["Get it on Google Play", ALL.android]]);
    assert.deepEqual(shown("mac", only("windows")), [FALLBACK]);
    assert.deepEqual(shown("android", only("ios")), [FALLBACK]);
  });

  it("ChromeOS and Linux always get the browser (decisions 4 and 6)", () => {
    assert.deepEqual(shown("chromeos", ALL), [FALLBACK]);
    assert.deepEqual(shown("linux", ALL), [FALLBACK]);
  });

  it("unknown: both desktop options, each falling back on its own", () => {
    assert.deepEqual(shown("unknown", ALL), [["Download for Windows", ALL.windows], ["Download for Mac", ALL.mac]]);
    assert.deepEqual(shown("unknown", only("windows")), [["Download for Windows", ALL.windows], FALLBACK]);
    assert.deepEqual(shown("unknown", only("mac")), [FALLBACK, ["Download for Mac", ALL.mac]]);
    assert.deepEqual(shown("unknown", only("ios")), [FALLBACK]);
  });

  it("never links to /contact", () => {
    for (const links of [NONE, ALL, only("ios")])
      for (const p of ["windows", "mac", "ios", "android", "chromeos", "linux", "unknown"] as Platform[])
        for (const o of downloadOptions(p, links)) assert.ok(!o.href.includes("contact"));
  });
});

describe("platformList (Other platforms)", () => {
  const rows = (links: Record<LinkedPlatform, string | null>) => platformList(links).map((e) => [e.name, e.option ? [e.option.label, e.option.href] : COMING_SOON]);

  it("all links null: the four platforms say Coming soon (no link), then one Browser row to /app", () => {
    assert.deepEqual(rows(NONE), [
      ["Windows", "Coming soon"],
      ["Mac", "Coming soon"],
      ["iPhone and iPad", "Coming soon"],
      ["Android", "Coming soon"],
      ["Browser", ["Open Centium in your browser", "/app"]],
    ]);
  });

  it("all links set: each platform's own action and link, then the Browser row", () => {
    assert.deepEqual(rows(ALL), [
      ["Windows", ["Download for Windows", ALL.windows]],
      ["Mac", ["Download for Mac", ALL.mac]],
      ["iPhone and iPad", ["Download on the App Store", ALL.ios]],
      ["Android", ["Get it on Google Play", ALL.android]],
      ["Browser", ["Open Centium in your browser", "/app"]],
    ]);
  });

  it("each link set alone switches only its own row", () => {
    (["windows", "mac", "ios", "android"] as LinkedPlatform[]).forEach((p, i) => {
      rows(only(p)).forEach((row, j) => assert.equal(row[1] === COMING_SOON, j !== i && j < 4, `${p} row ${j}`));
    });
  });

  it("has no ChromeOS or Linux row (they use Browser)", () => {
    assert.deepEqual(
      platformList(NONE).map((e) => e.name),
      ["Windows", "Mac", "iPhone and iPad", "Android", "Browser"],
    );
  });
});
