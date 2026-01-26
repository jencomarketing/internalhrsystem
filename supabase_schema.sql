
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- Storing as plain text per legacy requirement (Ideally use Supabase Auth)
  full_name text not null,
  position text,
  joining_date date not null,
  role text check (role in ('ADMIN', 'STAFF')),
  leave_adjustments jsonb default '{"annualLeaveAdjustment": 0, "replacementLeaveBalance": 0}'::jsonb,
  adjustment_logs jsonb default '[]'::jsonb,
  avatar_url text
);

-- 2. LEAVES TABLE
create table leaves (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  user_name text,
  type text,
  duration text,
  start_date date,
  end_date date,
  reason text,
  attachment_url text,
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  applied_at timestamptz default now()
);

-- 3. ATTENDANCE TABLE
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  location text,
  coordinates jsonb,
  status text
);

-- 4. CLAIMS TABLE
create table claims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  user_name text,
  work_date date,
  duration text,
  description text,
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  applied_at timestamptz default now()
);

-- 5. NOTIFICATIONS TABLE
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  message text,
  type text check (type in ('info', 'success', 'alert')),
  timestamp timestamptz default now(),
  is_read boolean default false,
  related_id text,
  related_type text
);

-- 6. SEED INITIAL DATA (Optional)
insert into users (username, password, full_name, position, joining_date, role)
values 
('admin', 'password', 'Jenco Admin', 'Director', '2020-01-01', 'ADMIN'),
('staff', 'password', 'Alex Tan', 'Marketing Exec', '2022-05-15', 'STAFF');
