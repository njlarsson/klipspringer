# klipspringer
A rather minimal music playing system.

Try this to start a demo:

    wget http://klipspringer.avadeaux.net/klipspringer-site.tar.gz
    tar xfz klipspringer-site.tar.gz
    cd klipspringer-site
    git clone git@github.com:njlarsson/klipspringer.git
    cd klipspringer
    ./compile-jplayer.sh
    node main.js .. 8080 'pulse::0' '' ../klipspringer:../jars/jflac.jar
