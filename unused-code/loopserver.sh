#!/bin/bash
echo "$$" > loopserver.pid
finish=0
trap 'finish=1' SIGUSR1

while (( finish != 1 ))
do
    node t.js $1 $2
    killall mplayer
done
