import React from "react";
import { PrepCreateSheet } from "./PrepCreateSheet";

// Master handover item 11 / FO3.2: Create Recipe is the shared Meal Prep form
// (usePrepForm) in a sheet — name, servings, ingredients from the same food
// search Add Food uses, a per-serving macro strip and optional steps. Editing
// a recipe happens in its own detail popup (MealPrepFlowSheet), not here.
export const CreateRecipeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => <PrepCreateSheet kind="recipes" open={open} onClose={onClose} />;
