import type { MenuItem } from "../../../types/owner";
import { addonGroupHint, hasNestedVariations, variationRoots } from "./modifierUtils";

export function MenuItemModifierSummary({ item }: { item: MenuItem }) {
  const roots = variationRoots(item);
  const groups = item.addon_groups?.length
    ? item.addon_groups
    : item.addons?.length
      ? [{ id: "flat", name: "Toppings", min_select: 0, max_select: null, sort_order: 0, addons: item.addons }]
      : [];
  const nested = hasNestedVariations(item);

  if (roots.length === 0 && groups.length === 0) {
    return (
      <p className="menu-mgmt-row__no-mods">Single price on POS — no types, sizes, or toppings configured.</p>
    );
  }

  return (
    <div className="menu-mgmt-row__mods">
      {roots.length > 0 && (
        <div className="menu-mgmt-row__mod-group">
          <span className="menu-mgmt-row__mod-label">{nested ? "Types · sizes" : "Variations"}</span>
          <div className="menu-mgmt-row__chips">
            {roots.map((type) => {
              const sizes = type.children ?? [];
              if (!sizes.length) {
                return (
                  <span
                    key={type.id}
                    className={`menu-mod-chip ${type.is_default ? "menu-mod-chip--default" : ""}`}
                  >
                    {type.name}
                    <strong>₹{type.price}</strong>
                    {type.is_default && <em>default</em>}
                  </span>
                );
              }
              return sizes.map((size) => (
                <span
                  key={size.id}
                  className={`menu-mod-chip ${size.is_default ? "menu-mod-chip--default" : ""}`}
                >
                  {type.name} · {size.name}
                  <strong>₹{size.price}</strong>
                  {size.is_default && <em>default</em>}
                </span>
              ));
            })}
          </div>
        </div>
      )}
      {groups.map((group) => (
        <div key={group.id} className="menu-mgmt-row__mod-group">
          <span className="menu-mgmt-row__mod-label">
            {group.name}
            <em className="menu-mgmt-row__mod-rule">
              {addonGroupHint(group.min_select, group.max_select)}
            </em>
          </span>
          <div className="menu-mgmt-row__chips">
            {group.addons.map((a) => (
              <span key={a.id} className="menu-mod-chip menu-mod-chip--addon">
                + {a.name}
                <strong>₹{a.price}</strong>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
