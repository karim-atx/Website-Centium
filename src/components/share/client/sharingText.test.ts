import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { answerToast, askBody, askTitle, sharedDate, sharedSub, sharedTitle, visibilityFromPayload, visibilityPhrase, WIN_SHARING_OPTIONS } from "./sharingText";
import { cardPayload, specFromPayload, winCard, type ClientWin } from "../shareCardModel";

const spec = (w: Omit<ClientWin, "winId" | "clientId">) => {
  const c = winCard({ winId: "w", clientId: "c", ...w })!;
  return specFromPayload(cardPayload(c, "post", "B", "S.R."), "Rami")!.spec;
};

describe("CU29 / CU30 words", () => {
  it("writes the pop-up title and body per visibility, keeping the frame's sentence for initials", () => {
    assert.equal(askTitle("Rami"), "Rami would like to share your win");
    assert.equal(askBody("initials"), "On Instagram and other apps. You'd be shown by your initials.");
    assert.equal(askBody("name"), "On Instagram and other apps. You'd be shown by your first name.");
    assert.equal(askBody("none"), "On Instagram and other apps. You'd be shown without your name.");
    assert.equal(visibilityPhrase("none"), "without your name");
  });

  it("writes the toast per answer", () => {
    assert.equal(answerToast("allowed"), "Allowed. Change this in Sharing your wins.");
    assert.equal(answerToast("allowed_no_name"), "Allowed without your name. Change this in Sharing your wins.");
    assert.equal(answerToast("declined"), "Declined. Change this in Sharing your wins.");
  });

  it("titles a shared card from its payload", () => {
    assert.equal(sharedTitle(spec({ kind: "pr", occurredAt: "2026-10-14", value: { pr_exercise: "Back squat", pr_load_kg: 120 } })), "New PR · Back squat");
    assert.equal(sharedTitle(spec({ kind: "logging_streak", occurredAt: "2026-10-12", value: { logging_streak_days: 100 } })), "100-day logging streak");
    assert.equal(sharedTitle(spec({ kind: "streak", occurredAt: "2026-10-12", value: { streak_days: 30 } })), "30-day habit streak");
    assert.equal(sharedTitle(spec({ kind: "meal_plan_complete", occurredAt: "2026-10-12", value: { meal_plan_name: "Balanced week" } })), "Meal plan complete · Balanced week");
    assert.equal(sharedTitle(spec({ kind: "programme_complete", occurredAt: "2026-10-12", value: { programme_name: "Strength foundations", programme_weeks: 12 } })), "Programme complete · Strength foundations");
    assert.equal(sharedTitle(spec({ kind: "consistency", occurredAt: "2026-10-12", value: { workouts_count: 14, weeks_count: 4 } })), "14 workouts in the last 4 weeks");
  });

  it("reads how the client is shown from a payload when the request isn't readable", () => {
    assert.equal(visibilityFromPayload({ name_display: "S.R." }), "initials");
    assert.equal(visibilityFromPayload({ name_display: "Sam" }), "name");
    assert.equal(visibilityFromPayload({ name_display: "A client" }), "none");
    assert.equal(visibilityFromPayload({}), "none");
  });

  it("dates rows in the app's short-date convention, as the professional side does", () => {
    const now = new Date(2026, 9, 15);
    assert.equal(sharedDate(new Date(2026, 9, 14, 9).toISOString(), now), "Oct 14");
    assert.equal(sharedDate(new Date(2025, 9, 14, 9).toISOString(), now), "Oct 14, 2025");
    assert.equal(sharedSub("Rami", new Date(2026, 9, 14, 9).toISOString(), "none", now), "Rami · Oct 14 · without your name");
  });

  it("keeps the COPY radio rows verbatim, straight apostrophes", () => {
    assert.deepEqual(WIN_SHARING_OPTIONS.map((o) => o.title), ["Always ask", "Always allow", "Never allow"]);
    assert.equal(WIN_SHARING_OPTIONS[2].desc, "They can't share your wins or ask you.");
    assert.ok(WIN_SHARING_OPTIONS.every((o) => !/[’—]/.test(o.desc)));
  });
});
