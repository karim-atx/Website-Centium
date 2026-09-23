import React from "react";
import type { CustomMeal } from "../../types";
import { PrepCreateSheet } from "./PrepCreateSheet";

// V4: Meal Prep reworked — "Create Meal" groups several existing food items
// under one title (e.g. eggs + tea + bread + cream cheese -> "Omelette
// Breakfast"); logging that title later logs every item individually.
// V7 (QA 7.0): also used by the professional's Meal Plan Builder — passing
// `clientId` scopes food creation to that client's own food database and
// saves to that client's plan.
//
// Both now render the shared Meal Prep create screen (PrepCreateSheet, master
// handover item 11): the real food search Add Food uses, typed quantities,
// unit chips, a live macro strip, and the destructive button.
export const CreateMealSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  clientId?: string;
  // V10 (QA 10.0): "Creating a meal prep should also allow you to edit and
  // delete it" — passing an existing meal pre-fills the form and saving
  // updates it in place instead of creating a new one.
  editMeal?: CustomMeal | null;
  /** Meal Prep: back chevron and Save return to the Custom Meals list. */
  onBack?: () => void;
}> = ({ open, onClose, clientId, editMeal, onBack }) => (
  <PrepCreateSheet
    kind="meals"
    open={open}
    onClose={onClose}
    editMeal={editMeal}
    onBack={onBack}
    clientId={clientId}
  />
);
