#!/bin/bash

PREFIX=cnd

export DOCKER_CLIENT_TIMEOUT=300

BOOT2DOCKER=$(docker info | grep boot2docker)
if [[ $BOOT2DOCKER && ${BOOT2DOCKER-x} ]]
    then
    export DOCKER_TYPE="boot2docker"
else
    SDC=$(docker info | grep SmartDataCenter)
    if [[ $SDC && ${SDC-x} ]]
        then
        export DOCKER_TYPE="sdc"
    else
        export DOCKER_TYPE="default"
    fi
fi

echo 'Starting Couchbase cluster'

echo
echo 'Pulling the most recent images'
docker-compose pull

echo
echo 'Starting containers'
docker-compose --project-name=$PREFIX up -d --no-recreate --timeout=500

echo
echo -n 'Initilizing cluster.'

sleep 1.3
COUCHBASERESPONSIVE=0
while [ $COUCHBASERESPONSIVE != 1 ]; do
    echo -n '.'

    RUNNING=$(docker inspect "$PREFIX"_couchbase_1 | json -a State.Running)
    if [ "$RUNNING" == "true" ]
    then
        docker exec -it "$PREFIX"_couchbase_1 couchbase-bootstrap bootstrap
        let COUCHBASERESPONSIVE=1
    else
        sleep 1.3
    fi
done
echo

sleep 1.3
DEMORESPONSIVE=0
while [ $DEMORESPONSIVE != 1 ]; do
    echo -n '.'

    RUNNING=$(docker inspect "$PREFIX"_demo_1 | json -a State.Running)
    if [ "$RUNNING" == "true" ]
    then
        docker exec -it "$PREFIX"_demo_1 demo-bootstrap setup
        let DEMORESPONSIVE=1
    else
        sleep 1.3
    fi
done
echo

if [ $DOCKER_TYPE = 'sdc' ]
    then
    DEMOIP="$(sdc-listmachines | json -aH -c "'"$PREFIX"_demo_1' == this.name" ips.1)"
    DEMOPORT="3000"
    CBIP="$(sdc-listmachines | json -aH -c "'"$PREFIX"_couchbase_1' == this.name" ips.0)"
    CBPORT="8091"
else
    CBPORT=$(docker inspect --format='{{(index (index .NetworkSettings.Ports "8091/tcp") 0).HostPort}}' "$PREFIX"_couchbase_1)
    DEMOPORT=$(docker inspect --format='{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}' "$PREFIX"_demo_1)
    if [ $DOCKER_TYPE = 'boot2docker' ]
        then
        CBIP=$(boot2docker ip)
        DEMOIP=$(boot2docker ip)
    else
        CBIP="localhost"
        DEMOIP="localhost"
    fi
fi
CBDASHBOARD="$CBIP:$CBPORT"
DEMO="$DEMOIP:$DEMOPORT"

echo
echo 'Couchbase cluster running and bootstrapped'
echo "Dashboard: $CBDASHBOARD"
echo "username=Administrator"
echo "password=password"
`open http://$CBDASHBOARD/index.html#sec=servers`

echo
echo 'Demo should be coming up'
echo "UI: $DEMO"
`open http://$DEMO`

docker exec -it "$PREFIX"_demo_1 /bin/bash demo-bootstrap develop
