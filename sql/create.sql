do $$
begin


  -- IMPORTANT: THIS SCRIPT RUNS **ALWAYS** AT STARTUP
  --            DO NOT PLACE ANYTHING IN HERE THAT IF RAN 
  --            MULTIPLE TIMES WOULD CREATE SIDE EFFECTS OR
  --            DUPLCIATE ROWS, EVERYTHING MUST CHECK IF IT
  --            ALREADY EXISTS!


  create extension if not exists pgcrypto;
  create extension if not exists "uuid-ossp";

  if not exists (select 1 from pg_type where typname = 'alpha_numeric') then
    create domain alpha_numeric as varchar(128) check (value ~ '^[A-z0-9\-]+$');
  end if;

  if not exists (select 1 from pg_type where typname = 'domain_name') then
    create domain domain_name as varchar(256) check (value ~ '^[A-z0-9\-.]+$');
  end if;

  if not exists (select 1 from pg_type where typname = 'url_path') then
    create domain url_path as varchar(256) check (value ~ '^[^"!$&''()*+,;=@]+$');
  end if;

  if not exists (select 1 from pg_type where typname = 'href') then
    create domain href as varchar(1024);
  end if;

  if not exists (select 1 from pg_type where typname = 'build_status') then
    create type build_status as enum('queued', 'pending', 'failed', 'succeeded', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_setup_status') then
    create type app_setup_status as enum('queued', 'pending', 'failed', 'succeeded', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'certificate_status') then
    create type certificate_status as enum('pending', 'rejected', 'processing', 'issued', 'revoked', 'canceled', 'needs_csr', 'needs_approval');
  end if;


  create table if not exists regions (
    region uuid not null primary key,
    name text not null,
    country text not null,
    description text not null,
    locale text not null,
    private_capable boolean not null default true,
    provider_name text not null,
    provider_region text not null,
    provider_availability_zones text not null default '',
    high_availability boolean not null default false,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deprecated boolean not null default false,
    deleted boolean not null default false
  );

  create table if not exists stacks (
    stack uuid not null primary key not null,
    region uuid references regions("region") not null,
    name text not null,
    beta boolean not null default false,
    "default" boolean not null default false,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deprecated boolean not null default false,
    deleted boolean not null default false
  );

  create table if not exists organizations (
    "org" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    name alpha_numeric not null,
    description text not null default '',
    deleted boolean not null default false
  );

  create table if not exists spaces (
    "space" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    name alpha_numeric not null,
    description text not null default '',
    tags text not null default '',
    stack uuid references stacks("stack") not null default 'ffa8cf57-768e-5214-82fe-fda3f19353f3',
    deleted boolean not null default false
  );

  create table if not exists apps (
    "app" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    name alpha_numeric not null,
    space uuid references spaces(space),
    org uuid references organizations(org),
    url href not null,
    disabled boolean NOT NULL default false,
    deleted boolean not null default false
  );

  create table if not exists app_setups (
    "app_setup" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    app uuid references apps(app) not null,
    status app_setup_status not null default 'pending',
    success_url text not null default '',
    failure_messages text,
    progress float not null default 0,
    deleted boolean not null default false
  );

  if not exists( SELECT NULL
              FROM INFORMATION_SCHEMA.COLUMNS
             WHERE table_name = 'app_setups'
               AND table_schema = 'public'
               AND column_name = 'status_messages')  then
    alter table app_setups add column status_messages text;
  end if;

  create table if not exists dyno_types (
    "dyno_type" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    name varchar(128) not null,
    price float not null,
    foreign_key varchar(2048) not null,
    active boolean not null default true,
    deleted boolean not null default false
  );

  create table if not exists features (
    app uuid references apps("app"),
    feature uuid not null,
    name varchar(1024) not null,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false,
    primary key (app, feature)
  );

  create table if not exists previews (
    preview uuid not null primary key,
    source uuid references apps("app"),
    target uuid references apps("app"),
    foreign_key varchar(1024),
    foreign_status_key varchar(1024),
    additional_info text,
    app_setup uuid references app_setups("app_setup"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists formations (
    "formation" uuid not null primary key,
    app uuid references apps("app"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    type alpha_numeric not null,
    command varchar(1024) null,
    quantity int not null,
    port int null,
    size varchar(128) null,
    price float not null default 6000,
    deleted boolean not null default false,
    healthcheck varchar(1024) null
  );

  create table if not exists formation_changes (
    "formation_change" uuid not null primary key,
    "formation" uuid references formations(formation),
    app uuid references apps("app"),
    created timestamptz not null default now(),
    type alpha_numeric not null,
    command varchar(1024) null,
    quantity int not null,
    port int null,
    size varchar(128) null,
    price float not null default 6000,
    healthcheck varchar(1024) null
  );

  create table if not exists authorizations (
    "authorization" uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    site href not null,
    state varchar(256),
    scopes varchar(256),
    user_id varchar(256) not null,
    username varchar(256),
    token varchar(1024) not null,
    expires timestamptz not null,
    invalid boolean default false,
    invalid_reason text not null default '',
    deleted boolean not null default false
  );

  create index if not exists authorizations_user_id_idx on authorizations (user_id);
  create index if not exists authorizations_created_idx on authorizations (created);

  create table if not exists auto_builds (
    auto_build uuid not null primary key,
    app uuid references apps("app"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    repo href,
    branch varchar(128),
    "authorization" uuid references authorizations("authorization"),
    wait_on_status_checks boolean,
    user_agent varchar(1024),
    validation_token varchar(128),
    deleted boolean not null default false
  );

  create index if not exists auto_builds_created_idx on auto_builds (created);

  create table if not exists builds (
    build uuid not null primary key,
    app uuid references apps("app"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    sha varchar(128) not null,
    checksum varchar(128) not null,
    logs text not null default '',
    app_logs text not null default '',
    size int not null default 0,
    url href not null default '',
    status build_status not null default 'unknown',
    status_checks_passed boolean null,
    repo href not null default '',
    branch varchar(128) not null default '',
    version varchar(128) not null default '',
    user_agent varchar(1024) not null default '',
    description text not null default '',
    message text,
    author varchar(1024),
    deleted boolean not null default false,
    auto_build uuid references auto_builds(auto_build),
    foreign_build_key varchar(128) not null default ''
  );

  create index if not exists builds_created_idx on builds (created);

  if not exists (select 1 from pg_type where typname = 'release_trigger') then
    create type release_trigger as enum('config_change', 'new_build', 'promotion', 'rollback', 'rebuild', 'formation_change', 'services_change', 'unknown');
  end if;

  if not exists (select 1 from pg_type where typname = 'release_status') then
    create type release_status as enum('queued', 'pending', 'failed', 'succeeded', 'unknown');
  end if;

  create table if not exists releases (
    release uuid not null primary key,
    app uuid references apps("app"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    build uuid references builds(build),
    logs text not null default '',
    app_logs text not null default '',
    status release_status not null default 'unknown',
    user_agent varchar(1024),
    description text not null default '',
    trigger release_trigger not null default 'unknown',
    trigger_notes text not null default '',
    version integer not null default 1,
    deleted boolean not null default false
  );

  create index if not exists releases_app_idx on releases (app);
  create index if not exists releases_created_idx on releases (created);
  create index if not exists releases_build_idx on releases (build);

  create table if not exists pipelines (
    pipeline uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    name alpha_numeric not null,
    description text not null default '',
    deleted boolean not null default false
  );

  create index if not exists pipeline_created_idx on pipelines (created);

  create table if not exists pipeline_couplings (
    pipeline_coupling uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    pipeline uuid references pipelines(pipeline),
    stage varchar(1024) not null,
    app uuid references apps(app),
    deleted boolean not null default false
  );

  create index if not exists pipeline_couplings_app_idx on pipeline_couplings (app);

  create table if not exists pipeline_promotions (
    pipeline_promotion uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    pipeline uuid references pipelines(pipeline),
    release uuid references releases(release),
    description text not null default '',
    user_agent varchar(1024),
    deleted boolean not null default false
  );

  create index if not exists pipeline_promotion_created_idx on pipeline_promotions (created);

  create table if not exists pipeline_promotion_targets (
    pipeline_promotion_target uuid not null primary key,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    pipeline_promotion uuid references pipeline_promotions(pipeline_promotion),
    release uuid references releases(release),
    app uuid references apps(app),
    error varchar(2048) default '',
    deleted boolean not null default false
  );

  create table if not exists services (
    service uuid not null primary key,
    addon uuid not null,
    addon_name varchar(128) not null,
    plan uuid not null,
    plan_name varchar(128) not null,
    price float not null,
    foreign_key varchar(2048) not null,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists service_attachments (
    service_attachment uuid not null primary key,
    service uuid references services("service"),
    name varchar(128) not null,
    app uuid references apps("app"),
    owned boolean not null default false,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists plugins (
    plugin uuid not null primary key,
    name varchar(128) not null,
    description text not null,
    owner text null,
    email text null,
    repo text not null,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists certificates (
    certificate uuid not null primary key,
    name varchar(256) not null,
    request uuid not null,
    status certificate_status,
    created_by varchar(256),
    comments varchar(2048),
    org uuid references organizations("org"),
    installed boolean not null default false,
    region uuid references regions("region") not null default 'f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3',
    issued timestamptz,
    expires timestamptz,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists sites (
    site uuid not null primary key,
    "domain" domain_name not null,
    certificate uuid references certificates("certificate") null,
    region uuid references regions("region") not null default 'f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3',
    preview uuid references previews("preview") null,
    tags text NOT NULL default '',
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists routes (
    route uuid not null primary key,
    app uuid references apps("app"),
    site uuid references sites("site"),
    source_path url_path not null,
    target_path url_path not null,
    pending boolean not null default false,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists certificate_domain_names (
    certificate_domain_name uuid not null primary key,
    certificate uuid references certificates("certificate"),
    name varchar(256) not null,
    common_name boolean not null default false
  );

  create table if not exists hooks (
    hook uuid not null primary key,
    events text,
    app uuid references apps("app"),
    url href not null,
    secret varchar(128) not null,
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    active boolean not null default false,
    deleted boolean not null default false
  );

  create table if not exists hook_results (
    hook_result uuid not null primary key,
    hook uuid references hooks("hook"),
    events text,
    url href not null,
    response_code int not null,
    response_headers text,
    response_body text,
    payload_headers text,
    payload_body text,
    created timestamptz not null default now(),
    deleted boolean not null default false
  );

  create table if not exists favorites (
    favorite uuid not null primary key,
    username text,
    app uuid references apps("app"),
    created timestamptz not null default now(),
    updated timestamptz not null default now(),
    deleted boolean not null default false
  );

  create index if not exists favorites_username_i on favorites (username);
  create unique index if not exists favorites_username_ux on favorites (app, username);

  -- create default regions and stacks
  if (select count(*) from regions where deleted = false) = 0 then
    insert into regions 
      (region, name, country, description, locale, private_capable, provider_name, provider_region, provider_availability_zones, high_availability, created, updated, deprecated, deleted) 
    values 
      ('f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3', 'us-seattle', 'United States', 'US West Coast', 'seattle', true, 'amazon-web-services', 'us-west-2', 'us-west-2a, us-west-2b', true, '2016-08-25 12:51:09.371629', now(), false, false);
  end if;

  if (select count(*) from stacks where deleted = false) = 0 then 
    insert into stacks
      (stack, region, name, beta, "default", created, updated, deprecated, deleted)
    values
      ('ffa8cf57-768e-5214-82fe-fda3f19353f3', 'f5f1d4d9-aa4a-12aa-bec3-d44af53b59e3', 'ds1', false, true, '2016-08-25 12:51:09.371629', now(), false, false);
  end if;

  -- create default api and bootstrap data.
  if (select count(*) from apps where name='api' and deleted = false) = 0 then
    insert into organizations ( org, name ) values ( '0b26ccb5-83cc-4d33-a01f-100c383e0064', 'main');
    insert into organizations ( org, name ) values ( '0b26ccb5-83cc-4d33-a01f-100c383e0065', 'test');
    insert into organizations ( org, name ) values ( '0b26ccb5-83cc-4d33-a01f-100c383e0066', 'alamo');
    insert into spaces ( space, name, tags, stack ) values ( '565c9b0c-986e-455b-93c8-a146d8d49132', 'default', 'compliance=socs', 'ffa8cf57-768e-5214-82fe-fda3f19353f3');
    insert into apps ( app, name, space, org, url ) values
      ( 'fa2b535d-de4d-4a14-be36-d44af53b59e3', 'api',
        '565c9b0c-986e-455b-93c8-a146d8d49132', '0b26ccb5-83cc-4d33-a01f-100c383e0064', 'https://api.abcd.abcd.io' );
    insert into formations ( formation, app, type, quantity, port, size, price ) values
      ( 'fa2b535d-de4d-4a14-be36-d44af53b5955', 'fa2b535d-de4d-4a14-be36-d44af53b59e3', 'web', 1, 5000, 'constellation', 6000 );
    insert into formation_changes ( formation_change, formation, app, type, quantity, port, size, price ) values
      ( 'fa2b535d-de4d-4a14-be36-d44af53b5977', 'fa2b535d-de4d-4a14-be36-d44af53b5955', 'fa2b535d-de4d-4a14-be36-d44af53b59e3',
        'web', 1, 5000, 'constellation', 6000 );
    insert into builds values
      ('9ec219f0-9227-47cb-b570-f996d50b980a','fa2b535d-de4d-4a14-be36-d44af53b59e3','2016-08-25 12:48:38.896000','2016-08-25 12:51:09.371629',
        '123456','sha256:93f16649a03d37aef081dfec3c2fecfa41bb22dd45de2b79f32dcda83bd69bcf','','',0,'',
        'succeeded',true,'repo','master','v1.0','curl/7.43.0','jenkins','message','author', false, NULL, 107);
    insert into releases (release, app, build, user_agent) values
      ('52ef1ccc-de5d-4453-816b-bce5fb1cc8a5',
       'fa2b535d-de4d-4a14-be36-d44af53b59e3', '9ec219f0-9227-47cb-b570-f996d50b980a', 'Chrome');
  end if;


  -- Transitions in data structures, this should go through one iteration,
  -- ensure any alterations happen on the OBJECT ABOVE AS WELL! Otherwise
  -- when these are periodically removed it won't happen on new installations.
  if not exists (SELECT NULL 
              FROM INFORMATION_SCHEMA.COLUMNS
             WHERE table_name = 'routes'
              AND column_name = 'pending'
              and table_schema = 'public') then
    alter table routes add column pending boolean not null default false;
  end if;

  if exists (SELECT 1 
              FROM INFORMATION_SCHEMA.COLUMNS
             WHERE table_name = 'builds'
              AND column_name = 'message'
              and character_maximum_length = 1024
              and data_type = 'character varying') then
    alter table builds alter column message type text using message::text;
  end if;

end
$$;
