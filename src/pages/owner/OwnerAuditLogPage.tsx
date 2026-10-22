import { useEffect, useState } from "react";
import { fetchAuditLog } from "../../api/owner";
import { OwnerApiError } from "../../api/ownerClient";
import { useOwnerOutlet } from "../../context/OwnerOutletContext";
import type { AuditLogEntry } from "../../types/owner";

export function OwnerAuditLogPage() {
  const { outlet } = useOwnerOutlet();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outlet) return;
    void fetchAuditLog(outlet.id)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof OwnerApiError ? e.message : "Failed to load"));
  }, [outlet]);

  if (!outlet) return <p className="muted">Select an outlet.</p>;

  return (
    <div className="owner-audit card">
      <h1>Audit log</h1>
      <p className="muted">Who did what — settlements, refunds, day close, settings.</p>
      {error && <p className="form-error">{error}</p>}
      <table className="owner-audit__table">
        <thead>
          <tr>
            <th>When</th>
            <th>User</th>
            <th>Action</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={4} className="muted">No entries yet.</td></tr>
          )}
          {items.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.created_at).toLocaleString()}</td>
              <td>{row.actor_username ?? "—"}</td>
              <td><code>{row.action}</code></td>
              <td>{row.summary}{row.reason ? ` (${row.reason})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
