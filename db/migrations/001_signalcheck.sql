-- Application data stays in a private schema, outside PostgREST's public tables.
-- JSON payloads preserve validated domain models; generated relational keys and
-- indexed material fields provide referential integrity and queryable evidence.
create schema if not exists signalcheck;
revoke all on schema signalcheck from public;

create table if not exists signalcheck.store_version (
  singleton boolean primary key default true check (singleton), version bigint not null default 0
);
insert into signalcheck.store_version(singleton) values(true) on conflict do nothing;

create table if not exists signalcheck.incidents (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  title text generated always as (payload->>'title') stored,
  incident_type text generated always as (payload->>'incidentType') stored,
  status text generated always as (payload->>'status') stored,
  severity text generated always as (payload->>'severity') stored,
  last_reported_at text generated always as (payload->>'lastReportedAt') stored,
  check (status in ('unverified','emerging','corroborated','conflicting','stale','resolved'))
);
create table if not exists signalcheck.reports (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  incident_id uuid generated always as ((payload->>'incidentId')::uuid) stored references signalcheck.incidents(id) deferrable initially deferred,
  source_type text generated always as (payload->>'sourceType') stored,
  independence_group text generated always as (payload->>'independenceGroup') stored,
  observed_at text generated always as (payload->>'observedAt') stored,
  analysis_status text generated always as (payload->>'analysisStatus') stored
);
create table if not exists signalcheck.claims (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  incident_id uuid generated always as ((payload->>'incidentId')::uuid) stored not null references signalcheck.incidents(id) deferrable initially deferred,
  report_id uuid generated always as ((payload->>'reportId')::uuid) stored not null references signalcheck.reports(id) deferrable initially deferred,
  category text generated always as (payload->>'category') stored,
  stance text generated always as (payload->>'stance') stored,
  firsthandness text generated always as (payload->>'firsthandness') stored,
  check (stance in ('support','deny','uncertain'))
);
create table if not exists signalcheck.claim_relations (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  claim_a_id uuid generated always as ((payload->>'claimAId')::uuid) stored not null references signalcheck.claims(id) deferrable initially deferred,
  claim_b_id uuid generated always as ((payload->>'claimBId')::uuid) stored not null references signalcheck.claims(id) deferrable initially deferred,
  relation text generated always as (payload->>'relation') stored,
  check (relation in ('supports','contradicts','updates'))
);
create table if not exists signalcheck.incident_status_history (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  incident_id uuid generated always as ((payload->>'incidentId')::uuid) stored not null references signalcheck.incidents(id) deferrable initially deferred,
  new_status text generated always as (payload->>'newStatus') stored
);
create table if not exists signalcheck.generated_alerts (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  incident_id uuid generated always as ((payload->>'incidentId')::uuid) stored not null references signalcheck.incidents(id) deferrable initially deferred,
  language text generated always as (payload->>'language') stored,
  format text generated always as (payload->>'format') stored
);
create table if not exists signalcheck.verification_requests (
  id uuid primary key, payload jsonb not null check (payload->>'id' = id::text),
  incident_id uuid generated always as ((payload->>'incidentId')::uuid) stored not null references signalcheck.incidents(id) deferrable initially deferred
);
create index if not exists signalcheck_incidents_status on signalcheck.incidents(status,last_reported_at);
create index if not exists signalcheck_reports_incident on signalcheck.reports(incident_id);
create index if not exists signalcheck_reports_independence on signalcheck.reports(independence_group);
create index if not exists signalcheck_claims_incident_category on signalcheck.claims(incident_id,category);
create index if not exists signalcheck_claims_report on signalcheck.claims(report_id);
create index if not exists signalcheck_history_incident on signalcheck.incident_status_history(incident_id);
create index if not exists signalcheck_relations_a on signalcheck.claim_relations(claim_a_id);
create index if not exists signalcheck_relations_b on signalcheck.claim_relations(claim_b_id);

-- No public raw-data policies: all access is through the protected server RPCs.
do $$ declare name text; begin
  foreach name in array array['store_version','incidents','reports','claims','claim_relations','incident_status_history','generated_alerts','verification_requests'] loop
    execute format('alter table signalcheck.%I enable row level security',name);
    execute format('revoke all on signalcheck.%I from public, anon, authenticated',name);
  end loop;
end $$;

create or replace function public.signalcheck_read_store() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version',v.version,'store',jsonb_build_object(
    'incidents',coalesce((select jsonb_agg(payload order by id) from signalcheck.incidents),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(payload order by id) from signalcheck.reports),'[]'::jsonb),
    'claims',coalesce((select jsonb_agg(payload order by id) from signalcheck.claims),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(payload order by id) from signalcheck.claim_relations),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(payload order by id) from signalcheck.incident_status_history),'[]'::jsonb),
    'alerts',coalesce((select jsonb_agg(payload order by id) from signalcheck.generated_alerts),'[]'::jsonb),
    'verifications',coalesce((select jsonb_agg(payload order by id) from signalcheck.verification_requests),'[]'::jsonb)
  )) from signalcheck.store_version v where singleton;
$$;

create or replace function public.signalcheck_commit_store(expected_version bigint,next_store jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_version bigint; item record;
begin
  -- Serialize the version check with the full transaction across every instance.
  select version into current_version from signalcheck.store_version where singleton for update;
  if current_version is distinct from expected_version then return false; end if;
  for item in select * from (values
    ('incidents','incidents'),('reports','reports'),('claims','claims'),
    ('claim_relations','relations'),('incident_status_history','history'),
    ('generated_alerts','alerts'),('verification_requests','verifications')
  ) as names(table_name,store_key) loop
    if jsonb_typeof(next_store->item.store_key) is distinct from 'array' then
      raise exception 'Invalid store collection';
    end if;
    -- Only changed/new records are written. All FK validation is transactional.
    execute format('insert into signalcheck.%I as existing (id,payload)
      select (value->>''id'')::uuid,value from jsonb_array_elements($1)
      on conflict (id) do update set payload=excluded.payload
      where existing.payload is distinct from excluded.payload',item.table_name)
      using next_store->item.store_key;
  end loop;
  for item in select * from (values
    ('claim_relations','relations'),('incident_status_history','history'),
    ('generated_alerts','alerts'),('verification_requests','verifications'),
    ('claims','claims'),('reports','reports'),('incidents','incidents')
  ) as names(table_name,store_key) loop
    execute format('delete from signalcheck.%I where id not in
      (select (value->>''id'')::uuid from jsonb_array_elements($1))',item.table_name)
      using next_store->item.store_key;
  end loop;
  update signalcheck.store_version set version=version+1 where singleton;
  return true;
end;
$$;
revoke all on function public.signalcheck_read_store() from public,anon,authenticated;
revoke all on function public.signalcheck_commit_store(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.signalcheck_read_store() to service_role;
grant execute on function public.signalcheck_commit_store(bigint,jsonb) to service_role;

-- Storage objects are private; server credentials upload/download after validation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('report-media','report-media',false,10485760,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','video/webm'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
notify pgrst, 'reload schema';
