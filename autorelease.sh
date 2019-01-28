#!/usr/bin/env bash
CURRENT_VERSION=$(cat vstutils/__init__.py | grep __version__ | cut -d "=" -f2 | grep -oE "[0-9\.](\.dev[0-9]{1,2}){0,1}"| tr -d '\n')
TAG=$(git tag -l $CURRENT_VERSION)

if [ -z "${TAG}" ]; then
    echo "Creating new tag ${CURRENT_VERSION}.";
    git tag $CURRENT_VERSION;
    git push origin $CURRENT_VERSION;
else
    echo "Current release ${CURRENT_VERSION} already exists. Update version to release."
fi
