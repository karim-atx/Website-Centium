import { useEffect, useRef, useState } from "react";
import { ChevronDown, ImagePlus, Pencil, Trash2 } from "lucide-react";
import {
  createCategory,
  createProduct,
  deleteProduct,
  fetchCategories,
  parseStock,
  setProductVisible,
  updateProduct,
  uploadProductPhoto,
  type Product,
  type ProductCategory,
} from "../../../../services/store/products";
import { parsePrice } from "../../../../utils/price";
import { useOnline } from "../../../../hooks/useOnline";
import { KitField, KitFieldButton, KitPop, OpsSheet, TextButton } from "../opsKit";
import { CategoryPicker, VisibleSwitch } from "./CategoryPicker";

// OP1-010 / OP1-011 · New product / Edit product. V6-157: the ONE product
// editor, shared with AN11 (listings): Name, Category, Price and In stock as
// OP1 draws them, then AN11's Photo and Description. B11 columns (stock,
// visible, category_id, image_url): written when the database has them
// (`stockShipped`); on a database without B11 they show "Coming soon" and
// are never sent. Category = AN11-004's in-flow listbox (product_categories);
// a new product has AN11-001's "Visible on Explore" switch, an existing one
// OP1-011's Hide / Show button. Photo: product-images bucket.

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
  /** New product prefilled (AN11 Duplicate: "{name} (copy)"); ignored when editing. */
  initial?: { name: string; price: number | null; description: string } | null;
  onSaved: (message: string) => void;
}

export function ProductEditorSheet({ open, onClose, businessId, businessType, stockShipped, product, initial, onSaved }: ProductEditorProps) {
  const online = useOnline();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[] | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ price: false, stock: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefill each time the sheet opens (OP1-011 #2; O2: no skeleton, the row's values).
  useEffect(() => {
    if (!open) return;
    const seed = product ?? initial ?? null;
    setName(seed?.name ?? "");
    setPrice(seed?.price != null ? String(seed.price) : "");
    setStock(product?.stock != null ? String(product.stock) : "");
    setDescription(seed?.description ?? "");
    setCategoryId(product?.categoryId ?? null);
    setVisible(product?.visible ?? true);
    setImageUrl(product?.imageUrl ?? null);
    setPhotoError(null);
    setTouched({ price: false, stock: false });
    setError(null);
  }, [open, product, initial, stockShipped]);

  // The store's categories, read each time the sheet opens.
  useEffect(() => {
    if (!open || !stockShipped) return;
    let alive = true;
    setCategories(null);
    void fetchCategories(businessId).then((r) => alive && setCategories(r.status === "ok" ? r.value : []));
    return () => {
      alive = false;
    };
  }, [open, stockShipped, businessId]);

  const p = parsePrice(price);
  const priceOk = p.ok && p.value !== null;
  // Empty = not tracked (stock null); otherwise a whole number 0 or more.
  const stockVal = stockShipped && stock.trim() !== "" ? parseStock(stock) : null;
  const stockOk = !stockShipped || stock.trim() === "" || stockVal !== null;
  const valid = name.trim().length > 0 && priceOk && stockOk;
  const changed =
    !product ||
    name.trim() !== product.name ||
    (priceOk && p.ok && p.value !== product.price) ||
    description.trim() !== product.description ||
    (stockShipped && (stockVal !== product.stock || categoryId !== product.categoryId || imageUrl !== product.imageUrl));

  const save = async () => {
    if (!valid || !p.ok || p.value === null) return;
    setBusy(true);
    setError(null);
    const draft = { name, price: p.value, description, stock: stockVal, visible: product ? product.visible : visible, categoryId, imageUrl };
    const r = product ? await updateProduct(product.id, draft, stockShipped) : await createProduct(businessId, businessType, draft, stockShipped);
    setBusy(false);
    if (!r.ok) {
      setError("Couldn't save the product. Try again.");
      return;
    }
    onSaved(product ? "Changes saved." : stockShipped && !visible ? `${name.trim()} added. It's hidden from Explore.` : `${name.trim()} added.`);
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

  const addCategory = async (n: string): Promise<string | null> => {
    const r = await createCategory(businessId, n, null, categories?.length ?? 0);
    if (!r.ok) return r.code === "23505" ? "You already have a category with that name." : "Couldn't add the category. Try again.";
    setCategories((c) => [...(c ?? []), r.value]);
    setCategoryId(r.value.id);
    return null;
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    const r = await uploadProductPhoto(businessId, file);
    setPhotoBusy(false);
    if (!r.ok) {
      setPhotoError(r.message);
      return;
    }
    setImageUrl(r.url);
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
        disabled={!valid || !changed || !online || photoBusy}
        busy={busy}
        error={error}
      >
        <KitField id="product-name" label="Name" value={name} onChange={setName} placeholder="e.g. Whey Protein 2 kg" icon={Pencil} maxLength={80} />
        {stockShipped ? (
          <CategoryPicker categories={categories} value={categoryId} onPick={setCategoryId} onCreate={addCategory} disabled={!online} />
        ) : (
          <KitFieldButton id="product-category" label="Category" value={product?.category ?? null} placeholder="Choose a category" icon={ChevronDown} disabled note={soon} />
        )}
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
          disabled={!stockShipped}
          note={stockShipped ? "Leave empty if you don't track stock." : soon}
          error={stockShipped && touched.stock && !stockOk ? STOCK_ERROR : null}
        />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pickPhoto(e.target.files?.[0] ?? undefined)} />
        <KitFieldButton
          id="product-photo"
          label="Photo"
          value={photoBusy ? "Uploading…" : imageUrl ? "Photo added · tap to change" : null}
          placeholder="Add a photo"
          icon={ImagePlus}
          popup="dialog"
          onClick={stockShipped ? () => fileRef.current?.click() : undefined}
          disabled={!stockShipped || !online || photoBusy}
          error={photoError}
          note={stockShipped ? "JPEG, PNG or WebP, up to 5 MB." : soon}
        />
        <KitField id="product-description" label="Description" value={description} onChange={setDescription} placeholder="Optional" multiline maxLength={500} />
        {!product && stockShipped && <VisibleSwitch on={visible} onChange={setVisible} disabled={!online} />}
        {product && (
          <div style={{ marginTop: 4 }}>
            <TextButton label={product.visible ? "Hide from the store" : "Show in the store"} onClick={toggleHidden} disabled={busy || !online || !stockShipped} />
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
