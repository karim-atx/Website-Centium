import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import largerText from "./scripts/postcss/larger-text.js";

export default {
  // largerText runs after Tailwind so its generated font sizes are covered.
  plugins: [tailwindcss, largerText, autoprefixer],
}
