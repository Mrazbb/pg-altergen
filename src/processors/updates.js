const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Helper to load JSON config if it exists
async function load_csv_config(csv_file_path) {
  const config_path_json_ext = csv_file_path + ".json";
  const config_path_short_json = csv_file_path.replace(
    path.extname(csv_file_path),
    ".json",
  );
  let csv_config = {};

  if (fs.existsSync(config_path_json_ext)) {
    try {
      csv_config = JSON.parse(fs.readFileSync(config_path_json_ext, "utf8"));
    } catch (err) {
      console.warn(
        `Warning: Error parsing JSON config ${config_path_json_ext}: ${err.message}`,
      );
    }
  } else if (fs.existsSync(config_path_short_json)) {
    try {
      csv_config = JSON.parse(fs.readFileSync(config_path_short_json, "utf8"));
    } catch (err) {
      console.warn(
        `Warning: Error parsing JSON config ${config_path_short_json}: ${err.message}`,
      );
    }
  }
  return csv_config;
}

function generate_sql_value(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).toUpperCase() === "NULL"
  ) {
    return "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function generate_statements_from_csv(csv_file_path, default_table_name) {
  const csv_config = await load_csv_config(csv_file_path);

  const table_name = csv_config.table_name || default_table_name;
  const mode = csv_config.mode || "upsert";
  const delete_missing_rows = csv_config.delete_missing_rows || false;

  // Determine the effective key columns for operations, including delete_missing_rows
  let effective_keys_for_operation = []; // This will hold the CSV headers to use

  if (mode === "conditional_upsert") {
    if (delete_missing_rows) {
      if (csv_config.lookup_keys && csv_config.lookup_keys.length > 0) {
        effective_keys_for_operation = csv_config.lookup_keys;
      } else {
        console.warn(
          `[${table_name}] 'delete_missing_rows' is true for 'conditional_upsert' mode, but 'lookup_keys' are not defined in config. Deletion cannot be performed based on lookup_keys.`,
        );
        // delete_missing_rows will effectively be false for this run if lookup_keys are missing
      }
    }
    // For conditional_upsert, the main operation doesn't rely on a single "primary_key" in the same way,
    // so key_columns_for_operation (used by standard modes) isn't strictly needed for the upsert part itself.
  } else {
    // For 'upsert', 'insert_only', 'update_only'
    if (csv_config.primary_key && csv_config.primary_key.length > 0) {
      effective_keys_for_operation = csv_config.primary_key;
    } else {
      const table_meta =
        typeof MAIN !== "undefined" && MAIN.tables
          ? MAIN.tables.findItem("name", table_name)
          : null;
      if (
        table_meta &&
        table_meta.primary_keys &&
        table_meta.primary_keys.length > 0
      ) {
        effective_keys_for_operation = table_meta.primary_keys;
      } else {
        console.error(
          `Error (mode: ${mode}): No key columns (primary_key in JSON or from MAIN.tables) defined for table ${table_name}. Skipping ${csv_file_path}.`,
        );
        return [];
      }
    }
    if (effective_keys_for_operation.length === 0) {
      console.error(
        `Error: Critical (mode: ${mode}) - No key columns for operation on table ${table_name}. Cannot process ${csv_file_path}.`,
      );
      return [];
    }
  }
  // key_columns_for_operation is specifically for standard modes' ON CONFLICT/WHERE.
  // effective_keys_for_operation will be used for delete_missing_rows logic universally.
  const key_columns_for_standard_modes =
    mode !== "conditional_upsert" ? effective_keys_for_operation : [];

  return new Promise((resolve, reject) => {
    const csv_rows = [];
    let csv_headers = [];
    const sql_statements = [];
    // const present_key_values_in_csv = new Set(); // This Set might not be needed if we build the NOT IN list directly

    if (
      csv_config.pre_execution_sql &&
      Array.isArray(csv_config.pre_execution_sql)
    ) {
      sql_statements.push(...csv_config.pre_execution_sql);
    }

    fs.createReadStream(csv_file_path)
      .pipe(csv({ separator: ";" }))
      .on("headers", (hdrs) => {
        csv_headers = hdrs.map((h) => h.trim());
      })
      .on("data", (data) => {
        const row_data = {};
        csv_headers.forEach((col_header) => {
          row_data[col_header] =
            data[col_header] === "" ? null : data[col_header];
        });
        csv_rows.push(row_data);

        // No need to populate present_key_values_in_csv here anymore,
        // as we'll build the SQL NOT IN clause directly from csv_rows at the end.
      })
      .on("end", async () => {
        if (!csv_rows.length && !delete_missing_rows) {
          if (
            csv_config.post_execution_sql &&
            Array.isArray(csv_config.post_execution_sql)
          ) {
            sql_statements.push(...csv_config.post_execution_sql);
          }
          return resolve(sql_statements);
        }

        for (const row of csv_rows) {
          if (mode === "conditional_upsert") {
            // ... (conditional_upsert logic remains largely the same)
            // It uses csv_config.lookup_keys, update_target_db_col, etc. internally
            const lookup_keys_csv = csv_config.lookup_keys;
            const update_target_db_col = csv_config.update_target_key_column_db;
            const update_target_csv_header =
              csv_config.update_target_key_column_csv;

            if (!lookup_keys_csv || lookup_keys_csv.length === 0) {
              console.warn(
                `[${table_name}] Skipping row for conditional_upsert: 'lookup_keys' missing in config.`,
              );
              continue;
            }
            if (!update_target_db_col) {
              console.warn(
                `[${table_name}] Skipping row for conditional_upsert: 'update_target_key_column_db' missing in config.`,
              );
              continue;
            }

            const table_meta_for_type =
              typeof MAIN !== "undefined" && MAIN.tables
                ? MAIN.tables.findItem("name", table_name)
                : null;
            const target_col_meta = table_meta_for_type?.columns.find(
              (c) => c.name === update_target_db_col,
            );

            let actual_plpgsql_variable_type = "INTEGER";
            if (target_col_meta && target_col_meta.type) {
              const type_from_metadata = String(
                target_col_meta.type,
              ).toUpperCase();
              if (type_from_metadata === "SERIAL") {
                actual_plpgsql_variable_type = "INTEGER";
              } else if (type_from_metadata === "BIGSERIAL") {
                actual_plpgsql_variable_type = "BIGINT";
              } else if (type_from_metadata === "SMALLSERIAL") {
                actual_plpgsql_variable_type = "SMALLINT";
              } else {
                actual_plpgsql_variable_type = target_col_meta.type;
              }
            }

            let plpgsql_block = `DO $PG_ALTERGEN_BLOCK$\nDECLARE\n`;
            plpgsql_block += `  v_target_key_value ${actual_plpgsql_variable_type};\n`;
            plpgsql_block += `  v_row_exists BOOLEAN := FALSE;\n`;
            plpgsql_block += `BEGIN\n`;

            let provided_target_key_value = null;
            if (
              update_target_csv_header &&
              row[update_target_csv_header] !== null &&
              row[update_target_csv_header] !== undefined
            ) {
              provided_target_key_value = generate_sql_value(
                row[update_target_csv_header],
              );
              plpgsql_block += `  -- Target key value provided in CSV column '${update_target_csv_header}'.\n`;
              plpgsql_block += `  v_target_key_value := ${provided_target_key_value};\n`;
              plpgsql_block += `  SELECT TRUE INTO v_row_exists FROM ${table_name} WHERE "${update_target_db_col}" = v_target_key_value;\n`;
            } else {
              plpgsql_block += `  -- Looking up target key value using lookup_keys.\n`;
              const lookup_conditions = lookup_keys_csv
                .map((lk_csv_header) => {
                  const col_map_config = csv_config.columns
                    ? csv_config.columns[lk_csv_header]
                    : null;
                  const db_col_for_lookup =
                    col_map_config?.db_column || lk_csv_header;
                  return `"${db_col_for_lookup}" = ${generate_sql_value(row[lk_csv_header])}`;
                })
                .join(" AND ");
              plpgsql_block += `  SELECT "${update_target_db_col}" INTO v_target_key_value FROM ${table_name} WHERE ${lookup_conditions};\n`;
              plpgsql_block += `  IF FOUND THEN\n    v_row_exists := TRUE;\n  END IF;\n`;
            }

            plpgsql_block += `\n  IF v_row_exists THEN\n    -- Row found (or target key provided and exists), perform UPDATE.\n`;
            let update_set_parts = [];
            csv_headers.forEach((header) => {
              const col_map_config = csv_config.columns
                ? csv_config.columns[header] || {
                    db_column: header,
                    insert: true,
                    update: true,
                  }
                : { db_column: header, insert: true, update: true };
              const db_col_to_update = col_map_config.db_column || header;

              if (db_col_to_update === update_target_db_col) return;

              if (col_map_config.update) {
                const sql_val = generate_sql_value(row[header]);
                if (
                  col_map_config.update === "if_not_null_in_csv" &&
                  (row[header] === null || row[header] === undefined)
                ) {
                  // Skip
                } else {
                  update_set_parts.push(
                    `      "${db_col_to_update}" = ${sql_val}`,
                  );
                }
              }
            });
            if (update_set_parts.length > 0) {
              plpgsql_block += `    UPDATE ${table_name}\n    SET \n${update_set_parts.join(",\n")}\n    WHERE "${update_target_db_col}" = v_target_key_value;\n`;
            } else {
              plpgsql_block += `    -- No columns configured for update.\n`;
            }
            plpgsql_block += `  ELSE\n    -- Row not found by lookup_keys (or provided target key does not exist), perform INSERT.\n`;
            let insert_db_cols = [];
            let insert_csv_vals = [];
            csv_headers.forEach((header) => {
              const col_map_config = csv_config.columns
                ? csv_config.columns[header] || {
                    db_column: header,
                    insert: true,
                    update: true,
                  }
                : { db_column: header, insert: true, update: true };
              const db_col_to_insert = col_map_config.db_column || header;
              if (col_map_config.insert) {
                if (
                  header === update_target_csv_header &&
                  provided_target_key_value &&
                  db_col_to_insert === update_target_db_col
                ) {
                  insert_db_cols.push(`"${db_col_to_insert}"`);
                  insert_csv_vals.push(provided_target_key_value);
                } else if (
                  header !== update_target_csv_header ||
                  !provided_target_key_value
                ) {
                  insert_db_cols.push(`"${db_col_to_insert}"`);
                  insert_csv_vals.push(generate_sql_value(row[header]));
                }
              }
            });
            if (insert_db_cols.length > 0) {
              plpgsql_block += `    INSERT INTO ${table_name} (${insert_db_cols.join(", ")})\n    VALUES (${insert_csv_vals.join(", ")});\n`;
            } else {
              plpgsql_block += `    -- No columns configured for insert.\n`;
            }
            plpgsql_block += `  END IF;\n`;
            plpgsql_block += `END $PG_ALTERGEN_BLOCK$;`;
            sql_statements.push(plpgsql_block);
          } else {
            // Standard modes: 'upsert', 'insert_only', 'update_only'
            // Use key_columns_for_standard_modes here
            if (
              !key_columns_for_standard_modes ||
              key_columns_for_standard_modes.length === 0
            ) {
              console.warn(
                `[${table_name}] Skipping row for mode '${mode}' due to missing key_columns_for_standard_modes.`,
              );
              continue;
            }
            let insert_column_names = [];
            let insert_sql_values = [];
            let update_set_clauses_std = [];

            csv_headers.forEach((header) => {
              const column_config = csv_config.columns
                ? csv_config.columns[header] || {
                    db_column: header,
                    insert: true,
                    update: true,
                  }
                : { db_column: header, insert: true, update: true };
              const db_column_name = column_config.db_column || header;

              if (column_config.insert) {
                insert_column_names.push(`"${db_column_name}"`);
                insert_sql_values.push(generate_sql_value(row[header]));
              }

              if (
                column_config.update &&
                !key_columns_for_standard_modes.includes(header)
              ) {
                // header is CSV header here
                const sql_update_val = generate_sql_value(row[header]);
                if (
                  column_config.update === "if_not_null_in_csv" &&
                  (row[header] === null || row[header] === undefined)
                ) {
                  // Skip
                } else {
                  update_set_clauses_std.push(
                    `"${db_column_name}" = ${sql_update_val}`,
                  );
                }
              }
            });

            const conflict_target_columns_std = key_columns_for_standard_modes
              .map((k_csv_header) => {
                const col_map_config = csv_config.columns
                  ? csv_config.columns[k_csv_header]
                  : null;
                const db_col_for_conflict =
                  col_map_config?.db_column || k_csv_header;
                return `"${db_col_for_conflict}"`;
              })
              .join(", ");

            const where_pk_clauses_std = key_columns_for_standard_modes.map(
              (k_csv_header) => {
                const col_map_config = csv_config.columns
                  ? csv_config.columns[k_csv_header]
                  : null;
                const db_col_for_where =
                  col_map_config?.db_column || k_csv_header;
                return `"${db_col_for_where}" = ${generate_sql_value(row[k_csv_header])}`;
              },
            );

            if (mode === "insert_only" && insert_column_names.length > 0) {
              sql_statements.push(
                `INSERT INTO ${table_name} (${insert_column_names.join(", ")}) VALUES (${insert_sql_values.join(", ")}) ON CONFLICT (${conflict_target_columns_std}) DO NOTHING;`,
              );
            } else if (
              mode === "update_only" &&
              update_set_clauses_std.length > 0 &&
              where_pk_clauses_std.length > 0
            ) {
              sql_statements.push(
                `UPDATE ${table_name} SET ${update_set_clauses_std.join(", ")} WHERE ${where_pk_clauses_std.join(" AND ")};`,
              );
            } else if (mode === "upsert") {
              if (insert_column_names.length === 0) continue;

              let on_conflict_update_set = [];
              csv_headers.forEach((header) => {
                const column_config = csv_config.columns
                  ? csv_config.columns[header] || {
                      db_column: header,
                      insert: true,
                      update: true,
                    }
                  : { db_column: header, insert: true, update: true };
                const db_column_name = column_config.db_column || header;

                if (key_columns_for_standard_modes.includes(header)) return; // header is CSV header

                if (column_config.update) {
                  if (
                    column_config.update === "if_not_null_in_csv" &&
                    (row[header] === null || row[header] === undefined)
                  ) {
                    // Skip
                  } else {
                    on_conflict_update_set.push(
                      `"${db_column_name}" = EXCLUDED."${db_column_name}"`,
                    );
                  }
                }
              });

              if (on_conflict_update_set.length > 0) {
                sql_statements.push(
                  `INSERT INTO ${table_name} (${insert_column_names.join(", ")}) VALUES (${insert_sql_values.join(", ")}) ON CONFLICT (${conflict_target_columns_std}) DO UPDATE SET ${on_conflict_update_set.join(", ")};`,
                );
              } else {
                sql_statements.push(
                  `INSERT INTO ${table_name} (${insert_column_names.join(", ")}) VALUES (${insert_sql_values.join(", ")}) ON CONFLICT (${conflict_target_columns_std}) DO NOTHING;`,
                );
              }
            }
          }
        }

        // MODIFIED delete_missing_rows logic
        if (delete_missing_rows) {
          if (
            !effective_keys_for_operation ||
            effective_keys_for_operation.length === 0
          ) {
            // This warning is now more specific, e.g. if lookup_keys were missing for conditional_upsert.
            console.warn(
              `[${table_name}] Cannot perform delete_missing_rows: Effective key columns (primary_key or lookup_keys) are undefined or empty.`,
            );
          } else if (csv_rows.length > 0) {
            // Map CSV key headers to their corresponding DB column names
            const pk_db_columns_for_delete_sql = effective_keys_for_operation
              .map((k_csv_header) => {
                const col_map_config = csv_config.columns
                  ? csv_config.columns[k_csv_header]
                  : null;
                return `"${col_map_config?.db_column || k_csv_header}"`; // Use mapped DB column or CSV header
              })
              .join(", ");

            // For each CSV row, create a tuple of its key values
            const pk_tuples_for_sql = csv_rows
              .map(
                (r) =>
                  `(${effective_keys_for_operation.map((k_csv_header) => generate_sql_value(r[k_csv_header])).join(", ")})`,
              )
              .join(", ");

            sql_statements.push(`
            -- Deleting rows from ${table_name} not present in the CSV based on (${effective_keys_for_operation.join(", ")})
            DELETE FROM ${table_name}
            WHERE (${pk_db_columns_for_delete_sql}) NOT IN (VALUES ${pk_tuples_for_sql});`);
                      } else {
                        // CSV is empty, delete_missing_rows is true
                        sql_statements.push(`
            -- CSV is empty and delete_missing_rows is true: Deleting all rows from ${table_name}
            DELETE FROM ${table_name};`);
          }
        }

        if (
          csv_config.post_execution_sql &&
          Array.isArray(csv_config.post_execution_sql)
        ) {
          sql_statements.push(...csv_config.post_execution_sql);
        }
        resolve(sql_statements);
      })
      .on("error", (err) => {
        console.error(`Error reading CSV file: ${csv_file_path}`, err);
        reject(err);
      });
  });
}

async function generate(files) {
  // Check the config flag: config.update could be a boolean true or a string 'true'
  const shouldRunUpdates =
    config &&
    (config.update === true ||
      String(global.config.update).toLowerCase() === "true");

  if (!shouldRunUpdates) {
    console.log(
      "Skipping updates generation: 'config.update' is not set to true.",
    );
    return []; // Return empty array, no update statements to generate
  }

  let all_sql_statements = [];

  // 1. Create an array of objects with file path, resolved table name, and dependency order
  const files_with_table_info = files.map((file_path) => {
    if (path.extname(file_path).toLowerCase() !== ".csv") {
      // Assign a very high order so non-CSV files (if any passed) are effectively ignored or sorted last
      return {
        filePath: file_path,
        targetTableName: null,
        order: Infinity,
        isCsv: false,
      };
    }

    const base_name = path.basename(file_path, ".csv");
    let resolved_table_name = base_name; // Default if no schema in filename and not in MAIN.tables

    // Attempt to resolve the fully qualified table name
    if (typeof MAIN !== "undefined" && MAIN.tables) {
      // Check if base_name is already a fully qualified name (e.g., "schema.table")
      const table_meta_by_fqn = MAIN.tables.findItem("name", base_name);
      if (table_meta_by_fqn) {
        resolved_table_name = table_meta_by_fqn.name;
      } else {
        // Check if base_name is just a table name, try to find it and prepend schema
        const table_meta_by_tn = MAIN.tables.findItem("table_name", base_name);
        if (table_meta_by_tn && table_meta_by_tn.schema_name) {
          resolved_table_name = `${table_meta_by_tn.schema_name}.${table_meta_by_tn.table_name}`;
        } else if (!base_name.includes(".")) {
          // Default to public schema if not found and no schema in filename
          resolved_table_name = `public.${base_name}`;
        }
      }
    } else if (!base_name.includes(".")) {
      resolved_table_name = `public.${base_name}`;
    }

    let order = Infinity; // Default order for tables not found or if MAIN.tables is unavailable
    if (typeof MAIN !== "undefined" && MAIN.tables) {
      const table_in_main = MAIN.tables.findItem("name", resolved_table_name);
      if (table_in_main && typeof table_in_main.order === "number") {
        order = table_in_main.order;
      } else {
        // Optional: Warn if a CSV's table is not found or lacks order in MAIN.tables
        // console.warn(`Warning: Table ${resolved_table_name} (from ${file_path}) not found in MAIN.tables or has no order. Will be processed based on filename after ordered tables.`);
      }
    } else {
      // Optional: Warn if MAIN.tables is not available for sorting
      // console.warn("Warning: MAIN.tables not available for dependency-based sorting of CSV updates. Using alphabetical order as fallback.");
    }
    return {
      filePath: file_path,
      targetTableName: resolved_table_name,
      order: order,
      isCsv: true,
    };
  });

  // 2. Sort files: primarily by dependency order, secondarily by file path (for stability and fallback)
  files_with_table_info.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    // If orders are the same (e.g., both Infinity, or same dependency level), sort by file path
    if (a.filePath && b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    return 0; // Should not happen if filePaths are always present
  });

  // 3. Process sorted files
  for (const file_info of files_with_table_info) {
    if (!file_info.isCsv) {
      continue; // Skip non-CSV files
    }

    const file_path = file_info.filePath;
    const resolved_target_table_name = file_info.targetTableName;

    if (!resolved_target_table_name) {
      console.error(
        `Error: Could not determine target table for ${file_path} after sorting. Skipping.`,
      );
      all_sql_statements.push(
        `-- ERROR: Could not determine target table for ${file_path}. Skipping.`,
      );
      continue;
    }

    try {
      // Pass the already resolved table name to generate_statements_from_csv
      const file_statements = await generate_statements_from_csv(
        file_path,
        resolved_target_table_name,
      );
      let table_name_without_schema = resolved_target_table_name.split(".")[1];
      let schema_name = resolved_target_table_name.split(".")[0];

      all_sql_statements.push(
        `SELECT "altergen"."fn_reset_sequence_min"('${schema_name}', '${table_name_without_schema}', 'id', 100000);`,
      );

      if (file_statements.length > 0) {
        all_sql_statements.push(
          `-- Processing CSV: ${path.basename(file_path)} (Table: ${resolved_target_table_name}, Order: ${file_info.order === Infinity ? "N/A" : file_info.order})`,
        );

        const combined_sql_block_for_file =
          file_statements
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .join(";\n") + ";";

        all_sql_statements.push(combined_sql_block_for_file);
      }
    } catch (err) {
      console.error(`Failed to generate updates for ${file_path}:`, err);
      all_sql_statements.push(
        `-- ERROR: Failed to generate updates for ${file_path}: ${err.message}`,
      );
    }
  }

  return all_sql_statements;
}

module.exports = {
  generate,
};
