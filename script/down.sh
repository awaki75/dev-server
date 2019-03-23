#!/bin/bash

set -eu
cd $(dirname $0)/..
eval "$(cat .env <(echo) <(declare -x))"
set -x

docker-compose down
