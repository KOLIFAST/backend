create table if not exists users (
  id text not null primary key,
  phone text not null unique,
  profile_picture text not null default '',
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id text not null primary key,
  code text not null,
  generated_at timestamptz not null default now(),
  generated_for text not null,
  used boolean not null default false
);

create table if not exists sessions (
  id text not null primary key,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
