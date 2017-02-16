SELECT pid, query, usename, query_start, state, age(now(),query_start), application_name  FROM pg_stat_activity
where age(now(),query_start) is not null
order by age desc;
