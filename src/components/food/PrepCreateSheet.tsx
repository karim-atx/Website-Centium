import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { usePrepForm } from "./usePrepForm";
import type { PrepKind } from "./MealPrepFlowSheet";
import type { CustomMeal, Recipe } from "../../types";

/**
 * The Meal Prep create screen (and the meal-plan builder's meal editor) in a
 * sheet: the shared form (usePrepForm). Save, delete and the back chevron
 * return to `onBack` when there is one, otherwise the sheet closes.
 */
export const PrepCreateSheet: React.FC<{
  kind: PrepKind;
  open: boolean;
  onClose: () => void;
  editMeal?: CustomMeal | null;
  editRecipe?: Recipe | null;
  onBack?: () => void;
  /** Professional meal-plan builder: the client whose plan this meal belongs to. */
  clientId?: string;
}> = ({ kind, open, onClose, editMeal, editRecipe, onBack, clientId }) => {
  const form = usePrepForm({ kind, active: open, editMeal, editRecipe, clientId, onDone: () => (onBack ?? onClose)() });
  return (
    <BottomSheet
      light
      open={open}
      onClose={() => {
        form.leaveForm();
        onClose();
      }}
      title={form.title}
      onBack={
        form.searchBack ??
        (onBack
          ? () => {
              form.leaveForm();
              onBack();
            }
          : undefined)
      }
    >
      {form.body}
    </BottomSheet>
  );
};
