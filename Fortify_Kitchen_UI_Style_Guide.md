# Fortify Kitchen — UI Restyle Guide

**Direction:** Warm & Friendly (reference: Soumaki — soumaki.com.vn, a Vietnamese healthy-bowl brand)
**Audience for this doc:** an AI coding agent (or developer) restyling the existing React + Vite + Tailwind v4 app
**Goal it replaces:** the current bland, generic "AI-generated SaaS dashboard" look — cool slate grays, stock emoji icons, flat green-on-white cards

---

## 1. Why Soumaki as the reference

Soumaki is a Vietnamese "healthy bowl" brand built on sous-vide protein and macro-tracking (protein/carbs/fat per bowl) — the same product category and same customer (gym-goers, macro counters) as Fortify Kitchen. Their brand line is literally "your healthy food soulmate": they talk about food with warmth and romance, not clinical nutrition-speak. Visually their system uses a custom rounded/connected typeface, hand-drawn interwoven line illustrations, cream backgrounds, and warm accent colors — the opposite of a cold spreadsheet-y health app.

We are not copying Soumaki's exact assets (that's their brand). We are borrowing the **feeling**: warm, human, tactile, a little playful — applied to Fortify Kitchen's own green identity.

Sources: [Soumaki](https://soumaki.com.vn/), [Soumaki — Behalf Studio](https://onbehalfof.studio/Soumaki)

---

## 2. What "bland / generic / AI-generated" means here, concretely

Looking at the current app, the tells are:

- Cool blue-gray neutrals (Tailwind `slate-*`) on a flat white/`#f8fafc` background — this is the default palette almost every AI-scaffolded dashboard reaches for.
- Icons are raw emoji (📊 🍽️ 👥 📋 📦 🚚 👨‍🍳) — inconsistent weight, inconsistent style, reads as a placeholder rather than a designed icon system.
- Every card looks identical: white, `rounded-2xl`, `shadow-sm`, `border-slate-100`. No visual hierarchy or warmth, just repetition.
- Single font (Inter) for everything — headings and body text look the same weight of "corporate neutral."
- Accent colors for KPI tiles are grabbed from the Tailwind default palette (blue-50, purple-50, amber-50) with no relationship to the brand — this is the single most obvious "default AI palette" tell.

The fix is not a new component library — it's tightening the palette, adding one warm typographic voice, replacing emoji with a real icon set, and giving surfaces some texture/depth instead of flat white-on-gray.

---

## 3. New design tokens

### 3.1 Color

**Update: brand green anchor changes to `#283828`** (deep, desaturated forest/olive green), replacing the previous `#1E9E5A` (bright emerald). This is actually a stronger fit for "warm & friendly, not generic AI" than the original — bright emerald-green is itself a well-worn default in AI-scaffolded apps (it's very close to Tailwind's own default `emerald-500`/`green-500`); a deep olive reads as premium/earthy rather than "SaaS dashboard," and it pairs better with the warm cream + terracotta direction below.

`#283828` is quite dark (≈19% lightness) — too dark to sit where the *old* `brand-500` sat in a conventional ramp. Rebuild the whole `--color-brand-*` ramp in `index.css` so `#283828` becomes the new `brand-500` (the main interactive/button color) exactly as given, with lighter and darker steps generated around it:

```css
--color-brand-50:  #F6F9F6;
--color-brand-100: #E7EEE7;
--color-brand-200: #CCDBCC;
--color-brand-300: #A6BFA6;
--color-brand-400: #6A956A;
--color-brand-500: #283828;  /* exact anchor */
--color-brand-600: #202D20;
--color-brand-700: #192419;
--color-brand-800: #131B13;
--color-brand-900: #0D120D;
--color-brand-950: #060906;
```

**Important implementation note — flip the hover direction.** Every button currently does `bg-brand-500 hover:bg-brand-600` (go darker on hover), which worked when 500 was a bright mid-tone. Now that 500 is already near-black, `600` is barely distinguishable from it. Change primary-button hover states to **lighten** instead: `bg-brand-500 hover:bg-brand-400`. Do this everywhere `hover:bg-brand-600` currently appears on a filled button.

**Bonus use for the dark end of the ramp:** `brand-700`–`brand-900` are now very dark, near-black greens — good candidates to replace `stone-800`/`stone-900` as the app's primary text color in a few high-emphasis spots (page `<h1>` titles, KPI numbers) instead of neutral black/stone. This subtly tints "ink" with the brand color, a small premium touch. Don't do this for *all* body text — tables and dense data should stay on neutral `stone-*` for readability; reserve tinted-ink for headings and hero numbers only.

| Token | Old | New | Use |
|---|---|---|---|
| `--color-surface` (page bg) | `#f8fafc` (cool slate-50) | `#FBF6ED` (warm cream) | App background behind all pages |
| `--color-card` | `#ffffff` | `#FFFFFF` (keep, but see shadow change below) | Card surfaces |
| Neutral text/border scale | Tailwind `slate-*` (cool blue-gray) | Tailwind `stone-*` (warm gray-brown) | **Global find-and-replace**: every `slate-` utility class → `stone-` |
| New accent — terracotta | — | `--color-accent-50: #FDF0EA` → `--color-accent-600: #C1552F` (full ramp below) | Secondary CTAs, highlight badges (e.g. "high protein"), illustration accents, alternate KPI tiles |
| New accent — warm amber | — | keep existing `amber-*` (Tailwind default is already warm enough) | Payment/attention states — no change needed |

Add this ramp to `index.css` `@theme` block for the new terracotta accent:

```css
--color-accent-50:  #FDF0EA;
--color-accent-100: #FADCCC;
--color-accent-200: #F5B896;
--color-accent-300: #EF9060;
--color-accent-400: #E9713F;
--color-accent-500: #DD5A2B;
--color-accent-600: #C1552F;
--color-accent-700: #9B4325;
--color-accent-800: #78331D;
--color-accent-900: #582615;
```

Replace `--color-surface: #f8fafc;` with `--color-surface: #FBF6ED;`.

**Rule of thumb for using terracotta:** it is a *secondary* accent, not a replacement for green. Use it for maybe 10–15% of accent surface area — a "featured" badge, the odd secondary button, illustration line-work, an alternating KPI tile color. If more than 2 accent colors appear in one screen, that's already too "confetti" — pull back.

### 3.2 Typography

Current: Inter only, for everything. That's a large part of why it reads generic — every dashboard built with Tailwind defaults to Inter.

Add **Nunito** (Google Fonts, full Vietnamese diacritic support, rounded terminals, reads as warm/friendly rather than corporate) for all headings, KPI numbers, and page titles. Keep **Inter** for body copy, table data, and form inputs — Inter's tabular figures and neutral shape are genuinely better for scanning prices/numbers, so this isn't a wasted keep, it's an intentional pairing (display warmth + data clarity), which is exactly how Soumaki pairs their custom display face against clean supporting text.

In `index.html`, change the font import to load both:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
```

In `index.css` `@theme`:

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Nunito', 'Inter', ui-sans-serif, system-ui, sans-serif;
```

Then apply `font-[family-name:var(--font-display)]` (or a `.font-display` utility class you define once in `index.css`) to: every `<h1>`/`<h2>` page title, KPI numbers on the Dashboard, and section headers on cards (e.g. "🚚 Giao hàng hôm nay"). Leave table cells, form labels, and inputs on Inter.

Add this helper class to `index.css` so you don't repeat the bracket syntax everywhere:

```css
.font-display {
  font-family: var(--font-display);
  font-weight: 800;
}
```

### 3.3 Shape & shadow

- Bump card radius from `rounded-2xl` to `rounded-3xl` on primary content cards (KPI tiles, section cards, modals). Keep `rounded-xl`/`rounded-lg` on small controls (buttons, inputs, pills) — contrast between "soft big shapes" and "crisp small controls" is what makes rounded shapes feel intentional instead of just "everything is round."
- Replace the default cool-gray `shadow-sm`/`shadow-lg` with a warm-tinted shadow. Add to `index.css`:

```css
.shadow-warm {
  box-shadow: 0 2px 8px -2px rgba(120, 72, 32, 0.08), 0 1px 2px rgba(120, 72, 32, 0.06);
}
.shadow-warm-lg {
  box-shadow: 0 12px 32px -8px rgba(120, 72, 32, 0.18), 0 4px 8px rgba(120, 72, 32, 0.08);
}
```

  Swap `shadow-sm` → `shadow-warm` and `shadow-lg`/`shadow-xl`/`shadow-2xl` → `shadow-warm-lg` across cards and modals. This one change does a lot of work — a shadow with a warm brown tint instead of neutral gray makes white cards feel like they're sitting on the cream background rather than floating in a cool void.

### 3.4 Iconography

Replace raw emoji navigation/section icons with a real icon set. Add `lucide-react` (`npm install lucide-react`) — it's tree-shakeable, MIT-licensed, and pairs well with the rounded/friendly direction because its icons have consistent stroke weight and soft corners.

Suggested mapping (nav + section headers):

| Current emoji | Lucide icon | Used in |
|---|---|---|
| 📊 | `LayoutDashboard` | Nav: Tổng quan |
| 🍽️ | `UtensilsCrossed` | Nav: Thực đơn |
| 👥 | `Users` | Nav: Khách hàng |
| 📋 | `ClipboardList` | Nav: Đơn hàng |
| 📦 | `Package` | Nav: Gói đăng ký |
| 🚚 | `Truck` | Nav: Giao hàng |
| 👨‍🍳 | `ChefHat` | Nav: Prep List |
| 💰 | `Wallet` | Unpaid/revenue KPIs |
| 📈 | `TrendingUp` | Revenue KPI |
| ⚠️ | `AlertTriangle` | Reorder alerts |

Wrap icons in the same colored circle badge style already used for the login logo (`w-10 h-10 rounded-2xl bg-brand-500 text-white`) rather than leaving them bare — a colored badge behind a line icon reads far more "designed" than an emoji or a bare icon floating in text.

**Where to keep emoji:** informal, human touches inside copy/toasts (e.g. a toast saying "Đã thêm khách hàng mới 🎉") are fine and even fit the warm tone — the goal is removing emoji-as-UI-iconography, not removing all personality.

### 3.5 Illustration / texture (optional, low-effort version)

Soumaki uses hand-drawn interwoven line SVGs as background texture. Fortify Kitchen doesn't need a full illustration system for an internal ops tool, but two cheap wins carry a lot of the same warmth:

1. A single soft blob/wave SVG (one warm color, ~5% opacity) behind the Login page and behind empty states ("Chưa có đơn hàng", "Không có gì cần chuẩn bị"). One reusable inline SVG, positioned absolute, is enough — don't build a whole illustration library.
2. A subtle dot-grain or dot-pattern behind the login card, cream-on-cream, barely visible — cheap way to make a flat cream background feel textured instead of just "a different flat color."

---

## 4. Component-level guidance

### Header / nav (`Layout.jsx`)
- Keep the solid brand-green header bar — with the new `#283828` it becomes a deep forest-green bar instead of bright emerald, which reads more premium and still has plenty of contrast for white nav text/logo. Round its bottom corners slightly (`rounded-b-3xl`) so it doesn't feel like a hard SaaS top-bar slab.
- Swap emoji nav icons for Lucide icons per §3.4.
- Active nav item: currently `bg-white/20`. Fine — keep, it reads even better against the darker green (more contrast between active/inactive states).

### KPI cards (`DashboardPage.jsx`)
This is the highest-impact single fix. Currently uses `blue-50`, `purple-50`, `amber-50`, `red-50`, `green-50` — an arbitrary grab from the Tailwind default palette with no brand relationship. Replace with a curated warm sequence drawn only from the brand + accent + amber scale, e.g.: brand green, accent terracotta, amber, brand green (darker shade), accent terracotta (darker shade) — so all five tiles visually belong to one family instead of five random hues.

### Cards / list items (Customers, Orders, Subscriptions, Deliveries)
- `rounded-xl` → `rounded-2xl`, `border-slate-100` → `border-stone-100`, `shadow-sm` → `shadow-warm`.
- Status pills already use color-coded backgrounds (green/amber/red) — keep this pattern, just confirm the base pill shape (`rounded-full`) stays crisp/small against the now-larger-radius cards (contrast in shape scale, per §3.3).

### Buttons
- Primary buttons stay brand green, no change needed structurally.
- Add one secondary/outline button style using the new terracotta accent for "secondary but still important" actions (e.g. "Sửa" / edit actions currently styled as flat slate-100 buttons) — e.g. `border border-accent-300 text-accent-600 hover:bg-accent-50`.

### Empty & loading states
- Loading spinner: keep the brand-green spin ring, no change.
- Empty states: add the blob/texture from §3.5 behind the message, and warm up the copy slightly — e.g. "Chưa có đơn hàng" → "Chưa có đơn hàng nào — hãy tạo đơn đầu tiên nhé!" Keep it short; this is a tone nudge, not a rewrite of every string.

### Login page
Best candidate for the most Soumaki-like treatment since it's the one "hero" screen in an otherwise utilitarian app: cream background (already gradient-based, just retint from `brand-50 via-white to-brand-100` to `accent-50 via-[#FBF6ED] to-brand-50` so it reads warm-to-green instead of green-to-green — note `brand-50`/`brand-100` are now very pale near-white greens rather than mint, so the gradient will read as cream-to-off-white rather than cream-to-green; that's fine, it keeps the hero soft), add the blob/dot texture, set the "Fortify Kitchen" wordmark in `.font-display`. The logo badge (`bg-brand-500`) becomes a deep forest-green rounded square instead of bright green — keep white icon/text on it, contrast is excellent.

---

## 5. Systematic changes (do these first, they carry the most weight for the least effort)

In this order:

1. **`index.css`** — replace the `--color-brand-*` ramp with the new `#283828`-anchored values (§3.1), add the cream surface color, terracotta ramp, Nunito font variable, `.font-display`, `.shadow-warm`/`.shadow-warm-lg` utilities.
2. **`index.html`** — add Nunito to the Google Fonts link. (§3.2)
3. **Global find-and-replace**: `hover:bg-brand-600` → `hover:bg-brand-400` on every filled primary button (§3.1 note — hover must lighten now, not darken).
4. **Global find-and-replace**: `slate-` → `stone-` across every `.jsx` file in `src/pages` and `src/components`. This single change is responsible for a large part of the "cool corporate" feeling and costs almost nothing to do.
5. **Global find-and-replace**: `shadow-sm` → `shadow-warm`, and `shadow-lg`/`shadow-xl`/`shadow-2xl` → `shadow-warm-lg`.
6. **Global find-and-replace**: `rounded-2xl` → `rounded-3xl` on top-level cards/sections/modals only (not on small controls like inputs, pills, small buttons — check each match, don't blind-replace every `rounded-2xl` in the codebase since inputs also use it).
7. Add `lucide-react`, swap nav + section emoji icons per the mapping in §3.4.
8. Apply `.font-display` to page `<h1>`, KPI numbers, and modal titles.
9. Retint the Dashboard KPI tile colors per §4.
10. Retint the Login gradient + add texture per §4.

Steps 1–6 alone will make the app look meaningfully less generic even before touching icons or fonts — they're pure token/utility swaps with no new dependencies and no risk of breaking layout. Step 3 specifically is easy to miss and will make every button look broken/non-interactive on hover if skipped.

---

## 6. Guardrails — what NOT to do

- Don't turn every corner round and every shadow soft — keep small controls (buttons, pills, inputs) crisp; reserve the biggest radius/softest shadow for primary content cards. Uniform softness everywhere is just a different flavor of generic.
- Don't let terracotta creep past ~15% of any screen's color area — it's an accent, green is still the brand.
- Don't replace Inter everywhere — it's genuinely the right choice for tables, prices, and form inputs; Nunito is for display/heading moments only.
- Don't add heavy illustration or stock photography — this is an internal ops tool, not the customer-facing marketing site; the warmth should come from color, shape, and type, not imagery.
- Don't touch the pricing logic, Firestore calls, or routing while doing this pass — this is a pure visual/styling pass. Verify with `npm run build` after each step and don't move to the next step if the build breaks.

---

## 7. Definition of done

- [ ] `index.css` has the new `#283828`-anchored brand ramp, cream surface, terracotta ramp, Nunito variable, `.font-display`, `.shadow-warm(-lg)` utilities
- [ ] No filled button still has `hover:bg-brand-600` (must be `hover:bg-brand-400` or lighter)
- [ ] No `slate-` classes remain anywhere in `src/`
- [ ] No raw emoji used as nav or section-header iconography (informal emoji in copy/toasts is fine)
- [ ] Dashboard KPI tiles use only brand-green / terracotta / amber tones, not the Tailwind default blue/purple grab-bag
- [ ] Page titles, KPI numbers, and modal titles use `.font-display`; tables/inputs/body copy remain on Inter
- [ ] `npm run build` succeeds with no new warnings beyond the pre-existing chunk-size one
- [ ] A visual pass (screenshot or `npm run dev` + browser check) confirms: cream background, warm shadows, green primary + terracotta secondary, consistent icon set — and it no longer reads as a default Tailwind dashboard template
