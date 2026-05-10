create extension if not exists pgcrypto;

do $$ begin
  create type public.order_status as enum (
    'pending',
    'in_progress',
    'ready',
    'delivered',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  business_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  status public.order_status not null default 'pending',
  total_value numeric(12, 2) not null default 0 check (total_value >= 0),
  advance_paid numeric(12, 2) not null default 0 check (advance_paid >= 0),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint advance_not_more_than_total check (advance_paid <= total_value)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  unit text not null,
  quantity numeric(12, 2) not null default 0,
  low_stock_threshold numeric(12, 2) not null default 0 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  change_amount numeric(12, 2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  report_data jsonb not null,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.archived_clients (
  id uuid primary key,
  name text not null,
  phone text not null,
  last_project_date date,
  report_id uuid references public.reports(id) on delete set null,
  tags text[] not null default '{}',
  summary_json jsonb not null default '{}'::jsonb
);

create index if not exists clients_name_idx on public.clients using gin (to_tsvector('simple', name));
create index if not exists orders_client_id_idx on public.orders (client_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_due_date_idx on public.orders (due_date);
create index if not exists inventory_items_name_idx on public.inventory_items using gin (to_tsvector('simple', name));
create index if not exists inventory_logs_item_id_idx on public.inventory_logs (item_id);
create index if not exists inventory_logs_created_at_idx on public.inventory_logs (created_at desc);
create index if not exists archived_clients_name_idx on public.archived_clients using gin (to_tsvector('simple', name));
create index if not exists archived_clients_phone_idx on public.archived_clients (phone);
create index if not exists archived_clients_last_project_date_idx on public.archived_clients (last_project_date desc);
create index if not exists reports_client_id_idx on public.reports (client_id);

alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.reports enable row level security;
alter table public.archived_clients enable row level security;

drop policy if exists "Prototype read clients" on public.clients;
drop policy if exists "Prototype insert clients" on public.clients;
drop policy if exists "Prototype delete clients" on public.clients;
drop policy if exists "Prototype read orders" on public.orders;
drop policy if exists "Prototype insert orders" on public.orders;
drop policy if exists "Prototype update orders" on public.orders;
drop policy if exists "Prototype delete orders" on public.orders;
drop policy if exists "Prototype read inventory items" on public.inventory_items;
drop policy if exists "Prototype insert inventory items" on public.inventory_items;
drop policy if exists "Prototype update inventory items" on public.inventory_items;
drop policy if exists "Prototype delete inventory items" on public.inventory_items;
drop policy if exists "Prototype read inventory logs" on public.inventory_logs;
drop policy if exists "Prototype insert inventory logs" on public.inventory_logs;
drop policy if exists "Prototype delete inventory logs" on public.inventory_logs;
drop policy if exists "Prototype read reports" on public.reports;
drop policy if exists "Prototype insert reports" on public.reports;
drop policy if exists "Prototype update reports" on public.reports;
drop policy if exists "Prototype delete reports" on public.reports;
drop policy if exists "Prototype read archived clients" on public.archived_clients;
drop policy if exists "Prototype insert archived clients" on public.archived_clients;
drop policy if exists "Prototype delete archived clients" on public.archived_clients;

create policy "Prototype read clients"
  on public.clients for select
  to anon, authenticated
  using (true);

create policy "Prototype insert clients"
  on public.clients for insert
  to anon, authenticated
  with check (true);

create policy "Prototype delete clients"
  on public.clients for delete
  to anon, authenticated
  using (true);

create policy "Prototype read orders"
  on public.orders for select
  to anon, authenticated
  using (true);

create policy "Prototype insert orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update orders"
  on public.orders for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete orders"
  on public.orders for delete
  to anon, authenticated
  using (true);

create policy "Prototype read inventory items"
  on public.inventory_items for select
  to anon, authenticated
  using (true);

create policy "Prototype insert inventory items"
  on public.inventory_items for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update inventory items"
  on public.inventory_items for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete inventory items"
  on public.inventory_items for delete
  to anon, authenticated
  using (true);

create policy "Prototype read inventory logs"
  on public.inventory_logs for select
  to anon, authenticated
  using (true);

create policy "Prototype insert inventory logs"
  on public.inventory_logs for insert
  to anon, authenticated
  with check (true);

create policy "Prototype delete inventory logs"
  on public.inventory_logs for delete
  to anon, authenticated
  using (true);

create policy "Prototype read reports"
  on public.reports for select
  to anon, authenticated
  using (true);

create policy "Prototype insert reports"
  on public.reports for insert
  to anon, authenticated
  with check (true);

create policy "Prototype update reports"
  on public.reports for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Prototype delete reports"
  on public.reports for delete
  to anon, authenticated
  using (true);

create policy "Prototype read archived clients"
  on public.archived_clients for select
  to anon, authenticated
  using (true);

create policy "Prototype insert archived clients"
  on public.archived_clients for insert
  to anon, authenticated
  with check (true);

create policy "Prototype delete archived clients"
  on public.archived_clients for delete
  to anon, authenticated
  using (true);
