import React from "react";
import { ExternalLink } from "lucide-react";
import type { OffProduct } from "../../services/barcode/lookup";

/**
 * A product found on Open Food Facts (step 2 of the barcode lookup order),
 * shown with its licence notice and a link to its page, for the user to
 * confirm before anything is logged. What they confirm lands only on their
 * own diary row, with its attribution; nothing goes into the shared catalogue.
 */
export const OffProductCard: React.FC<{
  product: OffProduct;
  onConfirm: () => void;
  onManual: () => void;
}> = ({ product, onConfirm, onManual }) => {
  const macro = (v: number | null) => (v === null ? "–" : `${v}g`);
  return (
    <div>
      <div style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#241F1B" }}>{product.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8C8378" }}>
          {product.brand ? `${product.brand} · ` : ""}
          {product.perServing ? product.servingLabel : "per 100 g"}
        </p>
        <div className="grid grid-cols-4 text-center" style={{ marginTop: 12 }}>
          {[
            [`${product.calories}`, "kcal"],
            [macro(product.protein), "protein"],
            [macro(product.carbs), "carbs"],
            [macro(product.fat), "fat"],
          ].map(([v, l]) => (
            <div key={l}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#241F1B" }}>{v}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#8C8378" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
      <p style={{ margin: "10px 2px 0", fontSize: 11, color: "#8C8378", lineHeight: 1.45 }}>
        {product.attribution.notice}{" "}
        <a
          href={product.attribution.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center"
          style={{ color: "#7D67D9", fontWeight: 600, gap: 3 }}
        >
          View on Open Food Facts <ExternalLink size={11} />
        </a>
      </p>
      <div className="flex" style={{ gap: 10, marginTop: 14 }}>
        <button
          onClick={onManual}
          className="tap flex-1"
          style={{ height: 48, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: "#241F1B", fontSize: 14, fontWeight: 600 }}
        >
          Enter it myself
        </button>
        <button
          onClick={onConfirm}
          className="tap flex-1"
          style={{ height: 48, borderRadius: 14, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 14, fontWeight: 700 }}
        >
          Use this product
        </button>
      </div>
    </div>
  );
};
