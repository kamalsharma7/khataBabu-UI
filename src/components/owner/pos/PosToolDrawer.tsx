import type { ReactNode } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export function PosToolDrawer({ title, onClose, children, wide }: Props) {
  return (
    <div className="pp-tool-drawer" role="presentation">
      <button type="button" className="pp-tool-drawer__backdrop" aria-label="Close panel" onClick={onClose} />
      <aside
        className={`pp-tool-drawer__panel ${wide ? "pp-tool-drawer__panel--wide" : ""}`}
        role="dialog"
        aria-labelledby="pp-tool-drawer-title"
      >
        <header className="pp-tool-drawer__head">
          <h2 id="pp-tool-drawer-title">{title}</h2>
          <button type="button" className="pp-tool-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="pp-tool-drawer__body">{children}</div>
      </aside>
    </div>
  );
}
