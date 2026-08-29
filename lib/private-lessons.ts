import { getD1 } from "../db";

let schemaReady = false;

export async function ensurePrivateLessonSchema() {
  if (schemaReady) return;
  const db = getD1();

  await db.prepare(`
    create table if not exists private_lesson_slots (
      id serial primary key,
      tenant_id text not null,
      coach_id text not null,
      coach_name text not null,
      venue text not null,
      court text not null default '',
      start_at timestamptz not null,
      end_at timestamptz not null,
      price_pence integer not null default 0,
      status text not null default 'Available',
      court_source text not null default 'Manual',
      court_checked_at timestamptz not null default now(),
      court_confirmed_until timestamptz not null,
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `).run();

  await db.prepare(`
    create index if not exists private_lesson_slots_public_idx
    on private_lesson_slots (tenant_id, status, start_at)
  `).run();

  await db.prepare(`
    create table if not exists private_lesson_bookings (
      id serial primary key,
      tenant_id text not null,
      slot_id integer not null unique references private_lesson_slots(id) on delete restrict,
      player_name text not null,
      parent_name text not null default '',
      email text not null,
      phone text not null default '',
      notes text not null default '',
      status text not null default 'Confirmed',
      google_calendar_event_id text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `).run();

  await db.prepare(`
    create table if not exists coach_calendar_connections (
      id serial primary key,
      tenant_id text not null,
      coach_id text not null,
      google_email text not null default '',
      encrypted_refresh_token text not null default '',
      calendar_id text not null default 'primary',
      oauth_state text not null default '',
      connected_at timestamptz,
      updated_at timestamptz not null default now(),
      unique (tenant_id, coach_id)
    )
  `).run();

  schemaReady = true;
}

export type PrivateLessonSlot = {
  id:number; tenant_id:string; coach_id:string; coach_name:string; venue:string; court:string;
  start_at:string; end_at:string; price_pence:number; status:string; court_source:string;
  court_checked_at:string; court_confirmed_until:string; notes:string;
};

export type PrivateLessonBooking = {
  id:number; tenant_id:string; slot_id:number; player_name:string; parent_name:string;
  email:string; phone:string; notes:string; status:string; google_calendar_event_id:string;
};
