import type { Food } from "../types";

// Prototype-level nutrition estimates — for demo purposes only, not verified
// medical/nutritional data. A real food database would back this later.
export const mockFoods: Food[] = [
  { id: "f1", name: "Manoushe Zaatar", nameAr: "مناقيش زعتر", category: "traditional", serving: "1 piece", calories: 420, protein: 10, carbs: 52, fat: 19, isLebanese: true },
  { id: "f2", name: "Manoushe Jebneh", nameAr: "مناقيش جبنة", category: "traditional", serving: "1 piece", calories: 460, protein: 16, carbs: 48, fat: 22, isLebanese: true },
  { id: "f3", name: "Labneh", nameAr: "لبنة", category: "traditional", serving: "2 tbsp", calories: 120, protein: 5, carbs: 4, fat: 9, isLebanese: true },
  { id: "f4", name: "Hummus", nameAr: "حمص", category: "traditional", serving: "1/2 cup", calories: 210, protein: 8, carbs: 20, fat: 12, isLebanese: true },
  { id: "f5", name: "Tabbouleh", nameAr: "تبولة", category: "traditional", serving: "1 cup", calories: 140, protein: 3, carbs: 18, fat: 7, isLebanese: true },
  { id: "f6", name: "Fattoush", nameAr: "فتوش", category: "traditional", serving: "1 bowl", calories: 190, protein: 4, carbs: 22, fat: 10, isLebanese: true },
  { id: "f7", name: "Chicken Shawarma", nameAr: "شاورما دجاج", category: "restaurant", serving: "1 wrap", calories: 620, protein: 34, carbs: 55, fat: 28, isLebanese: true },
  { id: "f8", name: "Shish Tawook", nameAr: "شيش طاووق", category: "traditional", serving: "3 skewers", calories: 320, protein: 40, carbs: 6, fat: 14, isLebanese: true },
  { id: "f9", name: "Kibbeh", nameAr: "كبة", category: "traditional", serving: "2 pieces", calories: 280, protein: 14, carbs: 22, fat: 15, isLebanese: true },
  { id: "f10", name: "Warak Enab", nameAr: "ورق عنب", category: "traditional", serving: "6 pieces", calories: 220, protein: 5, carbs: 30, fat: 9, isLebanese: true },
  { id: "f11", name: "Mujaddara", nameAr: "مجدرة", category: "traditional", serving: "1 bowl", calories: 350, protein: 12, carbs: 58, fat: 8, isLebanese: true },
  { id: "f12", name: "Toum", nameAr: "توم", category: "ingredients", serving: "1 tbsp", calories: 90, protein: 0, carbs: 1, fat: 10, isLebanese: true },
  { id: "f13", name: "Lebanese Bread", nameAr: "خبز", category: "ingredients", serving: "1 loaf", calories: 210, protein: 7, carbs: 42, fat: 1, isLebanese: true },
  { id: "f14", name: "Kaak", nameAr: "كعك", category: "snacks", serving: "1 piece", calories: 260, protein: 8, carbs: 44, fat: 6, isLebanese: true },
  { id: "f15", name: "Baklava", nameAr: "بقلاوة", category: "snacks", serving: "1 piece", calories: 210, protein: 3, carbs: 24, fat: 12, isLebanese: true },
  { id: "f16", name: "Maamoul", nameAr: "معمول", category: "snacks", serving: "1 piece", calories: 180, protein: 3, carbs: 22, fat: 9, isLebanese: true },
  { id: "f17", name: "Laban", nameAr: "لبن", category: "drinks", serving: "1 cup", calories: 90, protein: 6, carbs: 9, fat: 3, isLebanese: true },
  { id: "f18", name: "French Fries", category: "restaurant", serving: "1 small", calories: 340, protein: 4, carbs: 43, fat: 17 },
  { id: "f19", name: "Diet Pepsi", category: "drinks", serving: "1 can", calories: 0, protein: 0, carbs: 0, fat: 0 },
  { id: "f20", name: "Banana", category: "snacks", serving: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { id: "f21", name: "Coffee", category: "drinks", serving: "1 cup", calories: 20, protein: 0, carbs: 3, fat: 1, isLebanese: true },
  { id: "f22", name: "Grilled Chicken Breast", category: "homemade", serving: "150g", calories: 250, protein: 46, carbs: 0, fat: 6 },
  { id: "f23", name: "Rice", category: "homemade", serving: "1 cup", calories: 205, protein: 4, carbs: 45, fat: 0 },
  { id: "f24", name: "Greek Salad", category: "lunch", serving: "1 bowl", calories: 220, protein: 6, carbs: 12, fat: 17 },
  { id: "f25", name: "Falafel", nameAr: "فلافل", category: "traditional", serving: "4 pieces", calories: 330, protein: 12, carbs: 30, fat: 18, isLebanese: true },
  { id: "f26", name: "Man'oushe Keshek", nameAr: "مناقيش كشك", category: "breakfast", serving: "1 piece", calories: 380, protein: 12, carbs: 46, fat: 16, isLebanese: true },
  { id: "f27", name: "Om Ali", nameAr: "أم علي", category: "snacks", serving: "1 bowl", calories: 410, protein: 8, carbs: 46, fat: 20, isLebanese: true },
  { id: "f28", name: "Grilled Fish", category: "dinner", serving: "180g", calories: 260, protein: 40, carbs: 0, fat: 10 },
  { id: "f29", name: "Almonds", category: "snacks", serving: "1 oz", calories: 165, protein: 6, carbs: 6, fat: 14 },
  { id: "f30", name: "Oatmeal", category: "breakfast", serving: "1 bowl", calories: 220, protein: 8, carbs: 38, fat: 4 },
];

export const foodCategories = [
  { id: "traditional", label: "Traditional" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
  { id: "drinks", label: "Drinks" },
  { id: "restaurant", label: "Restaurant" },
  { id: "homemade", label: "Homemade" },
  { id: "ingredients", label: "Ingredients" },
] as const;

export const findFoodByName = (name: string): Food | undefined =>
  mockFoods.find((f) => f.name.toLowerCase() === name.toLowerCase());
