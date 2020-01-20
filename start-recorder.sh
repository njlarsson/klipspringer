#!/bin/bash

# Server start script tailored for personal use, don't expect explanation.

touch ~/.kliplog
echo starting ks >> ~/.kliplog
date >> ~/.kliplog
cd /home/pi/klipspringer
/home/pi/.nvm/versions/node/v13.6.0/bin/node recorder.js /dev/input/event0 >> ~/.reclog 2>&1 &

