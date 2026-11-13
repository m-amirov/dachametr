---
name: research-data-integrity
description: "Use when collecting, importing, regenerating, validating or reviewing Wordstat, SERP, CSV, JSON and research evidence; prevent lossy Unicode, bad provenance and false numeric PASS."
---

# Research data integrity
1. Before touch: identify source bytes and evidence ID, input encoding, schema, CSV dialect, intended output. Never normalize irreversibly or replace U+FFFD with guessed letters.
2. Strict UTF-8 decode with explicit errors; reject U+FFFD, invalid UTF-8, accidental Windows-1251 mojibake, truncation, missing rows, duplicate keys and mixed row kinds. Preserve Cyrillic and numeric 0 vs unknown.
3. For Wordstat bind every measured row to raw observation: query/operator/region/period/frequency/source URL/check date/evidence id. `no_data` describes related rows only when schema says so. Do not sum wide+quotes+related rows.
4. For 24-month series validate unique query+operator+region+month, contiguous months; distinguish unavailable month from data extraction defect and record both as UNKNOWN until proven.
5. Save original source artifact privately if licensed/authorized, plus SHA/checksum, acquisition method and transformation. Published URL alone is NOT reproducible raw evidence; never commit cookies or user credentials.
6. Test strict read-write CSV roundtrip, malformed-byte fixtures, replacement characters, shuffled column ordering, number/unit and reference mismatch; regression RED on known bad fixture and GREEN on restored data.
7. Separate gate decision from evidence completeness; missing data is BLOCKED/UNKNOWN, not numeric 0, not PASS.
Exit: source-bound integrity validation on exact commit, evidence of checks and remaining unknowns.
