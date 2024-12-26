# Codebase Guidelines

This document provides an in-depth set of guidelines for contributing code that matches our project’s style and practices. Please follow these rules closely to maintain a consistent and cohesive codebase.

## Table of Contents
1. JavaScript Style
2. Filenames
3. Common Practices
4. Examples
5. Total.js
6. Using require()
7. CSS / Styles
8. UI Components / jComponent
9. SQL Scripts in Total.js
10. Folders/Files Structure

---

## 1. JavaScript Style

• Indentation: Use tabs (tab width 4) instead of spaces.  
• Semicolons: Always end statements with a semicolon.  
• Variable Declarations:  
  – Prefer var or let when defining variables within method scopes (avoid const there).  
  – For top-level imports (outside of functions), use const.  
• Strings: Always wrap short strings in single quotes ('...').  
• Whitespace: Remove unnecessary whitespace.  
• Loops: Prefer classic for-loops over Array.forEach() where possible.

### Conditionals

• If statements should be on multiple lines for clarity, except very simple inline checks:

    // GOOD:
    if (someValue)
        doSomething();

    // Also GOOD for inline short expression:
    someCondition && doSomething();

• Avoid braces if the block contains a single statement:

    // BAD:
    if (true) {
        doSomething();
    }

    // GOOD:
    if (true)
        doSomething();

### Function Declarations

Use semicolons after function expressions or assignments:

    // BAD:
    someobj.somefn = function() {
    }

    // GOOD:
    someobj.somefn = function() {
    };

Keep variable and function names meaningful, but concise.

---

## 2. Filenames

• Filenames must be all lowercase.  
• Use dashes (-) instead of underscores (_).  
• Examples:  
  – my-file.js  
  – app-controller.js  
  – user-profile.css  

---

## 3. Common Practices

• Use tabs (tab width 4) for indentation.  
• Remove all unnecessary whitespace.  
• Always end statements with a semicolon.  
• Avoid adding dependencies whenever possible—use built-in methods if you can.  
• Learn from existing project conventions (naming, structure, etc.).  

---

## 4. Examples

### Declaration & Formatting

    // BAD:
    var num=123;

    // GOOD:
    var num = 123;

    // BAD:
    var str = "Total.js";

    // GOOD:
    var str = 'Total.js';

### Semicolons

    // BAD:
    var a
    var b
    var c

    // GOOD:
    var a;
    var b;
    var c;

### Scoping & Constants

    // BAD:
    someobj.somefn = function() {
        const age = 30;
    };

    // GOOD:
    someobj.somefn = function() {
        var age = 30;
        // or let age = 30;
    };

---

## 5. Total.js

We often use Total.js as a foundation for various features:

• Keep variable or schema names consistent across all projects.  
• Common variable names:  
  – id, name, value, email  
  – arr (array of items), item (single object)  
  – dtcreated, dtupdated

### Schemas

• Schema names must be in plural form and typically begin with an uppercase letter.  
• Use UID() in places where we need a unique identifier.  

    // BAD:
    NEWSCHEMA('user', function(schema) {
        schema.define('name', 'Capitalize2(40)', true);
    });

    // GOOD:
    NEWSCHEMA('Users', function(schema) {
        schema.define('name', 'Capitalize2(40)', true);
    });

---

## 6. Using require()

• At the top level (outside functions), use const instead of var.  
• Capitalize the first letter of the variable receiving the require:

    // BAD:
    var path = require('path');

    // GOOD:
    const Path = require('path');

---

## 7. CSS / Styles

• Filenames should be all lowercase and use dashes (-) instead of underscores (_).  
• Keep styles succinct—remove unnecessary whitespace.  
• Use ' for strings rather than ".  
• Rely on Total.js auto-prefixing by including the /*auto*/ comment if needed.  
• Avoid preprocessors like LESS or SASS (Total.js has basic support for variables/nested selectors).

Example of CSS file structure:

    /*auto*/
    .myclass {
        color: #333;
        font-size: 14px;
    }

    .myclass > div {
        margin: 10px;
    }

---

## 8. UI Components / jComponent

• Keep all names in lowercase when creating plugins, components, etc.  
• Avoid deeply nested objects (limit to 2–3 levels).  
• Prefer meaningful, short variable names.  
• Keep the same variable or plugin name across projects if they do the same things.

### Plugin Example

    // BAD:
    PLUGIN('Name', function(plugin) {
        plugin.doSomething = function() {
        };
    });

    // GOOD:
    PLUGIN('name', function(exports) {
        exports.dosomething = function() {
        };
    });

### Component Example

    // BAD:
    COMPONENT('Name', function(com, settings) {
    });

    // GOOD:
    COMPONENT('name', function(self, config, cls) {
        // keep names: "self.", "config" and "cls"
    });

---

## 9. SQL Scripts in Total.js

• Table names and field names all lowercase.  
• Use tabs (4 spaces) for indentation.  
• Remove unnecessary whitespace, always end with a semicolon.  
• Avoid unnecessary type casting.  
• Keep scripts well-formatted and separated by object type.  
• Table names:
  – Start with tbl_ for standard tables (tbl_user, tbl_product).  
  – Use cl_ for codelist tables (cl_country, cl_type).  
• Views: Start with view_ (view_product).  
• Stored procedures: Start with sp_ (sp_user).  
• Functions: Start with fn_ (fn_calculate).  
• Field naming patterns:
  – Dates start with dt (dtcreated, dtupdated).  
  – Booleans start with is (isremoved, ispublished).  
  – Identifiers: id, userid, productid, etc.  
  – Use text type instead of varchar.  
  – Keep the same names across tables if they represent the same concept.  
• Field order recommendation:
  – Identifiers (id, user identifiers, etc.)  
  – Main fields (strings, core data)  
  – Numbers (counters, numeric values)  
  – Booleans (flags)  
  – Dates (dtcreated, dtupdated)

Sample structure:

    -- BAD:
    CREATE TABLE "public"."tbl_channel_message" (
        "channelid" varchar(25),
        "body" text,
        "id" varchar(25) NOT NULL,
        ...
        PRIMARY KEY ("id")
    );

    -- GOOD:
    CREATE TABLE "public"."tbl_channel_message" (

        -- IDENTIFIERS 
        "id" text NOT NULL,
        "userid" text,
        "channelid" text,
        "openplatformid" text,

        -- MAIN FIELDS
        "body" text,

        -- NUMBERS
        "countupdate" INT2 DEFAULT 0,

        -- BOOLEANS
        "ismobile" bool DEFAULT FALSE,
        ...

        -- DATES
        "dtupdated" timestamp,
        "dtcreated" timestamp DEFAULT timezone('utc'::text, now()),

        -- CONSTRAINTS
        CONSTRAINT ...
        ...

        PRIMARY KEY ("id")
    );

---

## 10. Folders/Files Structure

• Keep the file structure logical, grouping similar files together:  
  – /img/ for images  
  – /js/ for scripts  
  – /css/ for styles  
  – /fonts/ for fonts  
  – /videos/ for videos  

• Use dashes (-) in file or folder names instead of underscores (_).  
• Arrange SQL object types in separate folders:
  1. 01_schemas
  2. 02_tables
  3. 03_views
  4. 04_functions
  5. 05_procedures
  6. 06_triggers
  7. 07_sequences
  8. 08_types
  9. 09_extensions
  10. 10_inserts
  11. 11_updates