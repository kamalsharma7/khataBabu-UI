# KhataBabu UI — Platform Console

Internal super-admin web app for onboarding restaurant / snooker venue owners. **Not** part of the owner or POS apps.

## Setup

```bash
cd kb-ui/khataBabu-UI
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173/platform/login

Ensure the API is running (`khataBabu`) with CORS allowing `http://localhost:5173`.

## Routes

| Path | Purpose |
|------|---------|
| `/platform/login` | Platform super-admin sign in |
| `/platform/tenants` | List onboarded businesses |
| `/platform/onboard` | 3-step onboarding wizard |

### Owner app (venue setup)

| Path | Purpose |
|------|---------|
| `/app/login` | Owner sign in (24h session) |
| `/app/change-password` | Required after temporary password |
| `/app` | Overview shortcuts |
| `/app/floor` | Areas + table grid (dine & snooker/time-based) |
| `/app/menu` | Categories, items, in/out of stock |

## Environment

- `VITE_API_BASE_URL` — default `http://localhost:8000/api/v1`
