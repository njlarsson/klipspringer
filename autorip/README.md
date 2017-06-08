This directory contains files to handle ripping cds and dvds, making it as
automatic as possible. It is hardcoded to be used by a specific user (jesper) on
a specific machine running Ubuntu, and thus not directly transferable. At best,
you can find some ideas here.

`abcde.conf` is linked from `~/.abcde.conf`.

`ripdvd.c` is actually not more than a script, it was made a C code
file instead of a bash script only in order to be run as root by use
of suid, and the reason for that is that I want to write the result to
a diretory that is read only except to root. It is compiled, suid root
set, and placed in `/usr/local/sbin`. Yes, an ugly kludge, and also it
doesn't work in more recent versions of Ubuntu (it now has to be run
explicitly with sudo), so it could just as well be changed to an
ordinary script.

`ripcd.sh` linked from `~/bin`

The `.desktop` files are linked from `~/.local/share/applications` and
referenced from the operating system as what to do when a cd/dvd is inserted, to
make ripping happen automagically. However, as noted above, for dvds this no
longer works for me due to the suid kludge stopped working.
