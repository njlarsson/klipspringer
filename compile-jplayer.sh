#!/bin/bash
pushd "$(dirname "$0")"
basedir="`pwd`"
popd
javac -cp $basedir:$basedir/../jars/jflac.jar $basedir/net/avadeaux/klipspringer/*.java
