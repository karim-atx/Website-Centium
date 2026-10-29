import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { usePrepForm } from "./usePrepForm";
import type { PrepKind } from "./MealPrepFlowSheet";
import type { CustomMeal, Recipe } from "../../types";

/**
 * The Meal Prep create screen in a sheet: the shared form (usePrepForm).
 * Save, delete and the back chevron return to `onBack` when there is one,
 * otherwise the sheet closes. Professionals use it for their own recipes
 * (Release 3 NU9).
 */
export const PrepCreateSheet: React.FC<{
  kind: PrepKind;
  open: boolean;
  onClose: () => void;
  editMeal?: CustomMeal | null;
  editRecipe?: Recipe | null;
  onBack?: () => void;
  /** A professional's own recipe screen: numbers stay whatever their recovery setting. */
  professional?: boolean;
}> = ({ kind, open, onClose, editMeal, editRecipe, onBack, professional = false }) => {
  const form = usePrepForm({ kind, active: open, editMeal, editRecipe, professional, onDone: () => (onBack ?? onClose)() });
  return (
    <BottomSheet
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
