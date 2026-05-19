# Development Notes — Blank EG

## Build
```powershell
npm run build
```

## Routes (14 total)
- `/` — Home (slider + product grid)
- `/account` — User profile (order history)
- `/api/orders` — API endpoint (dynamic)
- `/cart` — Cart (qty controls, bump animation)
- `/checkout` — Checkout (form + summary, auth guard)
- `/dashboard` — Admin-only order management (role guard)
- `/forgot-password` — Password reset mock
- `/login` — Login
- `/register` — Register (first user = admin)
- `/test-supabase` — Debug page (harmless)
- `/thanks` — Order confirmation (`?id=BLK-XXXXXX`)

## Auth system
- **Storage:** localStorage (`blank_users`, `blank_session`)
- **Mock backend:** client-side password check, swappable to Supabase Auth
- **Role system:** `StoredUser` and `AuthUser` include `role: "admin" | "user"`
- **First user** registered becomes `admin`; all subsequent users default to `user`
- **Session** stores `{ id, email, role }`; legacy sessions without `role` default to `"user"`
- **Header** routes by role: admin → `/dashboard`, user → `/account`
- **Dashboard** shows "Access Denied" if `user.role !== "admin"`

## Cart system
- **Single source of truth:** `CartContext` (`context/CartContext.tsx`)
- **Merge key:** `color + size` — same variant increments quantity
- **SSR-safe:** all localStorage access inside `useEffect` or guarded
- **Guard:** corrupted data recovery, negative-qty clamping
- **Public API:** `hooks/useCart.tsx` re-exports `useCartContext` as `useCart`

## Order system
- **Data model:** `Order`, `OrderItem`, `OrderCustomer`, `OrderStatus` in `lib/order.ts`
- **Storage:** localStorage (`orders` key)
- **Display ID:** `BLK-XXXXXX` (6 hex chars); canonical `id` is UUID
- **Legacy compat:** `normalizeOrder()` handles pre-refactor format
- **Statuses:** `pending → confirmed → processing → completed | cancelled`
- **Dashboard:** status filter, newest/oldest sort, inline status update, delete

## Slider (home page)
- **Crossfade:** all `<img>` elements mounted simultaneously; only active slide is `opacity-100`
- **Preload:** all images preloaded in `useEffect` before slider starts
- **Prevention:** no blank/black frames — fallback black background until `imagesReady`
- **Transition:** 600ms CSS opacity transition
- **Files:** `public/slider/{1,2}.jpg` (exactly 2 images)

## Toast system
- **Context:** `components/Toast.tsx` with `ToastProvider` + `useToast`
- **Types:** `success` (green), `error` (red), `info` (blue); auto-dismiss 2.5s

## Supabase client
- `lib/supabase.tsx` returns `null` if env vars are placeholder values (`https://xxxx.supabase.co` etc.)
- Guards against invalid network requests from placeholder keys

## Key conventions
- `"use client"` on all interactive pages
- Lucide icons for UI
- Tailwind CSS v4 with arbitrary values (`duration-600`, `w-18`)
- `z-50` for header, `-z-10` for slider background
- All pages wrapped with `AuthProvider` > `CartProvider` > `ToastProvider` in `layout.tsx`
