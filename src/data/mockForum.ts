import type { ForumPost } from "../types";

// V9 (QA 9.0): "give me an example of something like this, take
// inspiration for other fitness forums" — a small seeded set spanning the
// kinds of posts real fitness communities (r/Fitness, MyFitnessPal, Reddit's
// r/loseit) tend to have: a progress win, a how-to question, a recipe/meal
// tip, and a motivation post — each with a couple of replies already in.
export const mockForumPosts: ForumPost[] = [
  {
    id: "fp1",
    authorName: "Nadine K.",
    category: "Progress",
    title: "Hit a 90kg deadlift PR today!",
    body: "Been chasing this number for 3 months. Slow and steady progressive overload really works — started at 60kg in January.",
    likes: 24,
    likedByMe: false,
    at: "2026-08-24T09:15:00.000Z",
    comments: [
      { id: "fc1", authorName: "Tony K.", text: "Huge! What's your rep scheme been?", at: "2026-08-24T10:00:00.000Z" },
      { id: "fc2", authorName: "Nadine K.", text: "5x5 mostly, deload every 5th week.", at: "2026-08-24T10:30:00.000Z" },
    ],
  },
  {
    id: "fp2",
    authorName: "Sami R.",
    category: "Nutrition",
    title: "Easy high-protein mana'ish alternative?",
    body: "Trying to hit 160g protein/day without giving up Lebanese breakfast. Anyone found a good swap for the usual za'atar mana'ish?",
    likes: 11,
    likedByMe: false,
    at: "2026-08-23T14:30:00.000Z",
    comments: [
      { id: "fc3", authorName: "Layal C.", text: "Labneh + eggs wrap with a side of za'atar, still scratches the itch.", at: "2026-08-23T15:00:00.000Z" },
    ],
  },
  {
    id: "fp3",
    authorName: "Elie S.",
    category: "Workouts",
    title: "Form check: does my squat depth look off?",
    body: "Coach mentioned I might be cutting it high. Recorded my last set today — knees track fine but not sure about depth.",
    likes: 6,
    likedByMe: false,
    at: "2026-08-22T18:00:00.000Z",
    comments: [],
  },
  {
    id: "fp4",
    authorName: "Rana F.",
    category: "Motivation",
    title: "6 months of consistency > any 6-week program",
    body: "Just a reminder for anyone starting out: the people you see with real results almost never had a perfect plan, they just didn't quit. Missed workouts happen. Keep going.",
    likes: 38,
    likedByMe: false,
    at: "2026-08-21T08:00:00.000Z",
    comments: [
      { id: "fc4", authorName: "Karim A.", text: "Needed this today, thanks 🙏", at: "2026-08-21T09:00:00.000Z" },
    ],
  },
];
