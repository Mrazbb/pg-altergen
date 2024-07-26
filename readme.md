## pg-altergen
**Warning**

This module can be really dangerous if you don't know what you are doing. The alter script always removes constraints, views, functions, and procedures and replaces them with definitions from files in the project structure.

This command creates an alter.sql script from files in the project.
``` pg-altergen generate --config altergen.json ```

This command migrates from the alter file defined as the output file in altergen.json.
``` pg-altergen migrate --config altergen.json ```

Simple command line tool to generate a compact alter script from individual files with tables, views, and functions definitions.