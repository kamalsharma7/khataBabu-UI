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
import type { ResourceKind, VenueArea, VenueTable } from "../../types/owner";

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
    setAreaModal("add");
  };

  const openEditArea = (area: VenueArea) => {
    setAreaName(area.name);
    setAreaModal({ edit: area });
  };

  const saveArea = async (e: FormEvent) => {
    e.preventDefault();
    if (!outlet || !areaModal) return;
    try {
      if (areaModal === "add") {
        const count = areaTableCount.trim() ? parseInt(areaTableCount, 10) : undefined;
        await createArea(outlet.id, {
          name: areaName.trim(),
          ...(count != null && count > 0
            ? {
                initial_table_count: count,
                table_label_prefix: areaTablePrefix.trim() || "Table",
              }
            : {}),
        });
      } else {
        await updateArea(outlet.id, areaModal.edit.id, { name: areaName.trim() });
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
    setTableKind("dine_table");
    setHourlyRate("");
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
            <div className="floor-section__tools">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAddTable(area)}>
                + Add table
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openBulkTables(area)}>
                Generate tables
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditArea(area)}>
                Rename
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeArea(area)}>
                Delete area
              </button>
            </div>
          </div>
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
            <h2>{areaModal === "add" ? "New area" : "Rename area"}</h2>
            <p className="muted">e.g. AC, Non AC, Garden, Snooker, Private room</p>
            <label className="field">
              <span>Area name</span>
              <input value={areaName} onChange={(e) => setAreaName(e.target.value)} required autoFocus />
            </label>
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
