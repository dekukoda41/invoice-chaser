-- Invoice Chaser Database Schema
-- Run this in your Supabase SQL Editor

-- Enable extensions
create extension if not exists pgcrypto;

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

-- Clients
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text not null,
  whatsapp text,
  tone text default 'polite' check (tone in ('polite','firm','final')),
  created_at timestamptz default now()
);

-- Invoices
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  client_id uuid references public.clients on delete cascade not null,
  invoice_number text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status text default 'pending' check (status in ('pending','paid','overdue')),
  auto_follow_up boolean default true,
  last_reminder_sent timestamptz,
  reminder_count integer default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Follow-up log (audit trail of emails sent)
create table public.follow_up_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  invoice_id uuid references public.invoices on delete cascade not null,
  sent_at timestamptz default now(),
  reminder_stage text not null, -- 'day_1', 'day_7', 'day_14', 'manual'
  email_sent_to text not null,
  email_subject text not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.follow_up_logs enable row level security;

-- Policies: users can only see their own data
create policy "Users can view own profiles" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can manage own profiles" on public.profiles
  for all using (auth.uid() = id);

create policy "Users can view own clients" on public.clients
  for select using (auth.uid() = user_id);

create policy "Users can manage own clients" on public.clients
  for all using (auth.uid() = user_id);

create policy "Users can view own invoices" on public.invoices
  for select using (auth.uid() = user_id);

create policy "Users can manage own invoices" on public.invoices
  for all using (auth.uid() = user_id);

create policy "Users can view own follow-up logs" on public.follow_up_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own follow-up logs" on public.follow_up_logs
  for insert with check (auth.uid() = user_id);

-- Indexes for performance
create index idx_invoices_user_status on public.invoices(user_id, status);
create index idx_invoices_due_date on public.invoices(due_date);
create index idx_invoices_auto_follow_up on public.invoices(auto_follow_up) where status = 'pending';
create index idx_clients_user_id on public.clients(user_id);