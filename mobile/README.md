# Shop Manager — Mobile (Expo Router)

React Native + **Expo SDK 54** + **Expo Router v6** (file-based routing, Next.js-style).
The `app/` directory is the source of truth for every route.

## Project Structure

```
mobile/
├── app.json                          Expo config (scheme, plugins, apiBaseUrl)
├── package.json                      main = "expo-router/entry"
├── babel.config.js
│
├── app/                              ◄── routes live here
│   ├── _layout.jsx                   Root: providers (Auth, Safe Area, Toast) + auth gate
│   ├── login.jsx                     /login
│   ├── register.jsx                  /register
│   │
│   ├── (tabs)/                       Tab group (no URL prefix)
│   │   ├── _layout.jsx               Bottom tab bar with center Scan button
│   │   ├── index.jsx                 /  — Home (quick actions)
│   │   ├── stock.jsx                 /stock — Products list, add-with-scan / manual
│   │   ├── scan.jsx                  placeholder (button redirects to /scanner)
│   │   ├── alerts.jsx                /alerts — low stock, top sellers, pending
│   │   └── history.jsx               /history — Bills + Movements sub-tabs
│   │
│   ├── dashboard.jsx                 /dashboard — full analytics (opened from Home)
│   ├── scanner.jsx                   /scanner — camera → auto-cart → create bill
│   ├── billing.jsx                   /billing — manual POS bill
│   ├── stock-in.jsx                  /stock-in — record supplier purchase
│   ├── product-form.jsx              /product-form?id=…&barcode=…
│   └── bill/
│       └── [id].jsx                  /bill/:id — invoice view
│
└── src/                              ◄── shared code, not routes
    ├── api/axios.js                  Axios client, JWT, 401 handler
    ├── context/AuthContext.js        user state + login/register/logout
    ├── components/
    │   ├── ui.js                     Card, Input, Label, Button, Pill
    │   └── BarcodeScannerModal.js    Reusable camera modal
    ├── features/
    │   ├── BillsList.jsx             Reused inside /history
    │   └── TransactionsList.jsx      Reused inside /history
    ├── theme/colors.js
    └── utils/format.js
```

## Routing conventions

| File path                     | URL              | Notes                                              |
|-------------------------------|------------------|----------------------------------------------------|
| `app/_layout.jsx`             | —                | Root layout, wraps every route                     |
| `app/login.jsx`               | `/login`         |                                                    |
| `app/(tabs)/_layout.jsx`      | —                | Renders the bottom Tabs navigator                  |
| `app/(tabs)/index.jsx`        | `/`              | Home                                               |
| `app/(tabs)/stock.jsx`        | `/stock`         |                                                    |
| `app/bill/[id].jsx`           | `/bill/ABC123`   | Dynamic segment — read with `useLocalSearchParams`|
| `app/product-form.jsx`        | `/product-form`  | Query params: `?id=...` or `?barcode=...`         |

Parentheses in folder names (`(tabs)`) are **groups** — they organize files without adding a URL segment.

## Auth gate

`app/_layout.jsx` watches the auth state with `useSegments()` + `useRouter()`. If the user is not logged in and tries to reach anything other than `login` / `register`, it redirects to `/login`. Logged-in users on an auth route get bounced to `/`.

## Running it

```powershell
cd mobile
npm install
npx expo start -c --lan
```

- Scan the QR from Expo Go on the same Wi-Fi.
- Don't press `a` unless you have Android Studio / an emulator configured.

### API base URL

Edit `app.json` → `expo.extra.apiBaseUrl`:

| Scenario                 | Value                                                 |
|--------------------------|-------------------------------------------------------|
| Android emulator         | `http://10.0.2.2:5000/api`                            |
| iOS simulator            | `http://localhost:5000/api`                           |
| Physical phone on Wi-Fi  | `http://<PC-LAN-IP>:5000/api` (e.g. 192.168.29.161)   |

The value currently set is printed on Metro startup as `[API] base URL = ...`.

### Backend reachability sanity check

From your phone's browser:
```
http://<PC-LAN-IP>:5000
```
Must return `{"message":"Shop System API is running"}`. If it doesn't, Windows Firewall is blocking port 5000 on the Private network profile — open it:
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Shop backend 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Private
```

## Adding a new route

1. Create a `.jsx` file under `app/`. Its path = its URL.
2. Use `useRouter()` to navigate, `useLocalSearchParams()` to read params, `useFocusEffect()` for refresh-on-focus.
3. Register it implicitly — Expo Router picks up new files automatically. Only add it to the `<Stack>` in `app/_layout.jsx` if you want a custom header.

## Useful hooks

| From `expo-router`           | Purpose                                   |
|------------------------------|-------------------------------------------|
| `useRouter()`                | `router.push('/scanner')`, `router.back()` |
| `useLocalSearchParams()`     | Read `?id=…` / `[id].jsx` params          |
| `useSegments()`              | Current path segments (for auth guards)   |
| `useFocusEffect()`           | Run effect each time screen is focused    |
| `useNavigation()`            | Legacy navigation access (e.g. `setOptions`) |
| `<Link href="/register">`    | Declarative link                          |
| `<Redirect href="/login" />` | Conditional redirect inside a component   |
