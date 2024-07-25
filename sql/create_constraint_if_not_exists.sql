
create or replace function create_constraint_if_not_exists ( t_name text, c_name text, constraint_sql text) 
returns void AS
$$
begin
    -- Look for our constraint
    if not exists (select constraint_name 
                   from information_schema.constraint_column_usage 
                   where  constraint_name = c_name) then
        execute constraint_sql;
    end if;
end;
$$ language 'plpgsql';