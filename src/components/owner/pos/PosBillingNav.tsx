export type PosBillingSection = "tables" | "setup" | "menu" | "bills";

type Props = {
  open: boolean;
  active: PosBillingSection;
  onToggle: () => void;
  onSelect: (section: PosBillingSection) => void;
};

const ITEMS: { id: PosBillingSection; label: string; short: string }[] = [
  { id: "tables", label: "Billing", short: "Billing" },
  { id: "setup", label: "Table setup", short: "Setup" },
  { id: "menu", label: "Menu view", short: "Menu" },
  { id: "bills", label: "All bills", short: "Bills" },
];

export function PosBillingNav({ open, active, onToggle, onSelect }: Props) {
  return (
    <aside
      className={`pp-pos-nav ${open ? "pp-pos-nav--open" : "pp-pos-nav--collapsed"}`}
      aria-label="Billing navigation"
    >
      <button
        type="button"
        className="pp-pos-nav__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span className="pp-pos-nav__burger" aria-hidden>☰</span>
      </button>
      {open && (
        <nav className="pp-pos-nav__links">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pp-pos-nav__link ${active === item.id ? "pp-pos-nav__link--on" : ""}`}
              onClick={() => onSelect(item.id)}
              title={item.label}
            >
              <span className="pp-pos-nav__link-label">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
