# Klipspringer
A rather minimal music playing system. The ambition is not for this to
be general streamlined product, it's created for personal use, but
most of the code is reasonably general, so maybe you can find
something useful here.

The point of Klipspringer is to replace a cd player plus radio with a
small computer server with audio playing capabilities. It consists of:

 1. An http server to be run with Node.js, that let's you:

    * Browse a “cd database”, a file hierarchy containing flac files in
      an `artist/album/*.flac` structure, and instruct the server to
      play an album, on the server side. Currently, you can only start a whole
      album at a time.
    * Play a radio channel via a web stream, using
      [mplayer](http://www.mplayerhq.hu/). The radio channels given in
      the code are four Swedish [Sveriges radio](http://sverigesradio.se/) channels, which you
      might not be able to access unless you are
      located in Sweden (so then radio playing won't work unless you
      replace the stream addresses).
    * Control the playing album/stream with a minimal cd-player style
      button set.

 2. [A flac file player written in Java](https://github.com/njlarsson/klipspringer/tree/master/net/avadeaux/klipspringer),
    using the [jflac](http://jflac.org/) flac decoding library, with a
    slave interface on stdin/stdout that lets you pause, skip to next
    track etc., and with cross-track buffering that allows playing a
    sequence of flac files without any gap.

The web design in the interface is extremely rudimentary. I'd very
much appreciate contributions to make it look nicer, particularly on a
smartphone display.

Try this to quick start a demo server:

    wget http://avadeaux.net/klipspringer-site.tar.gz
    tar xfz klipspringer-site.tar.gz
    cd klipspringer-site
    git clone https://github.com/njlarsson/klipspringer.git
    cd klipspringer
    ./compile-jplayer.sh
    npm install ip
    node main.js .. 8080 'pulse::0' '' ../klipspringer:../jars/jflac.jar

You may need to modify some of the arguments in the last command to
get it to work in your environment, in particular depending on your
audio setup. Explanation of the arguments:

 * `main.js` The main program file. There's no alternative here.
 * `..` A directory that contains a `cd` subdirectory, where the “cd
    database” flac
    file hierarchy is. The `klipspringer-site` demo contains a single
    “album” consisting of two Nine Inch Nails tracks, released under a
    creative commons license.
 * `8080` The port to access the server on. Replace with whatever you'd
    like.
 * `pulse::0` The audio output specification for mplayer, only used
    for the radio stream playing. This *pulse* argument works in Ubuntu,
    which uses Pulseaudio as the standard audio playing option. If
    you're on a Linux installation without Pulseaudio, you might want
    something like `alsa:device=hw=0,0`, and if you're in Mac OS X you
    can try `coreaudio`. Get the available options on your system with
    `mplayer -ao help`.
 * `''` The *mixer* prefix to use as audio output specification to the flac player. If this is
    the empty string, as in the example, the player prints the names
    of available mixers and uses the first one. If it's anything else
    than the empty string, it's supposed to be a prefix of the name of
    the mixer of choice. The player uses the first mixer that matches
    this prefix, if any. (Otherwise it uses the first one again.) For
    example, you might say `DAC` if you have an external audio device plugged
    in, whose name begins with these letters.
 * `../klipspringer:../jars/jflac.jar` The Java class path for the flac file player, given relatively
    to the `cd` directory. The given path is correct for the `klipspringer-site` demo.

For more information, read the code. :)

To do:

 * Support metadata for the albums, which is to be collected from
   Discogs in a semi-automatic way.
 * Create a search function for the metadata in the http interface.
 * Improve the web design. This is low priority to me, but as
   mentioned above I'd be happy to accept contributions from somebody
   more skilled in web design/coding.
