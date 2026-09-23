import React from "react";
import type { Recipe } from "../../types";
import { PrepCreateSheet } from "./PrepCreateSheet";

// Master handover item 11: Create / edit Recipe is the shared Meal Prep
// create screen (PrepCreateSheet) — name, servings, ingredients from the same
// food search Add Food uses, a per-serving macro strip, optional steps, and
// Save / the destructive button. Only the client's own Meal Prep opens it.
export const CreateRecipeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  editRecipe?: Recipe | null;
  /** Back chevron and Save return to the Recipes list. */
  onBack?: () => void;
}> = ({ open, onClose, editRecipe, onBack }) => (
  <PrepCreateSheet kind="recipes" open={open} onClose={onClose} editRecipe={editRecipe} onBack={onBack} />
);
