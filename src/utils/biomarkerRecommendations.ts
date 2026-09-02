import type { UserProfile } from "../types";

// QA 11.0: "Based on the information provided by the client, like age,
// sex, weight and other information you deem is important, provide
// recommendations on what tests might be important. For example, if a
// client is a female in her 80s and weighs 50kgs, the biomarkers widget
// should recommend doing Dexa scans in the imaging because she is prone
// to osteoporosis. Use this examples for other diseases. Make sure to
// state that this is not for diagnosis or prognosis only recommendation."
export interface TestRecommendation {
  test: string;
  reason: string;
}

export function getTestRecommendations(user: UserProfile): TestRecommendation[] {
  const recs: TestRecommendation[] = [];
  const age = user.age ?? 0;
  const isFemale = user.sex === "female";
  const isMale = user.sex === "male";
  const bmi = user.heightCm ? user.weightKg / ((user.heightCm / 100) * (user.heightCm / 100)) : null;

  // Postmenopausal women and low body weight are the two biggest
  // osteoporosis risk factors a resting profile can flag.
  if (isFemale && age >= 65) {
    recs.push({
      test: "DEXA (bone density) scan",
      reason:
        user.weightKg < 60
          ? `Postmenopausal age combined with a lower body weight (${user.weightKg}kg) raises osteoporosis risk.`
          : "Postmenopausal age alone is a standard indication for a baseline bone density scan.",
    });
  }
  if (age >= 45 && (isMale || isFemale)) {
    recs.push({
      test: "Fasting glucose / HbA1c",
      reason: "Type 2 diabetes risk rises with age — a periodic fasting glucose or HbA1c check is standard from 45+.",
    });
  }
  if (isMale && age >= 50) {
    recs.push({
      test: "PSA (prostate-specific antigen)",
      reason: "Routine prostate screening is commonly recommended for men from age 50.",
    });
  }
  if (bmi !== null && bmi >= 30) {
    recs.push({
      test: "Lipid panel",
      reason: `A BMI of ${bmi.toFixed(1)} is in the obese range, which raises cardiovascular risk worth tracking with cholesterol/triglycerides.`,
    });
  }
  if (age >= 40) {
    recs.push({
      test: "Blood pressure check",
      reason: "Hypertension risk increases with age and often has no symptoms — worth checking periodically from 40+.",
    });
  }

  return recs;
}
