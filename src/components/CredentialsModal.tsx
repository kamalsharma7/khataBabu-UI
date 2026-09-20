import type { TenantOnboardingResult } from "../types/platform";

interface Props {
  result: TenantOnboardingResult;
  onClose: () => void;
}

export function CredentialsModal({ result, onClose }: Props) {
  const copyAll = async () => {
    const text = [
      `KhataBabu owner access`,
      `Outlet REF: ${result.outlet_ref_code}`,
      `Username: ${result.owner_credentials.username}`,
      `Temporary password: ${result.owner_credentials.temporary_password}`,
      `(Password shown once — share securely.)`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal card">
        <h2>Owner credentials (one time)</h2>
        <p className="muted">{result.message}</p>
        <p className="cred-hint">
          Owner signs in at <strong>/app/login</strong> with <strong>username + password</strong> only.
          REF is for support and billing station — not the login password.
        </p>
        <dl className="cred-list">
          <div>
            <dt>Outlet REF</dt>
            <dd>
              <code>{result.outlet_ref_code}</code>
            </dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>
              <code>{result.owner_credentials.username}</code>
            </dd>
          </div>
          <div>
            <dt>Temporary password</dt>
            <dd>
              <code className="cred-password">{result.owner_credentials.temporary_password}</code>
            </dd>
          </div>
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
