#!/bin/bash

cd "$(dirname -- "$( readlink -f -- "$0"; )")"

curl -f -s "http://192.168.0.19/cgi-bin/onboot/?$(hostname)" | bash