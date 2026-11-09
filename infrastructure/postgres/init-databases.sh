#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -c "CREATE DATABASE milk_epr_test OWNER \"$POSTGRES_USER\";"
