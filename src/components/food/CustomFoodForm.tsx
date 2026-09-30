import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useCustomFoodForm } from "./useCustomFoodForm";
import type { FoodSearchResult } from "../../services/food";

// Create Custom Food (FO8): the shared form (useCustomFoodForm) in a
// near-full-height sheet with the Save row pinned as a sticky footer, from
// every entry point. Each caller says what the sheet is called and what
// "back" means: Add Food returns to the food list, the voice logger to its
// review.
export const CustomFoodForm: React.FC<{
  initialName?: string;
  onSaved: (food: FoodSearchResult) => void;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  /** Shown above the form (the voice logger's "Heard …" note). */
  intro?: React.ReactNode;
}> = ({ initialName, onSaved, open, onClose, onBack, title, intro }) => {
  const form = useCustomFoodForm({ initialName, onSaved });
  return (
    <>
      <BottomSheet light open={open} onClose={onClose} onBack={onBack} title={title} size="tall" footer={form.footer} footerRule>
        {intro}
        {form.body}
      </BottomSheet>
      {form.scanner}
    </>
  );
};
