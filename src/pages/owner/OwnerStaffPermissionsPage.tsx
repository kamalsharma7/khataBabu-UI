import { useCallback, useEffect, useMemo, useState } from "react";
import { saveStaffPermissions, staffPermissionMatrix } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import { useOwnerPermissions } from "../../context/OwnerPermissionsContext";
import type { StaffGrantRow, StaffPermissionGroup, StaffPermissionMatrix } from "../../types/owner";
import { ownerRoleLabel } from "../../utils/platformLabels";

const PRESETS: { id: string; label: string; hint: string; codes: string[] }[] = [
  {
    id: "counter",
    label: "Counter",
    hint: "Take orders, bills, small discount, save guest",
    codes: ["pos.billing", "pos.bills", "pos.discount", "pos.pay_later", "crm.view", "crm.edit"],
  },
  {
    id: "captain",
    label: "Captain",
    hint: "Counter + cancel / void",
    codes: ["pos.billing", "pos.bills", "pos.discount", "pos.pay_later", "pos.cancel", "crm.view", "crm.edit"],
  },
  {
    id: "store",
    label: "Store",
    hint: "Raw materials and vendor bills only",
    codes: ["pos.inventory", "purchases.manage"],
  },
  {
    id: "full",
    label: "Full staff",
    hint: "Everything a receptionist can be given",
    codes: [],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function OwnerStaffPermissionsPage() {
  const { outlet } = useOwnerOutlet();
  const { profile } = useOwnerAuth();
  const { canManage, showDenied, refresh: refreshMine } = useOwnerPermissions();
  const [matrix, setMatrix] = useState<StaffPermissionMatrix | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [applyAll, setApplyAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!outlet) return;
    if (!canManage) {
      setLoading(false);
      showDenied();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await staffPermissionMatrix(outlet.id);
      setMatrix(data);
      const first = data.staff[0];
      setSelectedId((prev) => (prev && data.staff.some((s) => s.id === prev) ? prev : first?.id ?? null));
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not load permissions");
    } finally {
      setLoading(false);
    }
  }, [outlet, canManage, showDenied]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected: StaffGrantRow | null = useMemo(
    () => matrix?.staff.find((s) => s.id === selectedId) ?? null,
    [matrix, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setDraft({ ...selected.grants });
      setPresetId(null);
    } else {
      setDraft({});
    }
  }, [selected]);

  const assignableGroups: StaffPermissionGroup[] = useMemo(
    () => (matrix?.catalog ?? []).filter((g) => g.staff_assignable),
    [matrix],
  );
  const allAssignable = useMemo(
    () => assignableGroups.flatMap((g) => g.permissions.map((p) => p.code)),
    [assignableGroups],
  );

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const codes = preset.id === "full" ? allAssignable : preset.codes;
    const next: Record<string, boolean> = {};
    for (const code of allAssignable) next[code] = codes.includes(code);
    setDraft(next);
    setPresetId(id);
  };

  const toggle = (code: string) => {
    setPresetId(null);
    setDraft((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const save = async () => {
    if (!outlet || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const data = await saveStaffPermissions(outlet.id, selected.id, {
        grants: draft,
        apply_to_all_outlets: applyAll,
      });
      setMatrix(data);
      setNotice(
        applyAll
          ? `Saved for ${selected.full_name} on every outlet.`
          : `Saved for ${selected.full_name} at ${data.outlet_name}.`,
      );
      await refreshMine();
    } catch (err) {
      setError(err instanceof OwnerApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!outlet) return <p className="muted">Select an outlet to manage staff permissions.</p>;
  if (!canManage) {
    return (
      <div className="studio-page">
        <h1>Staff permissions</h1>
        <p className="form-error">You don't have permission for this operation.</p>
      </div>
    );
  }

  const enabledCount = Object.values(draft).filter(Boolean).length;

  return (
    <div className="studio-page perm-studio">
      <header className="studio-head">
        <div>
          <p className="studio-kicker">Venue access</p>
          <h1>Staff permissions</h1>
          <p className="studio-lead">
            Signed in as <strong>{profile?.full_name}</strong> ({ownerRoleLabel(profile?.role ?? "owner")}). Tick what a
            receptionist can do at <strong>{outlet.name}</strong>. Owner and admin always have everything.
          </p>
        </div>
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

      {loading && <p className="muted">Loading staff…</p>}

      {!loading && matrix && (
        <div className="perm-studio__grid">
          <aside className="studio-card perm-rail">
            <h2>People</h2>
            <p className="perm-rail__hint">Receptionist logins only. Managers stay unlocked.</p>
            <ul>
              {matrix.managers.map((m) => (
                <li key={m.id} className="perm-person perm-person--locked">
                  <span className="perm-avatar">{initials(m.full_name)}</span>
                  <span className="perm-person__text">
                    <strong>{m.full_name}</strong>
                    <small>
                      {ownerRoleLabel(m.role)} · {m.username}
                    </small>
                  </span>
                  <em>All access</em>
                </li>
              ))}
              {matrix.staff.length === 0 && <li className="perm-rail__empty">No receptionist login on this venue yet.</li>}
              {matrix.staff.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`perm-person ${selectedId === s.id ? "is-on" : ""}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <span className="perm-avatar">{initials(s.full_name)}</span>
                    <span className="perm-person__text">
                      <strong>{s.full_name}</strong>
                      <small>
                        {ownerRoleLabel(s.role)} · {s.username}
                      </small>
                    </span>
                    <em>
                      {s.configured ? "Custom" : "Default"}
                      {!s.is_active ? " · off" : ""}
                    </em>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="studio-card perm-sheet">
            {!selected && <p className="studio-empty">Select a receptionist to set their ticks.</p>}
            {selected && (
              <>
                <div className="perm-sheet__head">
                  <div>
                    <h2>{selected.full_name}</h2>
                    <p>
                      {enabledCount} of {allAssignable.length} operations at {matrix.outlet_name}
                    </p>
                  </div>
                  <div className="perm-presets" role="group" aria-label="Presets">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`chip ${presetId === p.id ? "is-on" : ""}`}
                        title={p.hint}
                        onClick={() => applyPreset(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {assignableGroups.map((group) => (
                  <div key={group.id} className="perm-block">
                    <h3>{group.label}</h3>
                    <ul>
                      {group.permissions.map((perm) => (
                        <li key={perm.code}>
                          <label className={`perm-row ${draft[perm.code] ? "is-on" : ""} ${perm.dangerous ? "is-warn" : ""}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(draft[perm.code])}
                              onChange={() => toggle(perm.code)}
                              disabled={saving}
                            />
                            <span>
                              <strong>{perm.label}</strong>
                              <small>{perm.hint}</small>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <footer className="perm-sheet__foot">
                  <label className="perm-all">
                    <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} disabled={saving} />
                    <span>Same ticks on every outlet</span>
                  </label>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save permissions"}
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
