-- get current autovacuum settings (database wide)
select *
from pg_settings
where name like 'autovacuum%'


-- overall sinopsis of what tables have been autovacuumed with their counts
SELECT
  schemaname, relname,
  last_vacuum, last_autovacuum,
  vacuum_count, autovacuum_count  -- not available on 9.0 and earlier
FROM pg_stat_user_tables
where autovacuum_count > 0 or vacuum_count > 0;


-- http://dba.stackexchange.com/questions/35814/how-to-view-the-current-settings-of-autovacuum-in-postgres
select relname, reloptions, pg_namespace.nspname
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where relname like 'data%' and pg_namespace.nspname = 'public';

-- show all namespaces with hidden oid col
select oid, * from pg_namespace;


-- https://www.netiq.com/documentation/cloud-manager-2-5/ncm-install/data/vacuum.html
-- Modifying a specific schema.table's autovavuum settings to happen much more frequently.
-- Have no scale helps very large tables by default . Since:
-- PostgreSQL database tables are auto-vacuumed by default when 20% of the rows plus 50 rows are inserted, updated, or deleted. (autovacuum_vacuum_*)
-- Tables are auto-analyzed when a threshold is met for 10% of the rows plus 50 rows. (autovacuum_analyze_*)
ALTER TABLE novell.workload_cost SET (autovacuum_vacuum_scale_factor = 0.0);
ALTER TABLE novell.workload_cost SET (autovacuum_vacuum_threshold = 1000);
ALTER TABLE novell.workload_cost SET (autovacuum_analyze_scale_factor = 0.0);
ALTER TABLE novell.workload_cost SET (autovacuum_analyze_threshold = 1000);
