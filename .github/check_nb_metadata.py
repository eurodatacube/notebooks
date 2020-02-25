#!/usr/bin/env python

import json
import sys

filename = sys.argv[1]

properties = json.load(open(filename)).get('metadata', {}).get('properties', {})

required = {"id", "name", "description", "version", "tags", "license", "requirements"}

missing = required - properties.keys()

if missing:
    print(f"::error file={filename}::The following metadata is missing: {missing}")
    sys.exit(1)
else:
    print("All required metadata fields are present")
    sys.exit(0)
