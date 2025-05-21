
# pg-altergen
[![npm version](https://badge.fury.io/js/pg-altergen.svg)](https://badge.fury.io/js/pg-altergen)

A Node.js CLI tool for managing PostgreSQL schema changes by organizing database objects in SQL files and generating ordered migration scripts with automatic dependency resolution.


https://github.com/user-attachments/assets/d6c869f5-6157-417b-8538-49d0fa24dcd7




❗❗❗ **IMPORTANT:** Always make backups for critical databases before running pg-altergen scripts! During the migration process, pg-altergen will drop existing objects and create new ones. ❗❗❗

pg-altergen is a Node.js CLI tool designed to help manage PostgreSQL schema changes in a structured manner. It allows you to organize your database objects (schemas, tables, views, functions, procedures, triggers, etc.) in separate SQL files and then compile them into a single “alter” script for easy migration to a target database. pg-altergen can also help detect and drop outdated objects before creating or updating them, ensuring that your database stays in sync with your desired definitions.

--------------------------------------------------------------------------------
## Table of Contents

1. [Features](#features)  
2. [Installation](#installation)  
3. [Project Structure & Concepts](#project-structure--concepts)  
   - [SQL Directory Structure](#sql-directory-structure)  
   - [Configuration File (altergen.json)](#configuration-file-altergenjson)  
4. [Workflow](#workflow)  
   - [1) Generate](#1-generate)  
   - [2) Migrate](#2-migrate)  
5. [Usage Examples](#usage-examples)  
6. [Troubleshooting](#troubleshooting)  
7. [License](#license)  
8. [Support and Contribution](#support-and-contribution)  

--------------------------------------------------------------------------------
## Features

• Automatically detects and organizes schemas, tables, views, functions, and procedures from your SQL source directories.  
• Compiles all discovered objects into an ordered “alter.sql” script to apply changes in a deterministic sequence.  
• Drops existing objects (views, functions, procedures, constraints, etc.) if desired, ensuring the final state matches your definitions.  
• Attempts to resolve or detect dependencies among views, functions, procedures, and more, so that dependent objects are created in the correct order.  
• Provides a basic binary search fallback on the “migrate” step to isolate queries if a bulk migration fails.  
• Customizable via a simple JSON configuration file (altergen.json).  

--------------------------------------------------------------------------------
## Installation

Install globally to use as a CLI tool, or locally within your Node.js project:

```bash
npm install -g pg-altergen
```

or

```bash
npm install --save-dev pg-altergen
```

--------------------------------------------------------------------------------
## Project Structure & Concepts

pg-altergen relies on a certain file structure convention to detect and sort your SQL objects. Once organized, it merges them into a single migration script.

### SQL Directory Structure

By default, pg-altergen looks for a directory (defined by "source_dir" in your config) containing subfolders named in ascending order. For example:

01_schemas  
02_tables  
03_views  
04_functions  
05_procedures  
06_triggers  
07_sequences  
08_types  
09_extensions  
10_inserts  
11_updates  

Each subfolder contains files for the corresponding database objects. For instance:  
• 01_schemas/public.sql  
• 02_tables/public.tbl_movie.sql  
• 03_views/public.view_reviews_info.sql  
• 04_functions/public.fn_insert_review.sql  
• 05_procedures/public.pr_update_review.sql  
… and so on.

You can also specify “additional_source_dirs” in your config if you want pg-altergen to scan multiple directories.  

### Configuration File (altergen.json)

Create an altergen.json in the root of your project (or specify a different file with --config when running pg-altergen). For example:

json 

```json 
{
"postgres": "postgres:postgres@localhost:5432/postgres",
"source_dir": "sql",
"additional_source_dirs": ["private/sql"],
"output_file": "alter.sql"
}
```




• postgres: Connection string without the “postgres://” prefix. (Alternatively, you can do "postgresql://user:password@host:port/dbname" style if you prefer as a CLI override.)  
• source_dir: The main directory to scan for DB object definitions.  
• additional_source_dirs: An array of additional fallback directories if needed. (During generate process, it will scan all directories and create alter script from the last file with the same name in all directories. Example: One directory contains base database structure and you want to extend it with some additional objects and don't want to alter the base structure.
• output_file: Name of the generated SQL file (defaults to “alter.sql”).  

--------------------------------------------------------------------------------
## Workflow

pg-altergen provides two main commands:  
1) generate  
2) migrate  

### 1) Generate

Scans your SQL files and generates a new “alter.sql” file with drop statements (for old constraints, views, functions, etc.) followed by create/alter statements in the correct order.  

Usage example:



```bash
npm install -g pg-altergen
or
npm install --save-dev pg-altergen
```

json
```json
{
"postgres": "postgres:postgres@localhost:5432/postgres",
"source_dir": "sql",
"additional_source_dirs": ["private/sql"],
"output_file": "alter.sql"
}
```

```bash
npx pg-altergen generate
```


### 2) Migrate
Migrate command will execute the generated alter.sql file and apply all changes to the database.

```bash
npx pg-altergen migrate
```


This command:  
1. Reads the “alter.sql” file.  
2. Splits it by “-- step” segments.  
3. Tries to execute the entire sequence.  
4. If it fails, attempts a binary search approach to isolate which step triggered the error, providing a more granular log.  

--------------------------------------------------------------------------------
## Usage Examples

Below is an example for a project named “filmdb”, which can be found in the “examples/filmdb” folder of this repository:


1. You have the following structure:  
   ├─ .vscode/tasks.json  
   ├─ altergen.json  
   ├─ docker-compose.yml  
   ├─ sql  
   │  ├─ 01_schemas  
   │  ├─ 02_tables  
   │  ├─ 03_views  
   │  ├─ 04_functions  
   │  ├─ 05_procedures  
   │  ├─ 06_triggers  
   │  ├─ 07_sequences  
   │  ├─ 08_types  
   │  ├─ 09_extensions  
   │  ├─ 10_inserts  
   │  └─ 11_updates  
   └─ ...other files  

You can try pg-altergen quickly by downloading just the examples directory. 

### 1. Using Git Sparse Checkout (Git 2.25+)
```bash
# Create directory and initialize
mkdir pg-altergen-examples
cd pg-altergen-examples
git init
git remote add origin https://github.com/Mrazbb/pg-altergen.git
git sparse-checkout init --cone
git sparse-checkout set examples
git pull origin main
```

### Run the Example
```bash
cd examples/filmdb
docker-compose up -d    # Starts PostgreSQL container
npm install  pg-altergen
npx pg-altergen generate    # Creates alter.sql from the SQL files
npx pg-altergen migrate     # Applies changes to the database
```

The filmdb example includes a complete movie database schema with tables for films, reviews, and ratings—perfect for seeing pg-altergen in action!

--------------------------------------------------------------------------------
## Troubleshooting

• If the migration fails and binary search does not narrow it down effectively, inspect “alter.sql” manually.  
• You can comment out or reorder certain statements if you suspect cyclical dependencies, then run “migrate” again.  
• ❗ **IMPORTANT:** Always make backups for critical production databases before running pg-altergen scripts! During the migration process, pg-altergen will drop existing objects and create new ones.

--------------------------------------------------------------------------------

## Support and Contribution

We welcome contributions and feedback from the community. If you need help using pg-altergen, or have suggestions for improvements, please:

1. Check out the existing [issues](../../issues) to see if your question or concern has already been raised.  
2. Open a new issue for bugs, feature requests, or other questions.  
3. Submit a pull request if you would like to contribute code improvements or new features.  
4. Contact the maintainer at info@marek-mraz.com for any urgent or confidential inquiries.

Your input helps make pg-altergen better for everyone!

--------------------------------------------------------------------------------

## License

pg-altergen is released under the [MIT License](https://opensource.org/licenses/MIT).  
© 2024 Marek Mráz <info@marek-mraz.com>

--------------------------------------------------------------------------------

Happy database versioning and migrations!



## 
Sample update/public.tbl_user.csv.json
```js
{
  // --- General Settings ---
  "table_name": "public.your_target_table",
  // Optional: Specifies the fully qualified target table name.
  // If omitted, it defaults to the CSV filename (e.g., "public.your_csv_file_name" or "your_csv_file_name").

  "mode": "conditional_upsert",
  // Required (defaults to "upsert" if omitted).
  // Defines the operation mode. Possible values:
  // - "upsert": Inserts new rows or updates existing ones based on "primary_key".
  // - "insert_only": Only inserts new rows. If a row with the same "primary_key" exists, it's skipped.
  // - "update_only": Only updates existing rows based on "primary_key". If no match, row is skipped.
  // - "conditional_upsert": Uses "lookup_keys" to find a row. If found, updates it using "update_target_key_column_db".
  //                         If not found, inserts a new row. Can also use "update_target_key_column_csv" if provided.

  "delete_missing_rows": true,
  // Optional (defaults to false).
  // If true, rows existing in the database but not present in the CSV (matched by "primary_key") will be deleted.
  // For this to work, "primary_key" must be defined.

  "primary_key": ["csv_id_column", "csv_type_column"],
  // Required for "upsert", "insert_only", "update_only" modes, and if "delete_missing_rows" is true.
  // An array of CSV header names that uniquely identify a row.
  // These CSV headers are used to build the ON CONFLICT target or WHERE clause.
  // Their corresponding database column names are derived from the "columns" mapping or by direct use of the header name.

  // --- Conditional Upsert Mode Specific Settings (ignored by other modes) ---
  "lookup_keys": ["email_in_csv", "external_reference_in_csv"],
  // Required for "conditional_upsert" mode if "update_target_key_column_csv" is not always provided in the CSV.
  // An array of CSV header names used to query the database to find an existing row.

  "update_target_key_column_db": "id",
  // Required for "conditional_upsert" mode.
  // The name of the database column (typically the primary key like "id" or "uuid")
  // that will be used in the WHERE clause of the UPDATE statement if a row is found via "lookup_keys"
  // or if "update_target_key_column_csv" provides a value.

  "update_target_key_column_csv": "csv_provides_db_id",
  // Optional for "conditional_upsert" mode.
  // A CSV header name. If this column in the CSV has a value, that value is assumed to be the
  // database key (for the column specified in "update_target_key_column_db") and is used directly to
  // check for row existence and for the UPDATE's WHERE clause, bypassing the "lookup_keys" search.

  // --- Column Mapping and Behavior ---
  "columns": {
    "csv_id_column": {
      "db_column": "table_pk_id", // Maps "csv_id_column" from CSV to "table_pk_id" in DB.
      "insert": true,             // This column's value will be included in INSERT statements.
      "update": false             // This column's value will NOT be included in UPDATE SET clauses. (Good for PKs)
    },
    "email_in_csv": {
      "db_column": "user_email",
      "insert": true,
      "update": true
    },
    "full_name_from_csv": {
      "db_column": "contact_name",
      "insert": true,
      "update": "if_not_null_in_csv" // Only update "contact_name" if "full_name_from_csv" is not null/empty in the CSV.
    },
    "status_flag": {
      // If "db_column" is omitted, it's assumed to be the same as the CSV header ("status_flag").
      "insert": true,
      "update": true
    },
    "notes_field": {
      "db_column": "description",
      "insert": true, // Note: 'if_not_null_in_csv' is NOT supported for 'insert' in your script, only boolean.
      "update": true
    },
    "column_to_ignore_in_csv": {
      "insert": false, // This CSV column will be ignored for INSERTs.
      "update": false  // This CSV column will be ignored for UPDATEs.
    },
    "csv_provides_db_id": { // This CSV column is used by "update_target_key_column_csv"
      "db_column": "id",  // It maps to the DB 'id' column
      "insert": true,     // If inserting and this CSV column has a value, it will be used for the 'id' column.
      "update": false     // Usually, the PK itself is not part of the SET clause in an update.
    }
    // If a CSV header is present in the CSV file but NOT listed here in "columns":
    // - Its "db_column" name will be the CSV header name.
    // - "insert" will default to true.
    // - "update" will default to true.
  },

  // --- Pre/Post Execution SQL ---
  "pre_execution_sql": [
    "LOCK TABLE public.your_target_table IN EXCLUSIVE MODE;",
    "SELECT fn_log_csv_processing_start('your_csv_file_name.csv');"
  ],
  // Optional: An array of SQL statements to be executed *before* any row processing from the CSV begins.

  "post_execution_sql": [
    "ANALYZE public.your_target_table;",
    "REFRESH MATERIALIZED VIEW CONCURRENTLY public.some_summary_view;",
    "SELECT fn_log_csv_processing_end('your_csv_file_name.csv');"
  ]
  // Optional: An array of SQL statements to be executed *after* all rows from the CSV have been processed
  // (and after "delete_missing_rows" if applicable).
}
```