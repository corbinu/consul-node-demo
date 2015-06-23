Consul Node Demo
===============

A sample application for Docker which runs a Node application which runs on Couchbase cluster running in another set of docker containers. It uses Consul for service discovery to discover the cluster.

It is based heavily on: [https://github.com/ToddGreenstein/try-cb-nodejs](https://github.com/ToddGreenstein/try-cb-nodejs). Much thanks to Todd and all the guys at Couchbase.

## Running

The easiest way to run is via the example here [https://github.com/corbinu/docker-demos/tree/master/simple-couchbase]](https://github.com/corbinu/docker-demos/tree/master/simple-couchbase)

## Development

Running for development can be done via
```
./start.sh
```

Which will bring up Consul, Couchbase and this app. This directory will be mounted in the container so edits can be made in the directory on the host.

To build any code changes run
```
npm run babel
```

Installing the database can be done via
```
demo-boostrap bootstrap
```

Restarting after changes simply requires
```
demo-boostrap
```

