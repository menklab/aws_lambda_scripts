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
 authentication
 domain
 repositories
 api
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
    authentication)
        pushd infrastructure/Authentication
        runServerless
        popd
        ;;

    domain)
        pushd Domain
        runServerless
        popd
        ;;

    repositories)
        pushd Repositories
        runServerless
        popd
        ;;

    permissions)
        pushd infrastructure/Permissions
        runServerless
        popd
        ;;

    # 1. create appsync first with ./sls api deploy-appsync ...
    # 2. update appsync after with ./sls api update-appsync ...
    api)
        pushd API
        eval "${PROJECT_ROOT}/node_modules/.bin/gql-merge -o schema.graphql GraphQL/**/*.graphqls"
        eval "${PROJECT_ROOT}/node_modules/.bin/gqlschema schema.graphql -i -o graphql.schema.json"
        runServerless
        popd
        ;;

    *)
        show_help
        exit 0

esac

