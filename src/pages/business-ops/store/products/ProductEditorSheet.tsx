import { useEffect, useState } from "react";
import { ChevronDown, ImagePlus, Pencil, Trash2 } from "lucide-react";
import {
  STOCK_WRITES,
  createProduct,
  deleteProduct,
  parseStock,
  setProductVisible,
  updateProduct,
  type Product,
} from "../../../../services/store/products";
import { parsePrice } from "../../../../utils/price";
import { useOnline } from "../../../../hooks/useOnline";
import { KitField, KitFieldButton, KitPop, OpsSheet, TextButton } from "../opsKit";

// OP1-010 / OP1-011 · New product / Edit product. V6-157: the ONE product
// editor, shared with AN11 (listings): Name, Category, Price and In stock as
// OP1 draws them, then AN11's Photo and Description. Stock, category and
// photo are B11 columns: until B11 is on the database they show as
// "Coming soon" and are not sent (`stockShipped`).

const PRICE_ERROR = "Enter the price as a number, for example 25 or $25.";
const STOCK_ERROR = "Enter a whole number, 0 or more.";

export interface ProductEditorProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessType: string | null;
  stockShipped: boolean;
  /** null = New product. */
  product: Product | null;
  onSaved: (message: string) => void;
}

export function ProductEditorSheet({ open, onClose, businessId, businessType, stockShipped, product, onSaved }: ProductEditorProps) {
  const online = useOnline();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState({ price: false, stock: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Prefill each time the sheet opens (OP1-011 #2; O2: no skeleton, the row's values).
  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setPrice(product?.price != null ? String(product.price) : "");
    setStock(product?.stock != null ? String(product.stock) : "");
    setDescription(product?.description ?? "");
    setTouched({ price: false, stock: false });
    setError(null);
  }, [open, product, stockShipped]);

  const p = parsePrice(price);
  const priceOk = p.ok && p.value !== null;
  // Stock is read when B11's column exists; it is written only once B11's write path is wired.
  const stockEditable = stockShipped && STOCK_WRITES;
  const stockVal = stockEditable ? parseStock(stock) : null;
  const stockOk = !stockEditable || stockVal !== null;
  const valid = name.trim().length > 0 && priceOk && stockOk;
  const changed =
    !product ||
    name.trim() !== product.name ||
    (priceOk && p.ok && p.value !== product.price) ||
    description.trim() !== product.description ||
    (stockEditable && stockVal !== product.stock);

  const save = async () => {
    if (!valid || !p.ok || p.value === null) return;
    setBusy(true);
    setError(null);
    const draft = { name, price: p.value, description, stock: stockEditable ? stockVal : undefined };
    const r = product ? await updateProduct(product.id, draft, stockShipped) : await createProduct(businessId, businessType, draft, stockShipped);
    setBusy(false);
    if (!r.ok) {
      setError("Couldn't save the product. Try again.");
      return;
    }
    onSaved(product ? "Changes saved." : `${name.trim()} added.`);
  };

  const toggleHidden = async () => {
    if (!product) return;
    setBusy(true);
    const r = await setProductVisible(product.id, !product.visible);
    setBusy(false);
    if (!r.ok) {
      setError(r.pending ? "Hiding products is coming soon." : "Couldn't save the product. Try again.");
      return;
    }
    onSaved(product.visible ? `${product.name} is hidden.` : `${product.name} is in the store again.`);
  };

  const remove = async () => {
    if (!product) return;
    setBusy(true);
    setDeleteError(null);
    const r = await deleteProduct(product.id);
    setBusy(false);
    if (!r.ok) {
      setDeleteError("Couldn't delete the product. Try again.");
      return;
    }
    setConfirmDelete(false);
    onSaved(`${product.name} deleted.`);
  };

  const soon = "Coming soon";
  return (
    <>
      <OpsSheet
        open={open && !confirmDelete}
        onClose={onClose}
        title={product ? "Edit product" : "New product"}
        button="Save"
        onButton={save}
        disabled={!valid || !changed || !online}
        busy={busy}
        error={error}
      >
        <KitField id="product-name" label="Name" value={name} onChange={setName} placeholder="e.g. Whey Protein 2 kg" icon={Pencil} maxLength={80} />
        {/* OP1-010 #10: product categories are B11 (product_categories). */}
        <KitFieldButton id="product-category" label="Category" value={product?.category ?? null} placeholder="Choose a category" icon={ChevronDown} disabled note={soon} />
        <KitField
          id="product-price"
          label="Price"
          value={price}
          onChange={(v) => {
            setPrice(v);
            setTouched((t) => ({ ...t, price: true }));
          }}
          placeholder="$0.00"
          icon={Pencil}
          inputMode="decimal"
          error={touched.price && price.trim() !== "" && !priceOk ? PRICE_ERROR : null}
        />
        <KitField
          id="product-stock"
          label="In stock"
          value={stock}
          onChange={(v) => {
            setStock(v);
            setTouched((t) => ({ ...t, stock: true }));
          }}
          placeholder="0"
          icon={Pencil}
          inputMode="numeric"
          disabled={!stockEditable}
          note={stockEditable ? undefined : soon}
          error={stockEditable && touched.stock && !stockOk ? STOCK_ERROR : null}
        />
        <KitFieldButton id="product-photo" label="Photo" value={null} placeholder="Add a photo" icon={ImagePlus} disabled note={soon} />
        <KitField id="product-description" label="Description" value={description} onChange={setDescription} placeholder="Optional" multiline maxLength={500} />
        {product && (
          <div style={{ marginTop: 4 }}>
            <TextButton label={product.visible ? "Hide from the store" : "Show in the store"} onClick={toggleHidden} disabled={busy || !online || !STOCK_WRITES} />
            <TextButton tone="high" label="Delete product" onClick={() => setConfirmDelete(true)} disabled={busy || !online} />
          </div>
        )}
      </OpsSheet>
      {product && (
        <KitPop
          open={confirmDelete}
          icon={Trash2}
          title={`Delete ${product.name}?`}
          body="It's removed from your store. Past orders keep their details."
          action="Delete product"
          keep="Keep it"
          busy={busy}
          error={deleteError}
          onAction={remove}
          onKeep={() => {
            setConfirmDelete(false);
            setDeleteError(null);
          }}
        />
      )}
    </>
  );
}
