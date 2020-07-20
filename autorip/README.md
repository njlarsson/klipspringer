This directory contains files to handle ripping cds and dvds, making it as
automatic as possible. It is hardcoded to be used by a specific user (jesper) on
a specific machine running Ubuntu, and thus not directly transferable. At best,
you can find some ideas here.

`abcde.conf` is linked from `~/.abcde.conf`.

`ripcd.sh` linked from `~/bin`

The `.desktop` files are copied to (or linked from?)
`~/.local/share/applications` and referenced from the operating system
as what to do when a cd/dvd is inserted, to make ripping happen
automagically. It may be necessary to execute them manually once from
the Gnome desktop and set them to trusted, before it's possible to
select them for automatic launch. And it may need to have the x flag
set first
