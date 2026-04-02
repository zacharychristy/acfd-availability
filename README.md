# ACFD Availability System

Part-time staff availability submission and scheduling tool for **Ashland City Fire Department**.

---

## Features

- **Employee Submission** — Select available shifts (24-hr / AM / PM) for each day of the month. Autocompletes known names. Pre-fills prior submissions when revisiting.
- **Chief's Dashboard** — Filter availability by month, day, and shift. Export to CSV. Month-at-a-glance mini calendar with color-coded coverage density.
- **Real-time sync** — All submissions stored in Supabase and available instantly across all devices.
- **Offline fallback** — Works with localStorage if Supabase credentials are not configured (single-device mode).

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase (free — takes ~5 minutes)

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Create a new project (name it "acfd-availability" or similar).
3. Once created, go to **SQL Editor** and run the following:

```sql
create table availability (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  year_month   text not null,
  day          integer not null,
  shift_24     boolean default false,
  shift_am     boolean default false,
  shift_pm     boolean default false,
  submitted_at timestamptz default now(),
  unique(name, year_month, day)
);

alter table availability enable row level security;

create policy "public read"
  on availability for select using (true);

create policy "public insert"
  on availability for insert with check (true);

create policy "public update"
  on availability for update using (true);
```

4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment (Netlify — free)

The easiest way to get this online so all part-timers can access it from their phones:

1. Push this folder to a GitHub repository.
2. Go to [https://netlify.com](https://netlify.com) → **Add new site → Import from Git**.
3. Select your repo. Build settings are auto-detected (Vite).
4. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Netlify gives you a free URL (e.g. `acfd-availability.netlify.app`).

You can also set a custom domain if ACFD has one.

---

## Shift Types

| Code | Label | Hours |
|------|-------|-------|
| 24hr | 24-Hour | 7:00 AM – 7:00 AM (next day) |
| AM   | AM Shift | 7:00 AM – 7:00 PM |
| PM   | PM Shift | 7:00 PM – 7:00 AM |

---

## Project Structure

```
acfd-availability/
├── public/
│   └── acfd-logo.png        # Department seal
├── src/
│   ├── components/
│   │   ├── Header.jsx        # Top nav with logo + tab bar
│   │   ├── EmployeeView.jsx  # Shift calendar submission form
│   │   ├── ChiefView.jsx     # Dashboard with filters + mini calendar
│   │   └── Toast.jsx         # Notification system
│   ├── lib/
│   │   ├── data.js           # Data layer (Supabase + localStorage fallback)
│   │   ├── supabase.js       # Supabase client
│   │   └── utils.js          # Date helpers, shift constants
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css             # Global styles + ACFD color palette
├── .env.example              # Environment variable template
├── index.html
├── package.json
└── vite.config.js
```

---

## Color Palette

Derived from Engine 101 and the ACFD department seal:

| Variable | Value | Use |
|----------|-------|-----|
| `--lime` | `#a3cc00` | Primary accent, CTA buttons, active tabs |
| `--blue` | `#1a60b8` | Stripe accent, header decoration |
| `--bg`   | `#080a08` | Page background |
| `--surface` | `#101410` | Cards, inputs |

---

## Notes

- Supabase free tier supports up to 500MB storage and 50,000 monthly active users — more than enough for ACFD.
- The app does not require employee login. Name is entered manually each time, which matches the current no-friction workflow.
- If you want to add authentication (e.g. restricting the chief dashboard), Supabase Auth can be added with minimal changes.
- To add more employees to the autocomplete list, they simply need to submit once — their name is remembered.
