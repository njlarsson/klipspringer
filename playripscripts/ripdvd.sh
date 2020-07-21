#!/bin/bash
cd /media/klipspringer/porsche/dvd || exit 1
echo '--- start  dvd rip' `date` >> rip.log
dvdbackup -M -i /dev/sr0 >> rip.log 2>&1
echo '--- finish dvd rip' `date` >> rip.log
eject /dev/sr0
