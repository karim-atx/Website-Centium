// Pure types (no runtime imports), so node tests and pure models can use them without pulling the Supabase client into the test project.
import type { Database } from "../../../lib/supabase/database.types";

export type OfferingCategory = Database["public"]["Enums"]["offering_category"];

export interface Offering {
  id: string;
  title: string;
  category: OfferingCategory;
  /** Formatted for display ("$25"), empty when the column is null. */
  price: string;
  description: string;
}
