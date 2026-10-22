import type { TenantOnboardingResult } from "../types/platform";
import { ownerRoleLabel } from "../utils/platformLabels";

interface Props {
  result: TenantOnboardingResult;
  onClose: () => void;
}

export function CredentialsModal({ result, onClose }: Props) {
  const staff = result.staff_credentials ?? [];

  const copyAll = async () => {
    const lines = [
      `KhataBabu owner access`,
      `Outlet REF: ${result.outlet_ref_code}`,
      `Owner username: ${result.owner_credentials.username}`,
      `Owner temporary password: ${result.owner_credentials.temporary_password}`,
    ];
    staff.forEach((s) => {
      lines.push(`${ownerRoleLabel(s.role)} username: ${s.username}`);
      lines.push(`${ownerRoleLabel(s.role)} password: ${s.temporary_password}`);
    });
    lines.push(`(Passwords shown once — share securely.)`);
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal card cred-modal">
        <h2>Credentials (one time)</h2>
        <p className="muted">{result.message}</p>
        <p className="cred-hint">
          Owner and staff sign in at <strong>/app/login</strong> with <strong>username + password</strong>.
          REF is for support — not the login password.
        </p>
        <dl className="cred-list">
          <div>
            <dt>Outlet REF</dt>
            <dd>
              <code>{result.outlet_ref_code}</code>
            </dd>
          </div>
          <div>
            <dt>{ownerRoleLabel(result.owner_credentials.role)} username</dt>
            <dd>
              <code>{result.owner_credentials.username}</code>
            </dd>
          </div>
          <div>
            <dt>Owner temporary password</dt>
            <dd>
              <code className="cred-password">{result.owner_credentials.temporary_password}</code>
            </dd>
          </div>
          {staff.map((s) => (
            <div key={s.username} className="cred-list__staff-block">
              <dt>{ownerRoleLabel(s.role)} username</dt>
              <dd>
                <code>{s.username}</code> / <code className="cred-password">{s.temporary_password}</code>
              </dd>
            </div>
          ))}
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`status-pill status-${result.status}`}>{result.status}</span>
            </dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={copyAll}>
            Copy for WhatsApp
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
