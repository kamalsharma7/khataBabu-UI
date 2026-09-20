import type { MenuItem } from "../../../types/owner";

export function MenuItemModifierSummary({ item }: { item: MenuItem }) {
  const variations = item.variations ?? [];
  const addons = item.addons ?? [];

  if (variations.length === 0 && addons.length === 0) {
    return (
      <p className="menu-mgmt-row__no-mods">Single price on POS — no variations or toppings configured.</p>
    );
  }

  return (
    <div className="menu-mgmt-row__mods">
      {variations.length > 0 && (
        <div className="menu-mgmt-row__mod-group">
          <span className="menu-mgmt-row__mod-label">Variations</span>
          <div className="menu-mgmt-row__chips">
            {variations.map((v) => (
              <span
                key={v.id}
                className={`menu-mod-chip ${v.is_default ? "menu-mod-chip--default" : ""}`}
              >
                {v.name}
                <strong>₹{v.price}</strong>
                {v.is_default && <em>default</em>}
              </span>
            ))}
          </div>
        </div>
      )}
      {addons.length > 0 && (
        <div className="menu-mgmt-row__mod-group">
          <span className="menu-mgmt-row__mod-label">Toppings</span>
          <div className="menu-mgmt-row__chips">
            {addons.map((a) => (
              <span key={a.id} className="menu-mod-chip menu-mod-chip--addon">
                + {a.name}
                <strong>₹{a.price}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
