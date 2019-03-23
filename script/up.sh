#!/bin/bash

set -eu
cd $(dirname $0)/..
eval "$(cat .env <(echo) <(declare -x))"
set -x

wait_for_cassandra() {
  until docker run --rm cassandra:2.1.21 cqlsh ${PR_DOCKER_HOST} -e "SELECT NOW() FROM system.local"; do
    sleep 10
  done
}

wait_for_elasticsearch() {
  until curl -m 3 "http://${PR_DOCKER_HOST}:9200/_cluster/health" | grep "\"status\":\"green\""; do
    sleep 10
  done
}

wait_for_redis() {
  until docker run --rm redis:3.2.12 redis-cli -h ${PR_DOCKER_HOST} ping; do
    sleep 10
  done
}

wait_for_application() {
  until curl -m 3 "http://${PR_DOCKER_HOST}:$1/$2/" -o /dev/null -w "%{http_code}\n" | grep 200; do
    sleep 10
  done
}

keyspace_exists() {
  if docker run --rm cassandra:2.1.21 cqlsh ${PR_DOCKER_HOST} -e "SELECT keyspace_name FROM system.schema_keyspaces WHERE keyspace_name = 'alice'" | grep alice; then
    return
  fi
  false
}

create_keyspace() {
  docker run --rm cassandra:2.1.21 cqlsh ${PR_DOCKER_HOST} -e "CREATE KEYSPACE IF NOT EXISTS alice WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 1 }"
}

docker-compose up -d cassandra elasticsearch redis
sleep 10
wait_for_cassandra
wait_for_elasticsearch
wait_for_redis

if keyspace_exists; then
  echo "keyspace already exists"
else
  create_keyspace
fi

docker-compose up -d nginx1 tomcat1
sleep 10
wait_for_application 8180 examples

docker-compose up -d nginx2 tomcat2
sleep 10
wait_for_application 8280 examples
