/**
 * Data layer for ACFD Availability.
 * When Supabase is configured, all reads/writes go to the cloud.
 * When running without credentials, falls back to localStorage so the app
 * still works locally (useful for testing before Supabase is set up).
 *
 * Supabase table schema (run this SQL in the Supabase SQL editor):
 *
 *   create table availability (
 *     id          uuid primary key default gen_random_uuid(),
 *     name        text not null,
 *     year_month  text not null,          -- 'YYYY-MM'
 *     day         integer not null,       -- 1-31
 *     shift_24    boolean default false,
 *     shift_am    boolean default false,
 *     shift_pm    boolean default false,
 *     submitted_at timestamptz default now(),
 *     unique(name, year_month, day)
 *   );
 *
 *   -- Enable Row Level Security (RLS) then add these policies:
 *   alter table availability enable row level security;
 *
 *   -- Anyone can read (chiefs viewing dashboard)
 *   create policy "public read" on availability for select using (true);
 *
 *   -- Anyone can insert/update (employees submitting availability)
 *   create policy "public write" on availability for insert with check (true);
 *   create policy "public update" on availability for update using (true);
 */

import { supabase } from './supabase.js'

const LS_KEY = 'acfd_availability_v2'
const LS_NAMES_KEY = 'acfd_names_v1'

// ─── localStorage helpers ──────────────────────────────────────────────────

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function lsSet(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}
function lsGetNames() {
  try { return JSON.parse(localStorage.getItem(LS_NAMES_KEY) || '[]') } catch { return [] }
}
function lsSetNames(names) {
  localStorage.setItem(LS_NAMES_KEY, JSON.stringify(names))
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Submit or update a single employee's availability for a full month.
 * @param {string} name
 * @param {string} yearMonth  - 'YYYY-MM'
 * @param {Object} selections - { [day]: { s24, am, pm } }
 */
export async function submitAvailability(name, yearMonth, selections) {
  if (supabase) {
    // Build upsert rows for every day that has at least one shift selected
    const rows = Object.entries(selections)
      .filter(([, v]) => v.s24 || v.am || v.pm)
      .map(([day, v]) => ({
        name,
        year_month: yearMonth,
        day: parseInt(day),
        shift_24: v.s24,
        shift_am: v.am,
        shift_pm: v.pm,
      }))

    if (!rows.length) return { error: null }

    const { error } = await supabase
      .from('availability')
      .upsert(rows, { onConflict: 'name,year_month,day' })

    return { error }
  } else {
    // localStorage fallback
    const data = lsGet()
    if (!data[yearMonth]) data[yearMonth] = {}
    data[yearMonth][name] = JSON.parse(JSON.stringify(selections))
    lsSet(data)

    const names = lsGetNames()
    if (!names.includes(name)) { names.push(name); names.sort(); lsSetNames(names) }

    return { error: null }
  }
}

/**
 * Fetch all availability records for a given month.
 * Returns: { [name]: { [day]: { s24, am, pm } } }
 */
export async function fetchMonthAvailability(yearMonth) {
  if (supabase) {
    const { data, error } = await supabase
      .from('availability')
      .select('name,day,shift_24,shift_am,shift_pm')
      .eq('year_month', yearMonth)

    if (error) return { data: {}, error }

    const result = {}
    for (const row of data) {
      if (!result[row.name]) result[row.name] = {}
      result[row.name][row.day] = {
        s24: row.shift_24,
        am: row.shift_am,
        pm: row.shift_pm,
      }
    }
    return { data: result, error: null }
  } else {
    const all = lsGet()
    return { data: all[yearMonth] || {}, error: null }
  }
}

/**
 * Fetch all known employee names (for autocomplete).
 */
export async function fetchKnownNames() {
  if (supabase) {
    const { data, error } = await supabase
      .from('availability')
      .select('name')

    if (error) return []
    const unique = [...new Set(data.map(r => r.name))].sort()
    return unique
  } else {
    return lsGetNames()
  }
}

/**
 * Fetch existing submissions for a specific employee + month (for pre-filling the form).
 */
export async function fetchEmployeeMonth(name, yearMonth) {
  if (supabase) {
    const { data, error } = await supabase
      .from('availability')
      .select('day,shift_24,shift_am,shift_pm')
      .eq('name', name)
      .eq('year_month', yearMonth)

    if (error || !data) return {}

    const result = {}
    for (const row of data) {
      result[row.day] = { s24: row.shift_24, am: row.shift_am, pm: row.shift_pm }
    }
    return result
  } else {
    const all = lsGet()
    return (all[yearMonth] && all[yearMonth][name]) ? all[yearMonth][name] : {}
  }
}
