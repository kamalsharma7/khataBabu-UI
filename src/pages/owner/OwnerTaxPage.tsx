import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTaxProfile,
  deleteTaxProfile,
  listMenuCategories,
  listMenuItems,
  listTaxProfiles,
  updateTaxProfile,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { useOwnerPermissions } from "../../context/OwnerPermissionsContext";
import type { GstSlab, MenuCategory, MenuItem, TaxMethod, TaxProfile, TaxProfileWrite } from "../../types/owner";
import { GST_SLABS, METHODS, guestPays, inr, taxTitles } from "../../utils/taxLabels";

const GST_ORDER: GstSlab[] = ["gst_5", "gst_18", "gst_40", "igst"];

type Tab = "gst" | "vat";

type VatDraft = {
  rate: string;
  method: TaxMethod;
  dine: boolean;
  takeaway: boolean;
  delivery: boolean;
  itemIds: string[];
};

const emptyVat = (): VatDraft => ({
  rate: "5",
  method: "forward",
  dine: true,
  takeaway: true,
  delivery: true,
  itemIds: [],
});

function methodName(method: string) {
  if (method === "backward") return "Backward";
  if (method === "tax_on_tax") return "On tax";
  return "Forward";
}

function orderLabel(p: Pick<TaxProfile, "applies_dine_in" | "applies_takeaway" | "applies_delivery">) {
  return [
    p.applies_dine_in ? "Dine-in" : null,
    p.applies_takeaway ? "Takeaway" : null,
    p.applies_delivery ? "Delivery" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function OwnerTaxPage() {
  const { outlet } = useOwnerOutlet();
  const { can, showDenied } = useOwnerPermissions();
  const canView = can("tax.view") || can("tax.edit");
  const canEdit = can("tax.edit");

  const [tab, setTab] = useState<Tab>("gst");
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [vatOpen, setVatOpen] = useState(false);
  const [vatEditId, setVatEditId] = useState<string | null>(null);
  const [vat, setVat] = useState<VatDraft>(emptyVat());
  const [itemSearch, setItemSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const [tax, cats, menu] = await Promise.all([
        listTaxProfiles(outlet.id),
        listMenuCategories(outlet.id).catch(() => [] as MenuCategory[]),
        listMenuItems(outlet.id).catch(() => [] as MenuItem[]),
      ]);
      setProfiles(tax);
      setCategories(cats);
      setItems(menu);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load tax");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    void load();
  }, [load]);

  const gstProfiles = useMemo(() => {
    const bySlab = new Map(profiles.filter((p) => p.scheme === "gst").map((p) => [p.gst_slab, p]));
    return GST_ORDER.map((slab) => bySlab.get(slab)).filter((p): p is TaxProfile => Boolean(p));
  }, [profiles]);
  const vatProfiles = useMemo(() => profiles.filter((p) => p.scheme !== "gst"), [profiles]);
  const gstOn = gstProfiles.some((p) => p.is_active);
  const activeGst = gstProfiles.find((p) => p.is_active) ?? null;

  const vatRate = parseFloat(vat.rate) || 0;
  const vatTitles = taxTitles("vat", "custom", vatRate);
  const vatPreview = guestPays(100, vatRate, vat.method);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryId !== "all" && item.category_id !== categoryId) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, itemSearch, categoryId]);

  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? "Dish";

  const patchGst = async (profile: TaxProfile, body: Partial<TaxProfileWrite>, ok?: string) => {
    if (!outlet || !canEdit) {
      showDenied();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTaxProfile(outlet.id, profile.id, body);
      await load();
      if (ok) setNotice(ok);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not update GST");
    } finally {
      setSaving(false);
    }
  };

  const toggleGst = (profile: TaxProfile) => {
    void patchGst(
      profile,
      { is_active: !profile.is_active },
      profile.is_active ? `${profile.title} is off. Bills will not add this GST.` : `${profile.title} is on for every matching bill.`,
    );
  };

  const toggleMasterGst = async (enabled: boolean) => {
    if (!outlet || !canEdit) {
      showDenied();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!enabled) {
        for (const row of gstProfiles.filter((p) => p.is_active)) {
          await updateTaxProfile(outlet.id, row.id, { is_active: false });
        }
      } else {
        const preferred = activeGst ?? gstProfiles[0];
        if (preferred) await updateTaxProfile(outlet.id, preferred.id, { is_active: true });
      }
      await load();
      setNotice(enabled ? "GST is on." : "GST is off. VAT on selected dishes is unchanged.");
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not update GST");
    } finally {
      setSaving(false);
    }
  };

  const openVat = (row?: TaxProfile) => {
    if (!canEdit) {
      showDenied();
      return;
    }
    if (row) {
      setVatEditId(row.id);
      setVat({
        rate: String(parseFloat(row.rate_percent) || 0),
        method: row.method,
        dine: row.applies_dine_in,
        takeaway: row.applies_takeaway,
        delivery: row.applies_delivery,
        itemIds: row.menu_item_ids ?? [],
      });
    } else {
      setVatEditId(null);
      setVat(emptyVat());
    }
    setItemSearch("");
    setCategoryId("all");
    setVatOpen(true);
    setNotice(null);
  };

  const saveVat = async () => {
    if (!outlet || !canEdit) {
      showDenied();
      return;
    }
    if (vat.itemIds.length === 0) {
      setError("Pick the dishes this VAT should apply to.");
      return;
    }
    if (!(vat.dine || vat.takeaway || vat.delivery)) {
      setError("Pick at least one order type.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: vatTitles.name,
      scheme: "vat" as const,
      gst_slab: null,
      rate_percent: vatRate,
      method: vat.method,
      title: vatTitles.title,
      title_suffix: vatTitles.suffix,
      applies_dine_in: vat.dine,
      applies_takeaway: vat.takeaway,
      applies_delivery: vat.delivery,
      is_active: true,
      scope: "items" as const,
      menu_item_ids: vat.itemIds,
    };
    try {
      if (vatEditId) await updateTaxProfile(outlet.id, vatEditId, body);
      else await createTaxProfile(outlet.id, body);
      setVatOpen(false);
      setNotice("VAT saved on the selected dishes only — the rest of the menu is untouched.");
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save VAT");
    } finally {
      setSaving(false);
    }
  };

  const removeVat = async (row: TaxProfile) => {
    if (!outlet || !canEdit) {
      showDenied();
      return;
    }
    if (!window.confirm(`Remove ${row.title}? Settled bills stay as printed.`)) return;
    try {
      await deleteTaxProfile(outlet.id, row.id);
      if (vatEditId === row.id) setVatOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not delete VAT");
    }
  };

  const toggleVatItem = (id: string) => {
    setVat((d) => ({
      ...d,
      itemIds: d.itemIds.includes(id) ? d.itemIds.filter((x) => x !== id) : [...d.itemIds, id],
    }));
  };

  if (!outlet) return <p className="muted">Select an outlet to set tax.</p>;
  if (!canView) {
    return (
      <div className="studio-page">
        <h1>Tax</h1>
        <p className="form-error">You don't have permission for this operation.</p>
      </div>
    );
  }

  return (
    <div className="studio-page tax-studio">
      <header className="studio-head">
        <div>
          <p className="studio-kicker">Venue billing</p>
          <h1>Tax</h1>
          <p className="studio-lead">
            GST is for the whole bill. VAT is only for the dishes you tick. GSTIN under{" "}
            <Link to="/app/settings">Settings</Link> prints on the invoice — it does not add tax.
          </p>
        </div>
        <label className={`studio-switch ${gstOn ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={gstOn}
            disabled={!canEdit || saving || gstProfiles.length === 0}
            onChange={(e) => void toggleMasterGst(e.target.checked)}
          />
          <span>{gstOn ? "GST on" : "GST off"}</span>
        </label>
      </header>

      {error && <p className="studio-alert studio-alert--err">{error}</p>}
      {notice && (
        <p className="studio-alert studio-alert--ok">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      <div className="studio-tabs" role="tablist">
        <button type="button" className={tab === "gst" ? "is-on" : ""} onClick={() => setTab("gst")}>
          GST
        </button>
        <button type="button" className={tab === "vat" ? "is-on" : ""} onClick={() => setTab("vat")}>
          VAT on items
          {vatProfiles.length > 0 ? <em>{vatProfiles.length}</em> : null}
        </button>
      </div>

      {loading && <p className="muted">Loading tax…</p>}

      {tab === "gst" && !loading && (
        <section className="studio-panel">
          <div className="studio-panel__intro">
            <div>
              <h2>GST profiles</h2>
              <p>Turn on one slab. It applies to every item on matching dine-in, takeaway and delivery bills.</p>
            </div>
            {activeGst && (
              <p className="studio-live">
                Active: <strong>{activeGst.title}</strong> · {methodName(activeGst.method)} · a ₹100 item{" "}
                {activeGst.method === "backward" ? "stays ₹100" : `becomes ${inr(guestPays(100, parseFloat(activeGst.rate_percent) || 0, activeGst.method).pays)}`}
              </p>
            )}
          </div>
          <div className="gst-grid">
            {gstProfiles.map((p) => {
              const slab = (p.gst_slab ?? "gst_5") as GstSlab;
              const meta = GST_SLABS.find((s) => s.id === slab);
              const rate = parseFloat(p.rate_percent) || meta?.rate || 0;
              const titles = taxTitles("gst", slab, rate);
              const preview = guestPays(100, rate, p.method);
              return (
                <article key={p.id} className={`gst-card ${p.is_active ? "is-on" : ""}`}>
                  <header className="gst-card__top">
                    <div>
                      <h3>{p.title}</h3>
                      <p>{titles.display}</p>
                    </div>
                    <button
                      type="button"
                      className={`studio-switch ${p.is_active ? "is-on" : ""}`}
                      disabled={!canEdit || saving}
                      onClick={() => toggleGst(p)}
                    >
                      {p.is_active ? "On" : "Off"}
                    </button>
                  </header>
                  {slab === "igst" && canEdit && (
                    <label className="gst-rate">
                      <span>IGST rate %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        defaultValue={rate}
                        onBlur={(e) => {
                          const next = parseFloat(e.target.value) || 0;
                          if (next !== rate) void patchGst(p, { rate_percent: next });
                        }}
                      />
                    </label>
                  )}
                  <div className="gst-card__meta">
                    {METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`chip ${p.method === m.id ? "is-on" : ""}`}
                        disabled={!canEdit || saving}
                        title={m.hint}
                        onClick={() => void patchGst(p, { method: m.id })}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="gst-card__meta">
                    {(
                      [
                        ["applies_dine_in", "Dine-in", p.applies_dine_in],
                        ["applies_takeaway", "Takeaway", p.applies_takeaway],
                        ["applies_delivery", "Delivery", p.applies_delivery],
                      ] as const
                    ).map(([key, label, on]) => (
                      <button
                        key={key}
                        type="button"
                        className={`chip ${on ? "is-on" : ""}`}
                        disabled={!canEdit || saving}
                        onClick={() => void patchGst(p, { [key]: !on })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <footer className="gst-card__foot">
                    <span>₹100 item</span>
                    <strong>{p.method === "backward" ? `tax ${inr(preview.tax)} inside` : `guest pays ${inr(preview.pays)}`}</strong>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === "vat" && !loading && (
        <section className="studio-panel">
          <div className="studio-panel__intro">
            <div>
              <h2>VAT on selected dishes</h2>
              <p>VAT never hits the whole bill. Only the dishes you pick get this rate — everything else stays as priced.</p>
            </div>
            {canEdit && (
              <button type="button" className="btn btn-primary" onClick={() => openVat()}>
                Add VAT
              </button>
            )}
          </div>

          {vatProfiles.length === 0 && !vatOpen && (
            <div className="studio-empty">
              <strong>No VAT yet</strong>
              <p>Use this when a few items need VAT (or another item tax) and the rest of the menu should stay out of it.</p>
            </div>
          )}

          <ul className="vat-list">
            {vatProfiles.map((row) => (
              <li key={row.id} className={`vat-row ${row.is_active ? "" : "is-off"}`}>
                <div>
                  <h3>{row.title}</h3>
                  <p>
                    {methodName(row.method)} · {orderLabel(row)} · {(row.menu_item_ids ?? []).length} dish
                    {(row.menu_item_ids ?? []).length === 1 ? "" : "es"}
                  </p>
                  <p className="vat-row__items">
                    {(row.menu_item_ids ?? []).slice(0, 6).map(itemName).join(", ")}
                    {(row.menu_item_ids ?? []).length > 6 ? "…" : ""}
                  </p>
                </div>
                {canEdit && (
                  <div className="vat-row__actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openVat(row)}>
                      Edit dishes
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void patchGst(row, { is_active: !row.is_active })}
                    >
                      {row.is_active ? "Turn off" : "Turn on"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void removeVat(row)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {vatOpen && (
            <div className="vat-editor">
              <div className="vat-editor__head">
                <h3>{vatEditId ? "Edit VAT" : "Add VAT"}</h3>
                <p>Set the rate, then tick the dishes it should apply to.</p>
              </div>
              <div className="vat-editor__grid">
                <label className="field">
                  <span>Rate %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={vat.rate}
                    onChange={(e) => setVat((d) => ({ ...d, rate: e.target.value }))}
                  />
                </label>
                <div className="field">
                  <span>Tax type</span>
                  <div className="chip-row">
                    {METHODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`chip ${vat.method === m.id ? "is-on" : ""}`}
                        onClick={() => setVat((d) => ({ ...d, method: m.id }))}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span>Order type</span>
                  <div className="chip-row">
                    <button type="button" className={`chip ${vat.dine ? "is-on" : ""}`} onClick={() => setVat((d) => ({ ...d, dine: !d.dine }))}>
                      Dine-in
                    </button>
                    <button
                      type="button"
                      className={`chip ${vat.takeaway ? "is-on" : ""}`}
                      onClick={() => setVat((d) => ({ ...d, takeaway: !d.takeaway }))}
                    >
                      Takeaway
                    </button>
                    <button
                      type="button"
                      className={`chip ${vat.delivery ? "is-on" : ""}`}
                      onClick={() => setVat((d) => ({ ...d, delivery: !d.delivery }))}
                    >
                      Delivery
                    </button>
                  </div>
                </div>
              </div>
              <div className="vat-preview">
                <span>
                  {vatTitles.title} on a ₹100 dish → guest pays{" "}
                  <strong>{vat.method === "backward" ? inr(100) : inr(vatPreview.pays)}</strong>
                </span>
                <span>{vat.itemIds.length} dish{vat.itemIds.length === 1 ? "" : "es"} selected</span>
              </div>
              <div className="vat-picker">
                <div className="vat-picker__tools">
                  <input
                    type="search"
                    placeholder="Search dishes"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setVat((d) => ({ ...d, itemIds: filteredItems.map((i) => i.id) }))}
                  >
                    Select visible
                  </button>
                </div>
                <ul className="vat-picker__list">
                  {filteredItems.length === 0 && <li className="muted">No dishes match.</li>}
                  {filteredItems.map((item) => (
                    <li key={item.id}>
                      <label className={vat.itemIds.includes(item.id) ? "is-on" : ""}>
                        <input
                          type="checkbox"
                          checked={vat.itemIds.includes(item.id)}
                          onChange={() => toggleVatItem(item.id)}
                        />
                        <span>{item.name}</span>
                        <em>{inr(parseFloat(item.price) || 0)}</em>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="vat-editor__foot">
                <button type="button" className="btn btn-secondary" onClick={() => setVatOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveVat()}>
                  {saving ? "Saving…" : "Save VAT"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
