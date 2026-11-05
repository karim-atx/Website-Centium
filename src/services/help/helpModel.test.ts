import { test } from "node:test";
import assert from "node:assert/strict";
import { foldForSearch, helpContext, MAX_VIEWED, noteViewed, parseHelpCenter, searchHelp, type Viewed } from "./helpModel";

const center = {
  language: "en",
  audience: "member",
  topics: [
    {
      id: "t1",
      key: "account",
      title: "Getting started and your account",
      questions: [
        { id: "q1", key: "account.what-is-centium", question: "What is Centium?", answer: "Centium brings your health in one place." },
        { id: "q2", key: "account.arabic", question: "Can I use Centium in Arabic?", answer: "Yes. Go to Settings, then Language." },
      ],
    },
    { id: "t2", key: "logging", title: "Logging and features", questions: [{ id: "q3", key: "logging.water", question: "I logged the wrong amount of water.", answer: "Use the minus button." }] },
    { id: "t3", key: "empty", title: "Nothing here", questions: [] },
    { id: "", key: "bad", title: "No id", questions: [{ id: "q9", key: "x", question: "x", answer: "x" }] },
  ],
};

test("parseHelpCenter keeps whole topics and questions, in order", () => {
  const h = parseHelpCenter(center)!;
  assert.deepEqual(h.topics.map((t) => t.key), ["account", "logging"]);
  assert.equal(h.topics[0].questions.length, 2);
  assert.equal(parseHelpCenter(null), null);
  assert.equal(parseHelpCenter({ topics: "x" }), null);
});

test("the support hours text is read when the database sends it", () => {
  assert.equal(parseHelpCenter(center)!.supportHoursText, null);
  const text = "Our team is here Monday to Friday, 9:00–18:00 Beirut time, and replies within 1 working day.";
  assert.equal(parseHelpCenter({ ...center, support_hours: { days: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00", text } })!.supportHoursText, text);
  assert.equal(parseHelpCenter({ ...center, support_hours: { text: "  " } })!.supportHoursText, null);
});

test("search finds every typed word in a question or its answer", () => {
  const topics = parseHelpCenter(center)!.topics;
  assert.deepEqual(searchHelp(topics, "water").map((r) => r.question.id), ["q3"]);
  assert.deepEqual(searchHelp(topics, "  CENTIUM arabic ").map((r) => r.question.id), ["q2"]);
  assert.deepEqual(searchHelp(topics, "settings language").map((r) => r.question.id), ["q2"]);
  assert.deepEqual(searchHelp(topics, "nothing matches this"), []);
  assert.deepEqual(searchHelp(topics, "   "), []);
});

test("search ignores Arabic short vowels and the letter variants people type", () => {
  assert.equal(foldForSearch("إلغاءُ"), foldForSearch("الغاء"));
  assert.equal(foldForSearch("مُستشفى"), foldForSearch("مستشفي"));
  assert.equal(foldForSearch("صلاة"), foldForSearch("صلاه"));
  assert.equal(foldForSearch("Café"), "cafe");
});

const v = (n: number, topic = "t1"): Viewed => ({ topicId: topic, topicKey: topic === "t1" ? "account" : "logging", questionId: `q${n}`, questionKey: `k${n}` });

test("questions viewed: each once, the latest last, at most 20", () => {
  let viewed: Viewed[] = [];
  viewed = noteViewed(viewed, v(1));
  viewed = noteViewed(viewed, v(2));
  viewed = noteViewed(viewed, v(1));
  assert.deepEqual(viewed.map((x) => x.questionId), ["q2", "q1"]);
  for (let i = 3; i < 40; i++) viewed = noteViewed(viewed, v(i));
  assert.equal(viewed.length, MAX_VIEWED);
  assert.equal(viewed[viewed.length - 1].questionId, "q39");
});

test("the context is the last question's topic and every question opened", () => {
  assert.equal(helpContext([]), null);
  assert.deepEqual(helpContext([v(1), v(3, "t2")]), { topicId: "t2", topicKey: "logging", questionIds: ["q1", "q3"], questionKeys: ["k1", "k3"] });
});
