/** Canonical Indian states/UTs and cities for platform onboarding, venue edit, and territory analytics. */

export const INDIAN_STATE_CITIES: Record<string, readonly string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kurnool", "Other"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Tawang", "Other"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Other"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Other"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Other"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Other"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Other"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar", "Other"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sonipat", "Panchkula", "Other"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Other"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Other"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Other"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Other"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Other"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Other"],
  Manipur: ["Imphal", "Other"],
  Meghalaya: ["Shillong", "Other"],
  Mizoram: ["Aizawl", "Other"],
  Nagaland: ["Kohima", "Dimapur", "Other"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Other"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali", "Chandigarh", "Other"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Other"],
  Sikkim: ["Gangtok", "Other"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Other"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Other"],
  Tripura: ["Agartala", "Other"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Noida", "Agra", "Varanasi", "Meerut", "Other"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Other"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol", "Other"],
  Chandigarh: ["Chandigarh", "Other"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Other"],
  Ladakh: ["Leh", "Kargil", "Other"],
  Puducherry: ["Puducherry", "Karaikal", "Other"],
};

export const INDIAN_STATES = Object.keys(INDIAN_STATE_CITIES).sort();

export const DEFAULT_INDIAN_STATE = "Haryana";

const STATE_ALIASES: Record<string, string> = {
  up: "Uttar Pradesh",
  "uttar pradesh": "Uttar Pradesh",
  mp: "Madhya Pradesh",
  hp: "Himachal Pradesh",
  wb: "West Bengal",
  "west bengal": "West Bengal",
  "nct of delhi": "Delhi",
  "new delhi": "Delhi",
  jk: "Jammu and Kashmir",
  "jammu & kashmir": "Jammu and Kashmir",
};

const CITY_ALIASES: Record<string, string> = {
  gurgaon: "Gurugram",
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  bombay: "Mumbai",
  calcutta: "Kolkata",
  madras: "Chennai",
  mysore: "Mysuru",
  baroda: "Vadodara",
  benares: "Varanasi",
  banaras: "Varanasi",
  allahabad: "Prayagraj",
};

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function citiesForState(state: string): readonly string[] {
  return INDIAN_STATE_CITIES[state] ?? INDIAN_STATE_CITIES[DEFAULT_INDIAN_STATE] ?? ["Other"];
}

export function defaultCityForState(state: string): string {
  const cities = citiesForState(state);
  return cities[0] ?? "Other";
}

export function isValidStateCity(state: string, city: string): boolean {
  const cities = INDIAN_STATE_CITIES[state];
  return Boolean(cities && cities.includes(city));
}

export function normalizeIndianState(raw: string): string {
  const cleaned = clean(raw);
  if (!cleaned) return DEFAULT_INDIAN_STATE;
  const lower = cleaned.toLowerCase();
  const alias = STATE_ALIASES[lower];
  if (alias) return alias;
  const exact = INDIAN_STATES.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  const partial = INDIAN_STATES.find(
    (s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower),
  );
  return partial ?? DEFAULT_INDIAN_STATE;
}

function findStateForCity(city: string): string | null {
  const lower = city.toLowerCase();
  for (const state of INDIAN_STATES) {
    const cities = INDIAN_STATE_CITIES[state];
    if (cities.some((c) => c.toLowerCase() === lower)) return state;
  }
  return null;
}

export function normalizeIndianCity(state: string, raw: string): string {
  const cities = citiesForState(state);
  const cleaned = clean(raw);
  if (!cleaned) return cities[cities.length - 1] ?? "Other";
  let candidate = cleaned;
  const alias = CITY_ALIASES[cleaned.toLowerCase()];
  if (alias) candidate = alias;
  const exact = cities.find((c) => c.toLowerCase() === candidate.toLowerCase());
  if (exact) return exact;
  const partial = cities.find(
    (c) =>
      candidate.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(candidate.toLowerCase()),
  );
  if (partial) return partial;
  const otherState = findStateForCity(candidate);
  if (otherState && INDIAN_STATE_CITIES[otherState].includes(candidate)) {
    return candidate;
  }
  return cities.includes("Other") ? "Other" : cities[0];
}

export function normalizeIndianStateCity(
  stateRaw: string,
  cityRaw: string,
): { state: string; city: string } {
  let state = normalizeIndianState(stateRaw);
  let city = normalizeIndianCity(state, cityRaw);
  if (!isValidStateCity(state, city)) {
    const inferred = findStateForCity(city);
    if (inferred) state = inferred;
    city = normalizeIndianCity(state, cityRaw);
  }
  if (!isValidStateCity(state, city)) {
    city = defaultCityForState(state);
  }
  return { state, city };
}

export function coerceStateCity(state: string, city: string): { state: string; city: string } {
  return normalizeIndianStateCity(state, city);
}
