// V6 (QA 6.0): content backing the Meditation sheet's Breathing/Stretching/
// Yoga tabs.

export interface BreathingPattern {
  id: string;
  name: string;
  desc: string;
  phases: { label: string; seconds: number }[];
}

export const breathingPatterns: BreathingPattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    desc: "Equal counts in, hold, out, hold — used by Navy SEALs to stay calm under pressure.",
    phases: [
      { label: "Breathe in", seconds: 4 },
      { label: "Hold", seconds: 4 },
      { label: "Breathe out", seconds: 4 },
      { label: "Hold", seconds: 4 },
    ],
  },
  {
    id: "478",
    name: "4-7-8 Relaxation",
    desc: "A longer exhale than inhale to trigger the body's relaxation response.",
    phases: [
      { label: "Breathe in", seconds: 4 },
      { label: "Hold", seconds: 7 },
      { label: "Breathe out", seconds: 8 },
    ],
  },
  {
    id: "deep",
    name: "Simple Deep Breathing",
    desc: "An easy in-and-out pattern, good for beginners or a quick reset.",
    phases: [
      { label: "Breathe in", seconds: 4 },
      { label: "Breathe out", seconds: 4 },
    ],
  },
];

export interface StretchItem {
  id: string;
  name: string;
  type: "static" | "dynamic";
  target: string;
  seconds: number;
  instructions: string;
}

export const stretchList: StretchItem[] = [
  {
    id: "st1",
    name: "Standing Hamstring Stretch",
    type: "static",
    target: "Hamstrings",
    seconds: 30,
    instructions: "Hinge at the hips with a soft knee bend, reach toward your toes, and hold — don't bounce.",
  },
  {
    id: "st2",
    name: "Doorway Chest Stretch",
    type: "static",
    target: "Chest & shoulders",
    seconds: 30,
    instructions: "Place your forearm on a doorframe at shoulder height and gently lean forward.",
  },
  {
    id: "st3",
    name: "Seated Spinal Twist",
    type: "static",
    target: "Lower back",
    seconds: 30,
    instructions: "Sit tall, cross one leg over the other, and rotate your torso toward the bent knee.",
  },
  {
    id: "st4",
    name: "Leg Swings",
    type: "dynamic",
    target: "Hips & hamstrings",
    seconds: 20,
    instructions: "Hold onto something stable and swing one leg forward and back in a controlled arc.",
  },
  {
    id: "st5",
    name: "Arm Circles",
    type: "dynamic",
    target: "Shoulders",
    seconds: 20,
    instructions: "Extend your arms out and make slow, controlled circles, growing larger over time.",
  },
  {
    id: "st6",
    name: "Walking Lunges with Twist",
    type: "dynamic",
    target: "Hips & core",
    seconds: 30,
    instructions: "Step into a lunge and rotate your torso toward your front leg, then switch sides.",
  },
];

export interface YogaPose {
  id: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string;
}

export const yogaPoses: YogaPose[] = [
  {
    id: "y1",
    name: "Child's Pose",
    difficulty: "beginner",
    instructions: "Kneel and sit back on your heels, then fold forward with arms extended, resting your forehead down.",
  },
  {
    id: "y2",
    name: "Cat-Cow",
    difficulty: "beginner",
    instructions: "On hands and knees, alternate arching your spine up (cat) and dipping it down (cow).",
  },
  {
    id: "y3",
    name: "Downward Dog",
    difficulty: "intermediate",
    instructions: "From hands and knees, lift your hips up and back, forming an inverted V with your body.",
  },
  {
    id: "y4",
    name: "Warrior II",
    difficulty: "intermediate",
    instructions: "Step into a wide stance, bend the front knee, and extend your arms parallel to the floor.",
  },
  {
    id: "y5",
    name: "Crow Pose",
    difficulty: "advanced",
    instructions: "Balance your knees on your upper arms, lean forward, and lift your feet off the ground.",
  },
  {
    id: "y6",
    name: "Wheel Pose",
    difficulty: "advanced",
    instructions: "Lying down, place hands by your ears and feet near your hips, then press up into a full backbend.",
  },
];
