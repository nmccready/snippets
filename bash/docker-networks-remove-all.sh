#!/bin/bash
docker network rm `docker network ls |  awk '{if(NR>1) print $1}'`
