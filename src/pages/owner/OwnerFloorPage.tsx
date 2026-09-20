import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  bulkCreateTables,
  createArea,
  createTable,
  deleteArea,
  deleteTable,
  listAreas,
  listTables,
  updateArea,
} from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { AreaBillingMode, ResourceKind, VenueArea, VenueTable } from "../../types/owner";

type AreaWithTables = VenueArea & { tables: VenueTable[] };

function nextTableStartNumber(tables: VenueTable[], prefix: string): number {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}\\s+(\\d+)$`, "i");
  let max = 0;
  for (const t of tables) {
    const m = t.label.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

type OwnerFloorPageProps = { embedded?: boolean };

export function OwnerFloorPage({ embedded = false }: OwnerFloorPageProps = {}) {
  const { outlet } = useOwnerOutlet();
  const [areas, setAreas] = useState<AreaWithTables[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [areaModal, setAreaModal] = useState<"add" | { edit: VenueArea } | null>(null);
  const [areaName, setAreaName] = useState("");
  const [areaTableCount, setAreaTableCount] = useState("");
  const [areaTablePrefix, setAreaTablePrefix] = useState("Table");
  const [areaBillingMode, setAreaBillingMode] = useState<AreaBillingMode>("dine_in");
  const [areaOpStart, setAreaOpStart] = useState("10:00");
  const [areaOpEnd, setAreaOpEnd] = useState("23:00");
  const [areaHourlyRate, setAreaHourlyRate] = useState("");

  const [bulkModal, setBulkModal] = useState<VenueArea | null>(null);
  const [bulkCount, setBulkCount] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("Table");

  const [tableModal, setTableModal] = useState<{ areaId: string; areaName: string } | null>(null);
  const [tableLabel, setTableLabel] = useState("");
  const [tableCapacity, setTableCapacity] = useState("");
  const [tableKind, setTableKind] = useState<ResourceKind>("dine_table");
  const [hourlyRate, setHourlyRate] = useState("");

  const load = useCallback(async () => {
    if (!outlet) return;
    setLoading(true);
    setError(null);
    try {
      const areaList = await listAreas(outlet.id);
      const withTables: AreaWithTables[] = await Promise.all(
        areaList.map(async (a) => ({
          ...a,
          tables: await listTables(outlet.id, a.id),
        })),
      );
      setAreas(withTables);
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Failed to load floor plan");
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => {
    load();
  }, [load]);

  const openAddArea = () => {
    setAreaName("");
    setAreaTableCount("");
    setAreaTablePrefix("Table");
    setAreaBillingMode("dine_in");
    setAreaOpStart("10:00");
    setAreaOpEnd("23:00");
    setAreaHourlyRate("");
    setAreaModal("add");
  };

  const openEditArea = (area: VenueArea) => {
    setAreaName(area.name);
    setAreaBillingMode(area.billing_mode ?? "dine_in");
    setAreaOpStart(area.operating_start ?? "10:00");
    setAreaOpEnd(area.operating_end ?? "23:00");
    setAreaHourlyRate(area.hourly_rate ?? "");
    setAreaModal({ edit: area });
  };

  const saveArea = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !areaModal) return;
    try {
      const timePayload =
        areaBillingMode === "time_based"
          ? {
              billing_mode: areaBillingMode,
              operating_start: areaOpStart,
              operating_end: areaOpEnd,
              hourly_rate: parseFloat(areaHourlyRate),
            }
          : { billing_mode: areaBillingMode };

      if (areaModal === "add") {
        const count = areaTableCount.trim() ? parseInt(areaTableCount, 10) : undefined;
        await createArea(outlet.id, {
          name: areaName.trim(),
          ...timePayload,
          ...(count != null && count > 0
            ? {
                initial_table_count: count,
                table_label_prefix:
                  areaBillingMode === "time_based"
                    ? areaTablePrefix.trim() || "Table"
                    : areaTablePrefix.trim() || "Table",
              }
            : {}),
        });
      } else {
        await updateArea(outlet.id, areaModal.edit.id, {
          name: areaName.trim(),
          ...timePayload,
        });
      }
      setAreaModal(null);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Save failed");
    }
  };

  const removeArea = async (area: VenueArea) => {
    if (!outlet) return;
    if (!confirm(`Delete area "${area.name}" and all its tables?`)) return;
    try {
      await deleteArea(outlet.id, area.id);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Delete failed");
    }
  };

  const openAddTable = (area: VenueArea) => {
    setTableModal({ areaId: area.id, areaName: area.name });
    setTableLabel("");
    setTableCapacity("");
    const timeArea = area.billing_mode === "time_based";
    setTableKind(timeArea ? "time_based" : "dine_table");
    setHourlyRate(timeArea && area.hourly_rate ? area.hourly_rate : "");
  };

  const saveTable = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !tableModal) return;
    try {
      await createTable(outlet.id, tableModal.areaId, {
        label: tableLabel.trim(),
        capacity: tableCapacity ? parseInt(tableCapacity, 10) : null,
        resource_kind: tableKind,
        hourly_rate: tableKind === "time_based" && hourlyRate ? parseFloat(hourlyRate) : null,
      });
      setTableModal(null);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Save failed");
    }
  };

  const openBulkTables = (area: VenueArea) => {
    setBulkPrefix("Table");
    setBulkCount("");
    setBulkModal(area);
  };

  const saveBulkTables = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !bulkModal) return;
    const count = parseInt(bulkCount, 10);
    if (!count || count < 1) return;
    const prefix = bulkPrefix.trim() || "Table";
    const areaBlock = areas.find((a) => a.id === bulkModal.id);
    const start = nextTableStartNumber(areaBlock?.tables ?? [], prefix);
    try {
      await bulkCreateTables(outlet.id, bulkModal.id, {
        count,
        table_label_prefix: prefix,
        start_number: start,
      });
      setBulkModal(null);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Save failed");
    }
  };

  const removeTable = async (table: VenueTable) => {
    if (!outlet) return;
    if (!confirm(`Delete ${table.label}?`)) return;
    try {
      await deleteTable(outlet.id, table.id);
      await load();
    } catch (err) {
      alert(err instanceof OwnerApiError ? err.message : "Delete failed");
    }
  };

  if (!outlet) {
    return <p className="muted">No outlet found for your account.</p>;
  }

  return (
    <div className={`page floor-page${embedded ? " floor-page--embedded" : ""}`}>
      <div className="page-toolbar floor-toolbar">
        <div>
          <h1>{embedded ? "Table setup" : "Table view"}</h1>
          {!embedded && (
            <p className="muted">
              Areas and tables are saved in the database for this outlet (same as menu) — they persist
              after restart until you change them. Table names must be unique within an area; different
              areas can reuse names (e.g. both can have Table 1).
            </p>
          )}
        </div>
        <div className="floor-toolbar__actions">
          <button type="button" className="btn btn-primary" onClick={openAddArea}>
            + Add area
          </button>
        </div>
      </div>

      <div className="floor-legend card">
        <span><i className="tile-swatch tile-swatch--free" /> Available</span>
        <span><i className="tile-swatch tile-swatch--time" /> Snooker / time-based</span>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && areas.length === 0 && (
        <div className="empty-state card">
          <p>No areas yet. Add AC, Garden, Snooker, private rooms, etc.</p>
          <button type="button" className="btn btn-primary" onClick={openAddArea}>
            Add first area
          </button>
        </div>
      )}

      {areas.map((area) => (
        <section key={area.id} className="floor-section">
          <div className="floor-section__head">
            <h2 className="floor-section__title">{area.name}</h2>
            <div className="floor-tool-group">
              <button type="button" className="floor-tool-btn" onClick={() => openAddTable(area)}>
                <span className="floor-tool-btn__icon">＋</span>
                <span>Add table</span>
              </button>
              <button type="button" className="floor-tool-btn" onClick={() => openBulkTables(area)}>
                <span className="floor-tool-btn__icon">▦</span>
                <span>Generate</span>
              </button>
              <button type="button" className="floor-tool-btn" onClick={() => openEditArea(area)}>
                <span className="floor-tool-btn__icon">✎</span>
                <span>Settings</span>
              </button>
              <button
                type="button"
                className="floor-tool-btn floor-tool-btn--danger"
                onClick={() => removeArea(area)}
              >
                <span className="floor-tool-btn__icon">⌫</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
          {(area.billing_mode ?? "dine_in") === "time_based" && (
            <div className="floor-time-band">
              <span className="floor-time-band__label">Time allotment</span>
              <span className="floor-time-band__value">
                {area.operating_start ?? "—"} – {area.operating_end ?? "—"}
              </span>
              {area.hourly_rate && (
                <span className="floor-time-band__rate">₹{area.hourly_rate} / hour (area default)</span>
              )}
            </div>
          )}
          {area.tables.length === 0 ? (
            <p className="muted floor-empty">No tables in this area.</p>
          ) : (
            <div className="floor-grid">
              {area.tables.map((t) => (
                <div
                  key={t.id}
                  className={`floor-tile ${t.resource_kind === "time_based" ? "floor-tile--time" : ""}`}
                >
                  <span className="floor-tile__label">{t.label}</span>
                  {t.capacity != null && (
                    <span className="floor-tile__meta">{t.capacity} seats</span>
                  )}
                  {t.resource_kind === "time_based" && t.hourly_rate && (
                    <span className="floor-tile__meta">₹{t.hourly_rate}/hr</span>
                  )}
                  <button
                    type="button"
                    className="floor-tile__delete"
                    onClick={() => removeTable(t)}
                    aria-label={`Delete ${t.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {areaModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal card" onSubmit={saveArea}>
            <h2>{areaModal === "add" ? "New area" : "Area settings"}</h2>
            <p className="muted">e.g. AC, Non AC, Garden, Snooker, Private room</p>
            <label className="field">
              <span>Area name</span>
              <input value={areaName} onChange={(e) => setAreaName(e.target.value)} required autoFocus />
            </label>
            <label className="field">
              <span>Billing type</span>
              <select
                value={areaBillingMode}
                onChange={(e) => setAreaBillingMode(e.target.value as AreaBillingMode)}
              >
                <option value="dine_in">Dining tables</option>
                <option value="time_based">Time-based (snooker, games, etc.)</option>
              </select>
            </label>
            {areaBillingMode === "time_based" && (
              <div className="floor-time-fields card">
                <p className="muted">Operating window and default hourly rate for tables in this area.</p>
                <div className="floor-time-fields__row">
                  <label className="field">
                    <span>Start time</span>
                    <input
                      type="time"
                      value={areaOpStart}
                      onChange={(e) => setAreaOpStart(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>End time</span>
                    <input
                      type="time"
                      value={areaOpEnd}
                      onChange={(e) => setAreaOpEnd(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Hourly rate (₹)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={areaHourlyRate}
                    onChange={(e) => setAreaHourlyRate(e.target.value)}
                    required
                  />
                </label>
              </div>
            )}
            {areaModal === "add" && (
              <>
                <label className="field">
                  <span>Number of tables (optional)</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    placeholder="e.g. 8"
                    value={areaTableCount}
                    onChange={(e) => setAreaTableCount(e.target.value)}
                  />
                </label>
                {areaTableCount.trim() && parseInt(areaTableCount, 10) > 0 && (
                  <label className="field">
                    <span>Name prefix</span>
                    <input
                      value={areaTablePrefix}
                      onChange={(e) => setAreaTablePrefix(e.target.value)}
                      placeholder="Table"
                    />
                    <span className="muted field-hint">
                      Creates {areaTablePrefix.trim() || "Table"} 1, {areaTablePrefix.trim() || "Table"} 2, …
                    </span>
                  </label>
                )}
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAreaModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      {bulkModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal card" onSubmit={saveBulkTables}>
            <h2>Generate tables — {bulkModal.name}</h2>
            <p className="muted">
              Adds numbered dining tables in this area only. Names continue after existing tables
              with the same prefix.
            </p>
            <label className="field">
              <span>How many tables?</span>
              <input
                type="number"
                min={1}
                max={500}
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Name prefix</span>
              <input
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="Table"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setBulkModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Generate</button>
            </div>
          </form>
        </div>
      )}

      {tableModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal card" onSubmit={saveTable}>
            <h2>Add table — {tableModal.areaName}</h2>
            <label className="field">
              <span>Label</span>
              <input
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="AC1, S1, Room 2"
                required
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                value={tableKind}
                onChange={(e) => setTableKind(e.target.value as ResourceKind)}
              >
                <option value="dine_table">Dining table</option>
                <option value="time_based">Snooker / time-based</option>
              </select>
            </label>
            {tableKind === "dine_table" && (
              <label className="field">
                <span>Capacity (optional)</span>
                <input
                  type="number"
                  min={1}
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(e.target.value)}
                />
              </label>
            )}
            {tableKind === "time_based" && (
              <label className="field">
                <span>Hourly rate (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
              </label>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setTableModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
