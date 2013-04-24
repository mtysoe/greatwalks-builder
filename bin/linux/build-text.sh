#! /bin/bash

DIR=$( cd "$( dirname "$0" )" && pwd )

$DIR/build-html.sh
$DIR/build-css.sh
$DIR/build-javascript.sh
