#!/bin/bash

ARRAY=()

for arg in "$@"; do
  ARRAY+=$(systemctl show --no-page "${arg}" | jq --slurp --raw-input 'split("\n")
  | map(select(. != "")
  | split("=")
  | {"key": .[0], "value": (.[1:] | join("="))})
  | from_entries
  | {
      Id,
      Description,
      LoadState,
      ActiveState,
      UnitFileState,
      MemoryCurrent,
      IOReadBytes,
      IOWriteBytes,
      IOReadOperations,
      IOWriteOperations,
      CPUUsageNanos
    }')
done

printf "%s\n" "${ARRAY[@]}" | jq --slurp .