import type { PosBillingSection } from "./PosBillingNav";

export type PosToolDrawerId = "settings" | "audit";

type ToolItem = {
  id: string;
  label: string;
  title: string;
  section?: PosBillingSection;
  drawer?: PosToolDrawerId;
  icon: string;
  perm?: string;
};

type Props = {
  activeSection: PosBillingSection;
  openDrawer: PosToolDrawerId | null;
  outletRef?: string;
  permissions: string[];
  onSection: (section: PosBillingSection) => void;
  onDrawer: (id: PosToolDrawerId | null) => void;
  onDenied?: () => void;
};

export function PosTopToolbar({
  activeSection,
  openDrawer,
  outletRef,
  permissions,
  onSection,
  onDrawer,
  onDenied,
}: Props) {
  const p = (code: string) => permissions.includes(code);

  const items: ToolItem[] = [
    { id: "tables", label: "Tables", title: "Table floor & new orders", section: "tables", icon: "▦", perm: "pos.billing" },
    { id: "menu", label: "Menu", title: "Menu catalog view", section: "menu", icon: "📖", perm: "pos.menu" },
    { id: "bills", label: "Bills", title: "Settled bills & invoices", section: "bills", icon: "🧾", perm: "pos.bills" },
    { id: "stock", label: "Stock", title: "Inventory & sales analytics", section: "inventory", icon: "📦", perm: "pos.inventory" },
    { id: "setup", label: "Setup", title: "Areas & tables setup", section: "setup", icon: "⚙", perm: "pos.floor" },
    { id: "outlet", label: "Outlet", title: "GST, invoice & discount policy", drawer: "settings", icon: "🏪", perm: "settings.view" },
    { id: "audit", label: "Audit", title: "Who changed what", drawer: "audit", icon: "📋", perm: "audit.view" },
  ];

  const allowed = (item: ToolItem) => {
    if (!item.perm) return true;
    if (item.perm === "settings.view") return p("settings.view") || p("settings.all");
    return p(item.perm);
  };

  return (
    <header className="pp-pos-toolbar" aria-label="Quick actions">
      <div className="pp-pos-toolbar__brand">
        <span className="pp-pos-toolbar__logo">KhataBabu</span>
        {outletRef && <span className="pp-pos-toolbar__ref">REF {outletRef}</span>}
      </div>
      <nav className="pp-pos-toolbar__icons" aria-label="POS shortcuts">
        {items.map((item) => {
          const ok = allowed(item);
          const isSectionActive = item.section != null && activeSection === item.section && !openDrawer;
          const isDrawerActive = item.drawer != null && openDrawer === item.drawer;
          const isActive = isSectionActive || isDrawerActive;
          return (
            <button
              key={item.id}
              type="button"
              className={`pp-pos-toolbar__btn ${isActive ? "pp-pos-toolbar__btn--on" : ""} ${ok ? "" : "pp-pos-toolbar__btn--locked"}`}
              title={ok ? item.title : "You don't have permission for this operation."}
              onClick={() => {
                if (!ok) {
                  onDenied?.();
                  return;
                }
                if (item.drawer) {
                  onDrawer(openDrawer === item.drawer ? null : item.drawer);
                  return;
                }
                if (item.section) {
                  onDrawer(null);
                  onSection(item.section);
                }
              }}
            >
              <span className="pp-pos-toolbar__icon" aria-hidden>{item.icon}</span>
              <span className="pp-pos-toolbar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
