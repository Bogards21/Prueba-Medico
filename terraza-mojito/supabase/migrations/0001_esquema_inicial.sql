-- =============================================================================
-- Terraza Mojito — esquema inicial
-- Modelo del PRD §42. Ejecutar en el SQL Editor de Supabase.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null check (length(trim(first_name)) between 2 and 60),
  last_name           text not null check (length(trim(last_name)) between 2 and 60),
  -- 10 dígitos, ya normalizado por la aplicación (sin +52, sin separadores)
  phone               text not null check (phone ~ '^[0-9]{10}$'),
  email               text not null check (position('@' in email) > 1),
  marketing_consent   boolean not null default false,
  -- Fecha en que aceptó el aviso de privacidad; null = nunca lo aceptó
  privacy_accepted_at timestamptz,
  source              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- PRD §44: prevención de duplicados. El teléfono y el correo identifican a la
-- persona, así que son únicos y el código busca por ellos antes de insertar.
create unique index if not exists customers_phone_key on public.customers (phone);
create unique index if not exists customers_email_key on public.customers (lower(email));

-- -----------------------------------------------------------------------------
-- Reservas
-- -----------------------------------------------------------------------------
create table if not exists public.reservations (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers(id) on delete cascade,
  reservation_date date not null,
  reservation_time time not null,
  party_size       integer not null check (party_size between 1 and 30),
  occasion         text,
  special_requests text check (special_requests is null or length(special_requests) <= 300),
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','rejected','cancelled','completed','no_show')),
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  confirmed_at     timestamptz,
  cancelled_at     timestamptz,
  completed_at     timestamptz,

  -- RN-03: rechazar exige motivo. Se garantiza en la base, no solo en la app.
  constraint rechazo_con_motivo
    check (status <> 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0))
);

create index if not exists reservations_fecha_idx    on public.reservations (reservation_date, reservation_time);
create index if not exists reservations_status_idx   on public.reservations (status);
create index if not exists reservations_customer_idx on public.reservations (customer_id);

-- PRD §51: la misma persona no puede tener dos solicitudes vivas para el mismo
-- horario. El índice parcial deja fuera los estados terminales, de modo que sí
-- pueda volver a reservar tras una cancelación.
create unique index if not exists reservations_sin_duplicados
  on public.reservations (customer_id, reservation_date, reservation_time)
  where status in ('pending', 'confirmed');

-- -----------------------------------------------------------------------------
-- Historial de estados (RN-07)
-- -----------------------------------------------------------------------------
create table if not exists public.reservation_status_history (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid not null references public.reservations(id) on delete cascade,
  previous_status text,
  new_status      text not null,
  changed_by      text not null,
  created_at      timestamptz not null default now()
);

create index if not exists historial_reserva_idx
  on public.reservation_status_history (reservation_id, created_at);

-- -----------------------------------------------------------------------------
-- Notas internas (RN-06)
-- -----------------------------------------------------------------------------
create table if not exists public.customer_notes (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  author      text not null,
  note        text not null check (length(trim(note)) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists notas_cliente_idx on public.customer_notes (customer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Reglas de disponibilidad (RN-09)
-- Permiten cambiar horarios y capacidad sin volver a desplegar.
-- -----------------------------------------------------------------------------
create table if not exists public.availability_rules (
  id             uuid primary key default gen_random_uuid(),
  day_of_week    smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  opens_at       time,
  closes_at      time,
  slot_minutes   smallint not null default 30 check (slot_minutes in (15, 30, 60)),
  slot_capacity  smallint not null default 40 check (slot_capacity > 0),
  updated_at     timestamptz not null default now(),
  unique (day_of_week),
  -- Abierto y cerrado van juntos: o ambos con hora, o ambos nulos (día cerrado)
  constraint horario_coherente
    check ((opens_at is null) = (closes_at is null))
);

-- Fechas puntuales que anulan la regla semanal (feriados, eventos privados)
create table if not exists public.availability_overrides (
  id         uuid primary key default gen_random_uuid(),
  on_date    date not null unique,
  is_closed  boolean not null default true,
  opens_at   time,
  closes_at  time,
  reason     text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.tocar_updated_at();

drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at
  before update on public.reservations
  for each row execute function public.tocar_updated_at();

-- =============================================================================
-- Row Level Security
--
-- La aplicación accede con la service_role key desde el servidor, que ignora
-- RLS. Se activa igualmente y SIN políticas permisivas para que la anon key
-- —la que viaja al navegador— no pueda leer ni escribir nada: si alguien la
-- extrae del bundle, no obtiene acceso a datos personales de clientes.
-- =============================================================================
alter table public.customers                  enable row level security;
alter table public.reservations               enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.customer_notes             enable row level security;
alter table public.availability_rules         enable row level security;
alter table public.availability_overrides     enable row level security;

-- Los horarios sí son información pública: el sitio necesita mostrarlos.
drop policy if exists "horarios visibles para todos" on public.availability_rules;
create policy "horarios visibles para todos"
  on public.availability_rules for select
  to anon, authenticated
  using (true);

drop policy if exists "excepciones visibles para todos" on public.availability_overrides;
create policy "excepciones visibles para todos"
  on public.availability_overrides for select
  to anon, authenticated
  using (true);

-- =============================================================================
-- Horarios iniciales
--
-- ATENCIÓN: son provisionales. Sustituir por los horarios reales del negocio
-- antes de salir a producción — el PRD §14 prohíbe publicar datos inventados.
-- =============================================================================
insert into public.availability_rules (day_of_week, opens_at, closes_at) values
  (0, '13:00', '20:00'),
  (1, null,    null),
  (2, '17:00', '23:00'),
  (3, '17:00', '23:00'),
  (4, '17:00', '23:00'),
  (5, '17:00', '01:00'),
  (6, '13:00', '01:00')
on conflict (day_of_week) do nothing;
