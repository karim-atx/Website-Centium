import { useEffect, useId, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  clearProductPhoto,
  createCategory,
  createProduct,
  deleteProduct,
  fetchCategories,
  parseStock,
  prepareProductPhoto,
  updateProduct,
  type OfferingCategory,
  type Product,
  type ProductCategory,
} from "../../../../services/store/products";
import { formatPrice, parsePrice } from "../../../../utils/price";
import { useOnline } from "../../../../hooks/useOnline";
import { useApp } from "../../../../context/AppContext";
import { stageAndSubmit } from "../../../../services/moderation/images";
import { ImageApprovalBadge, ImageApprovalNote, useOwnImage } from "../../../../components/moderation/ImageApproval";
import { marketplaceCategories } from "../../../../data/mockProfessionals";
import { BizShareButton } from "../../../../components/share/business/BizShareButton";
import { productData } from "../../../../components/share/business/bizCardModel";
import { MasterSheet, CentredDialog, PrimaryButton, SaveError, SheetBox, SheetSwitch, fieldStyle, px, useMarketColors } from "../../../business-market/listingParts";
import { CategoryPicker } from "./CategoryPicker";
import { CONTACT_TEXT, moderationRefusal } from "../../../../services/moderation/text";

/** Round C Release 2: the word lists and contact details, in our words; null for anything else. */
const saveRefusal = (r: { code?: string }) => (r.code === "contact_details" ? CONTACT_TEXT : moderationRefusal(r));

// Market + Share 3.0 · W3 · B-MA.2 "Edit item" (Business Marketplace Screens
// lines 119–137, frame-check B-MA.2 showcaseEdit) and its stacked "Item
// photo" sheet (lines 139–154, showcasePhoto). The ONE editor for
// business_offerings (V6-157): the Showcase of every business type (D-17)
// and the store's products (D-12), also opened from Analytics › Products.
//
// MasterBottomSheet "Edit item" / "Add item": a centred 132 × 132 image frame
// (radius 18, --soft; the real image_url, or an empty frame with an icon,
// never the board's "ITEM PHOTO" label) with a 26 --card camera badge
// (shadow 0 1px 3px rgba(36,31,27,0.16), camera 14 --pdark); tapping it
// opens "Item photo" over this sheet: Take photo · Choose from library ·
// Remove photo, rows 52 tall radius 14 on --sgrey, 14 / 600, 18 glyphs in
// --pdark (Remove in --high). Fields in --sgrey boxes: Name, Short
// description, Display price; the toggle row "Show in showcase" / "Off
// hides it from members" (business_offerings.visible); CTA "Save".
//
// Kept live features (PLAN §3.4 Stores; the old Offerings card): the store's
// Category (product_categories) and In stock; a new item's Explore category
// for a gym or class business (the old Offerings form's chips); hide in the
// store (the toggle); Delete as a two-step CentredDialog (B-MA.5.1's
// destructive style); the photo (prepareProductPhoto: JPEG / PNG / WebP up to
// 5 MB, metadata dropped; Round C Release 2: kept on the device until Save,
// then staged and sent for approval as showcase_image once the row exists,
// with the pending or refused one's badge and note; Remove photo still clears
// image_url directly); the
// B-SH.1 Product spotlight share of a saved item in the header. B11 columns
// (stock, visible, category_id, image_url) are written only when the
// database has them (`stockShipped`); otherwise those controls are disabled
// with "Coming soon" and never sent.

const PRICE_ERROR = "Enter the price as a number, for example 25 or $25.";
const STOCK_ERROR = "Enter a whole number, 0 or more.";
const SOON = "Coming soon";

/** The Explore categories a gym or class business can list an item under (the old Offerings form's list). */
const LISTABLE = marketplaceCategories.filter((x) => x.id !== "gyms" && x.id !== "classes");

export interface ProductEditorProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessType: string | null;
  stockShipped: boolean;
  /** null = a new item. */
  product: Product | null;
  /** New item prefilled (AN11 Duplicate: "{name} (copy)"); ignored when editing. */
  initial?: { name: string; price: number | null; description: string } | null;
  onSaved: (message: string) => void;
  /**
   * "store" (default): a store's product (Category, In stock; a price is
   * required). "showcase": a gym or class business's showcase item (a new
   * one picks its Explore category; the price may be empty).
   */
  variant?: "store" | "showcase";
}

export function ProductEditorSheet({ open, onClose, businessId, businessType, stockShipped, product, initial, onSaved, variant = "store" }: ProductEditorProps) {
  const m = useMarketColors();
  const online = useOnline();
  const { authUserId } = useApp();
  const store = variant === "store";
  const ids = useId();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [market, setMarket] = useState<OfferingCategory>(LISTABLE[0].id as OfferingCategory);
  const [visible, setVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[] | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // A newly picked photo (prepared, on this device until Save) and its preview.
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  // Remove photo also hides a pending one in this sheet (it can't be taken back).
  const [cleared, setCleared] = useState(false);
  const { image: own, refresh: refreshOwn } = useOwnImage("showcase_image", product?.id);
  const [touched, setTouched] = useState({ price: false, stock: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<0 | 1 | 2>(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  // Prefill each time the sheet opens (the row's values; no skeleton).
  useEffect(() => {
    if (!open) return;
    const seed = product ?? initial ?? null;
    setName(seed?.name ?? "");
    setPrice(seed?.price != null ? String(seed.price) : "");
    setStock(product?.stock != null ? String(product.stock) : "");
    setDescription(seed?.description ?? "");
    setCategoryId(product?.categoryId ?? null);
    setMarket(LISTABLE[0].id as OfferingCategory);
    setVisible(product?.visible ?? true);
    setImageUrl(product?.imageUrl ?? null);
    setPhoto(null);
    setCleared(false);
    setPhotoError(null);
    setPhotoOpen(false);
    setTouched({ price: false, stock: false });
    setError(null);
    setDel(0);
  }, [open, product, initial, stockShipped]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);

  // The store's categories, read each time the sheet opens.
  useEffect(() => {
    if (!open || !stockShipped || !store) return;
    let alive = true;
    setCategories(null);
    void fetchCategories(businessId).then((r) => alive && setCategories(r.status === "ok" ? r.value : []));
    return () => {
      alive = false;
    };
  }, [open, stockShipped, businessId, store]);

  const p = parsePrice(price);
  const priceEmpty = price.trim() === "";
  const priceVal = p.ok ? p.value : null;
  // A store needs a price; a showcase item may have none.
  const priceOk = store ? p.ok && p.value !== null : priceEmpty || (p.ok && p.value !== null);
  // Empty = not tracked (stock null); otherwise a whole number 0 or more.
  const stockVal = store && stockShipped && stock.trim() !== "" ? parseStock(stock) : null;
  const stockOk = !store || !stockShipped || stock.trim() === "" || stockVal !== null;
  const valid = name.trim().length > 0 && priceOk && stockOk;
  const changed =
    !product ||
    !!photo ||
    name.trim() !== product.name ||
    (priceOk && (priceEmpty ? null : priceVal) !== product.price) ||
    description.trim() !== product.description ||
    (stockShipped && (visible !== product.visible || imageUrl !== product.imageUrl || (store && (stockVal !== product.stock || categoryId !== product.categoryId))));

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const draft = {
      name,
      price: priceEmpty ? null : priceVal,
      description,
      stock: store ? stockVal : (product?.stock ?? null),
      visible,
      categoryId: store ? categoryId : (product?.categoryId ?? null),
      ...(!product && !store ? { category: market } : {}),
    };
    const fail = (text: string) => {
      setBusy(false);
      setError(text);
    };
    let id: string;
    if (product) {
      const r = await updateProduct(product.id, draft, stockShipped);
      if (!r.ok) return fail(saveRefusal(r) ?? "Couldn't save the item. Try again.");
      id = product.id;
      if (stockShipped && product.imageUrl && imageUrl === null) {
        const c = await clearProductPhoto(id);
        if (!c.ok) return fail("Couldn't remove the photo. Try again.");
      }
    } else {
      const r = await createProduct(businessId, businessType, draft, stockShipped);
      if (!r.ok) return fail(saveRefusal(r) ?? "Couldn't save the item. Try again.");
      id = r.value.id;
    }
    const n = name.trim();
    const done = product ? "Changes saved." : stockShipped && !visible ? `${n} added. It's hidden from Explore.` : `${n} added.`;
    // The new photo goes for approval now that the row exists.
    if (photo) {
      const s = authUserId ? await stageAndSubmit(authUserId, "showcase_image", id, photo.file) : { ok: false as const, message: "Couldn't send that photo. Try again." };
      if (!s.ok) {
        setBusy(false);
        // An edit stays open with the photo kept (Save again resends it); a new item is saved, so the sheet closes and says so.
        if (product) return setPhotoError(s.message);
        return onSaved(`${done} ${s.message}`);
      }
      refreshOwn();
    }
    setBusy(false);
    onSaved(done);
  };

  const remove = async () => {
    if (!product) return;
    setBusy(true);
    setDeleteError(null);
    const r = await deleteProduct(product.id);
    setBusy(false);
    if (!r.ok) {
      setDeleteError("Couldn't delete the item. Try again.");
      return;
    }
    setDel(0);
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
    setPhotoOpen(false);
    setPhotoBusy(true);
    setPhotoError(null);
    const r = await prepareProductPhoto(file);
    setPhotoBusy(false);
    if (!r.ok) {
      setPhotoError(r.message);
      return;
    }
    setPhoto({ file: r.file, preview: URL.createObjectURL(r.file) });
  };
  // What the owner sees: a new pick, else their pending photo, else the approved one.
  const ownState = photo || cleared ? null : own;
  const shownUrl = photo?.preview ?? (ownState?.status === "pending" ? ownState.url : null) ?? imageUrl;

  const canPhoto = stockShipped && online && !photoBusy;
  const share =
    product && product.visible ? (
      <BizShareButton label={`Share ${product.name}`} getData={() => ({ t: "product", d: productData({ id: product.id, title: product.name, price: product.price !== null ? formatPrice(product.price) : "", description: product.description }, product.imageUrl) })} />
    ) : null;

  const photoRow = (label: string, glyph: React.ReactNode, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      className="market-focus"
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 14, background: m.sgrey, border: 0, width: "100%", textAlign: "left", fontFamily: "inherit", fontSize: px(14), fontWeight: 600, color: danger ? m.high : m.ink, cursor: "pointer" }}
    >
      {glyph}
      {label}
    </button>
  );

  return (
    <>
      <MasterSheet
        open={open && del === 0}
        onClose={onClose}
        title={product ? "Edit item" : "Add item"}
        headerAction={share}
        footer={
          <>
            <PrimaryButton onClick={() => void save()} disabled={!valid || !changed || !online || photoBusy} busy={busy}>
              {busy ? "Saving…" : "Save"}
            </PrimaryButton>
            {error && <SaveError>{error}</SaveError>}
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 4 }}>
            <button
              type="button"
              aria-label={shownUrl ? "Change photo" : "Add a photo"}
              aria-haspopup="dialog"
              aria-describedby={!stockShipped ? `${ids}-photo-note` : undefined}
              disabled={!canPhoto}
              onClick={() => setPhotoOpen(true)}
              className="market-focus"
              style={{ position: "relative", width: 132, height: 132, borderRadius: 18, background: m.soft, border: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: canPhoto ? "pointer" : "default", overflow: "visible" }}
            >
              {shownUrl ? (
                <img src={shownUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18, display: "block" }} />
              ) : (
                <ImageIcon size={28} strokeWidth={1.6} color={m.tert} aria-hidden />
              )}
              {photoBusy ? <span className="animate-skeleton-pulse" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 18, background: m.soft, opacity: 0.7 }} /> : null}
              <span
                aria-hidden
                style={{ position: "absolute", right: 6, bottom: 6, width: 26, height: 26, borderRadius: 999, background: m.card, display: "flex", alignItems: "center", justifyContent: "center", color: m.pdark, boxShadow: "0 1px 3px rgba(36,31,27,0.16)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "none" }}>
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
            {photoBusy ? <p role="status" style={{ fontSize: px(11.5), color: m.faint, marginTop: 8 }}>Uploading…</p> : null}
            <ImageApprovalBadge state={ownState} className="mt-2" />
            <ImageApprovalNote state={ownState} className="mt-1.5 text-center" />
            {!stockShipped ? (
              <p id={`${ids}-photo-note`} style={{ fontSize: px(11.5), color: m.faint, marginTop: 8 }}>
                {SOON}
              </p>
            ) : null}
            {photoError ? (
              <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: m.high, marginTop: 8, textAlign: "center" }}>
                {photoError}
              </p>
            ) : null}
          </div>
          <SheetBox label="Name" htmlFor={`${ids}-name`}>
            <input id={`${ids}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={store ? "e.g. Whey Protein 2 kg" : "e.g. 10-class pack"} style={fieldStyle(m)} />
          </SheetBox>
          <SheetBox label="Short description" htmlFor={`${ids}-desc`}>
            <textarea
              id={`${ids}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={1}
              placeholder="Optional"
              style={{ ...fieldStyle(m), resize: "none", minHeight: 41, fieldSizing: "content" } as React.CSSProperties}
            />
          </SheetBox>
          <SheetBox label="Display price" htmlFor={`${ids}-price`}>
            <input
              id={`${ids}-price`}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setTouched((t) => ({ ...t, price: true }));
              }}
              inputMode="decimal"
              placeholder={store ? "$0.00" : "Optional"}
              aria-invalid={touched.price && !priceEmpty && !priceOk ? true : undefined}
              aria-describedby={touched.price && !priceEmpty && !priceOk ? `${ids}-price-err` : undefined}
              style={fieldStyle(m, touched.price && !priceEmpty && !priceOk)}
            />
            {touched.price && !priceEmpty && !priceOk ? (
              <p id={`${ids}-price-err`} role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: m.high, marginTop: 6 }}>
                {PRICE_ERROR}
              </p>
            ) : null}
          </SheetBox>
          {store ? (
            <>
              {stockShipped ? (
                <CategoryPicker categories={categories} value={categoryId} onPick={setCategoryId} onCreate={addCategory} disabled={!online} />
              ) : (
                <SheetBox label="Category">
                  <div style={{ ...fieldStyle(m), color: m.faint, opacity: 0.6 }}>{SOON}</div>
                </SheetBox>
              )}
              <SheetBox label="In stock" htmlFor={`${ids}-stock`}>
                <input
                  id={`${ids}-stock`}
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value);
                    setTouched((t) => ({ ...t, stock: true }));
                  }}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={!stockShipped}
                  aria-invalid={stockShipped && touched.stock && !stockOk ? true : undefined}
                  style={{ ...fieldStyle(m, stockShipped && touched.stock && !stockOk), opacity: stockShipped ? 1 : 0.6 }}
                />
                <p style={{ fontSize: px(11.5), color: stockShipped && touched.stock && !stockOk ? m.high : m.faint, fontWeight: stockShipped && touched.stock && !stockOk ? 700 : 400, marginTop: 6 }}>
                  {!stockShipped ? SOON : touched.stock && !stockOk ? STOCK_ERROR : "Leave empty if you don't track stock."}
                </p>
              </SheetBox>
            </>
          ) : !product ? (
            <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
              <p id={`${ids}-cat`} style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
                Explore category
              </p>
              <div role="radiogroup" aria-labelledby={`${ids}-cat`} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LISTABLE.map((x) => {
                  const on = market === x.id;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMarket(x.id as OfferingCategory)}
                      className="tap market-focus"
                      style={{ minHeight: 34, padding: "0 12px", borderRadius: 10, border: `1.5px solid ${on ? m.fill : "transparent"}`, background: on ? m.pale : m.card, color: on ? m.pdark : m.ink2, fontSize: px(12.5), fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div id={`${ids}-vis`} style={{ fontSize: px(14), fontWeight: 700 }}>
                  Show in showcase
                </div>
                <div id={`${ids}-vis-sub`} style={{ fontSize: px(11.5), color: m.faint }}>
                  {stockShipped ? "Off hides it from members" : SOON}
                </div>
              </div>
              <SheetSwitch on={visible} onChange={setVisible} label="Show in showcase" describedBy={`${ids}-vis-sub`} disabled={!stockShipped || !online} />
            </div>
          </div>
          {product ? (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDel(1);
              }}
              disabled={busy || !online}
              className="market-focus"
              style={{ alignSelf: "center", minHeight: 44, padding: "0 12px", border: 0, background: "transparent", color: m.high, fontSize: px(14), fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: busy || !online ? 0.4 : 1 }}
            >
              Delete item
            </button>
          ) : null}
        </div>
      </MasterSheet>
      <MasterSheet open={open && del === 0 && photoOpen} onClose={() => setPhotoOpen(false)} title="Item photo">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14 }}>
          {photoRow(
            "Take photo",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, transform: "none" }}>
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>,
            () => camRef.current?.click()
          )}
          {photoRow(
            "Choose from library",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, transform: "none" }}>
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>,
            () => libRef.current?.click()
          )}
          {shownUrl
            ? photoRow(
                "Remove photo",
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, transform: "none" }}>
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2" />
                </svg>,
                () => {
                  setImageUrl(null);
                  setPhoto(null);
                  setCleared(true);
                  setPhotoOpen(false);
                },
                true
              )
            : null}
        </div>
      </MasterSheet>
      <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        void pickPhoto(f);
      }} />
      <input ref={libRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        void pickPhoto(f);
      }} />
      {product && (
        <CentredDialog
          open={del > 0}
          title={del === 1 ? "Delete this item?" : "Confirm delete"}
          body={del === 1 ? (store ? "It comes off your store. Past orders keep their details." : "It comes off your showcase on Explore.") : "This can't be undone."}
          cancel="Cancel"
          action={del === 1 ? "Delete" : busy ? "Deleting…" : "Delete item"}
          busy={busy}
          error={del === 2 ? deleteError : null}
          onAction={() => (del === 1 ? setDel(2) : void remove())}
          onCancel={() => {
            setDel(0);
            setDeleteError(null);
          }}
        />
      )}
    </>
  );
}
