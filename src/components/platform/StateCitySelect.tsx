import {
  INDIAN_STATES,
  citiesForState,
  defaultCityForState,
  isValidStateCity,
} from "../../data/indiaTerritory";

type Props = {
  state: string;
  city: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
};

export function StateCitySelect({
  state,
  city,
  onStateChange,
  onCityChange,
  required = true,
}: Props) {
  const cities = citiesForState(state);
  const cityValue = isValidStateCity(state, city) ? city : defaultCityForState(state);

  const handleState = (nextState: string) => {
    onStateChange(nextState);
    onCityChange(defaultCityForState(nextState));
  };

  return (
    <>
      <label className="field">
        <span>State</span>
        <select value={state} onChange={(e) => handleState(e.target.value)} required={required}>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>City</span>
        <select
          value={cityValue}
          onChange={(e) => onCityChange(e.target.value)}
          required={required}
        >
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
    </>
  );
}
