#!/bin/bash


function runServerless {
    cmd="${PROJECT_ROOT}/node_modules/.bin/serverless ${VARS}"
    eval ${cmd}
}

function show_help {
    cat << EOF
A helper script to run serverless service stacks from their location
sls <serverless service> [options]
options:
 admin
 cloudwatch
EOF
    exit 0
}



SERVERLESS=""
PROJECT_ROOT=`pwd`
ACTION=$1
VARS=${@:2}

# check args
while getopts "h?" opt; do
    case "$opt" in
    h|\?)
        show_help
        exit 0
        ;;
    esac
done

if [ -z "$1" ]; then
   show_helpser
fi


# get action and so what is needed
case "${ACTION}" in

    # only used for first deploy

    admin)
#        pushd ./
        runServerless
#        popd
        ;;

    cloudwatch)
        pushd ./cloudwatch
        runServerless
        popd
        ;;

    static-website)
        pushd ./static-website
        runServerless
        popd
        ;;

    *)
        show_help
        exit 0

esac

