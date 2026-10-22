import type { PosBillingSection } from "./PosBillingNav";

export type PosToolDrawerId = "settings" | "audit";

type ToolItem = {
  id: string;
  label: string;
  title: string;
  section?: PosBillingSection;
  drawer?: PosToolDrawerId;
  icon: string;
  show: boolean;
};

type Props = {
  activeSection: PosBillingSection;
  openDrawer: PosToolDrawerId | null;
  outletRef?: string;
  permissions: string[];
  onSection: (section: PosBillingSection) => void;
  onDrawer: (id: PosToolDrawerId | null) => void;
};

export function PosTopToolbar({
  activeSection,
  openDrawer,
  outletRef,
  permissions,
  onSection,
  onDrawer,
}: Props) {
  const p = (code: string) => permissions.includes(code);

  const items: ToolItem[] = [
    {
      id: "tables",
      label: "Tables",
      title: "Table floor & new orders",
      section: "tables",
      icon: "▦",
      show: true,
    },
    {
      id: "menu",
      label: "Menu",
      title: "Menu catalog view",
      section: "menu",
      icon: "📖",
      show: p("pos.menu"),
    },
    {
      id: "bills",
      label: "Bills",
      title: "Settled bills & invoices",
      section: "bills",
      icon: "🧾",
      show: p("pos.bills"),
    },
    {
      id: "stock",
      label: "Stock",
      title: "Inventory & sales analytics",
      section: "inventory",
      icon: "📦",
      show: p("pos.inventory"),
    },
    {
      id: "setup",
      label: "Setup",
      title: "Areas & tables setup",
      section: "setup",
      icon: "⚙",
      show: p("pos.floor"),
    },
    {
      id: "outlet",
      label: "Outlet",
      title: "GST, invoice & discount policy",
      drawer: "settings",
      icon: "🏪",
      show: p("settings.view") || p("settings.all"),
    },
    {
      id: "audit",
      label: "Audit",
      title: "Who changed what",
      drawer: "audit",
      icon: "📋",
      show: p("audit.view"),
    },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <header className="pp-pos-toolbar" aria-label="Quick actions">
      <div className="pp-pos-toolbar__brand">
        <span className="pp-pos-toolbar__logo">KhataBabu</span>
        {outletRef && <span className="pp-pos-toolbar__ref">REF {outletRef}</span>}
      </div>
      <nav className="pp-pos-toolbar__icons" aria-label="POS shortcuts">
        {visible.map((item) => {
          const isSectionActive = item.section != null && activeSection === item.section && !openDrawer;
          const isDrawerActive = item.drawer != null && openDrawer === item.drawer;
          const isActive = isSectionActive || isDrawerActive;
          return (
            <button
              key={item.id}
              type="button"
              className={`pp-pos-toolbar__btn ${isActive ? "pp-pos-toolbar__btn--on" : ""}`}
              title={item.title}
              onClick={() => {
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
