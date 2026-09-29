# CampusWallet — Setup Guide

> **College Finance Manager MVP**  
> Stack: Plain HTML + CSS + JS · Supabase (Auth + DB) · Netlify (Hosting)

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `campuswallet`) and a strong database password
3. Select a region closest to you (e.g. `Southeast Asia`)
4. Wait ~2 mins for the project to spin up

---

## Step 2 — Run the Database SQL

In your Supabase project → **SQL Editor** → paste and run this:

```sql
-- EXPENSES
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  amount      numeric(10,2) not null,
  category    text not null,
  description text,
  date        date not null,
  created_at  timestamptz default now()
);
alter table expenses enable row level security;
create policy "Users can manage own expenses" on expenses
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- BUDGETS
create table budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  month       int not null,
  year        int not null,
  amount      numeric(10,2) not null,
  created_at  timestamptz default now(),
  unique(user_id, month, year)
);
alter table budgets enable row level security;
create policy "Users can manage own budgets" on budgets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SAVINGS GOALS
create table savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  target_amount  numeric(10,2) not null,
  saved_amount   numeric(10,2) default 0,
  deadline       date,
  created_at     timestamptz default now()
);
alter table savings_goals enable row level security;
create policy "Users can manage own goals" on savings_goals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SPLITS
create table splits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  total_amount numeric(10,2) not null,
  created_at   timestamptz default now()
);
alter table splits enable row level security;
create policy "Users can manage own splits" on splits
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- SPLIT PARTICIPANTS
create table split_participants (
  id           uuid primary key default gen_random_uuid(),
  split_id     uuid references splits(id) on delete cascade not null,
  name         text not null,
  amount_owed  numeric(10,2) not null,
  paid         boolean default false
);
alter table split_participants enable row level security;
create policy "Users can manage split participants via splits" on split_participants
  using (
    exists (
      select 1 from splits s
      where s.id = split_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from splits s
      where s.id = split_id and s.user_id = auth.uid()
    )
  );
```

---

## Step 3 — Add Your Supabase Keys

1. In Supabase → **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Open [`js/config.js`](js/config.js) and replace:

```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';    // paste Project URL here
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'; // paste anon key here
```

> ⚠️ **Never commit real keys to a public GitHub repo.** For production, use Netlify environment variables.

---

## Step 4 — Enable Email Auth in Supabase

1. Supabase → **Authentication** → **Providers** → **Email** → Enable
2. (Optional) Disable email confirmation for easy testing:  
   Authentication → **Settings** → turn off **Confirm email**

---

## Step 5 — Deploy to Netlify

### Option A — Drag & Drop (fastest)
1. Go to [netlify.com](https://netlify.com) → Log in → **Add new site** → **Deploy manually**
2. Drag the entire `campuswallet/` folder into the drop zone
3. Done! Your site is live 🎉

### Option B — GitHub (recommended for updates)
1. Push `campuswallet/` to a GitHub repo
2. Netlify → **Add new site** → **Import from Git** → connect your repo
3. Build settings: leave blank (static site, no build command)
4. Click **Deploy site**

---

## Project Structure

```
campuswallet/
├── index.html           Landing page
├── login.html           Sign in / Sign up
├── dashboard.html       Budget overview + charts
├── transactions.html    Expense tracking
├── goals.html           Savings goals
├── split.html           Split bills
├── css/
│   └── style.css        All styles
├── js/
│   ├── config.js        Supabase client (edit this!)
│   ├── auth.js          Auth guard + utilities
│   ├── dashboard.js     Dashboard logic
│   ├── transactions.js  Expense CRUD
│   ├── goals.js         Goals CRUD
│   └── split.js         Split CRUD
└── netlify.toml         Netlify config
```

---

## Features (MVP)

| Feature | Page |
|---|---|
| 🏠 Landing / marketing page | `index.html` |
| 🔐 Sign up / Sign in | `login.html` |
| 📊 Dashboard with budget + charts | `dashboard.html` |
| 💸 Expense tracking by category | `transactions.html` |
| 🎯 Savings goals with progress | `goals.html` |
| 👥 Expense splitting | `split.html` |

---

## Future Plans

- 💰 Small income sources tracking
- 📱 PWA / mobile app
- 📧 Monthly spending reports via email
- 🔔 Budget alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML + CSS + JS |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres |
| Charts | Chart.js v4 |
| Hosting | Netlify |
| Fonts | Inter (Google Fonts) |
