package net.avadeaux.klipspringer;

import javax.sound.sampled.*;
import java.io.*;
import java.util.*;

/**
 * Player class with main method. Start with, e.g.
 *
 *    java net.avadeaux.klipspringer.TrackPlay 'DAC' 262144 0.1 *.flac
 *
 * Where DAC is an example of a prefix for the desired audio output mixer (if you give an empty
 * string, the program will print the list of available options, and use the first one as default),
 * 262144 is the internal buffer size in bytes (this is the buffer that is used to avoid gaps, needs
 * to be large when reading flac data from a flimsy device, e.g. over wifi), and 0.1 is the number
 * of seconds of buffer on the sound output side.
 */
public class TrackPlayer {
    private final ChainPlayer chains = new ChainPlayer();
    private final ArrayList<String> fnams = new ArrayList<String>();
    private int decodingTrackNo = 0, playingTrackNo = 0;
    private boolean playIdle = false, stopped = false;
    private long endMillis = System.currentTimeMillis();

    private TrackChain.Activity chainActiv = new TrackChain.Activity() {
            public void playingNext() {
                synchronized (TrackPlayer.this) {
                    ++playingTrackNo;
                    TrackPlayer.this.notifyAll();
                }
            }
            public void idle(boolean state) {
                synchronized (TrackPlayer.this) {
                    playIdle = state;
                    TrackPlayer.this.notifyAll();
                }
            }
            public void endMillis(long time) {
                synchronized (TrackPlayer.this) { endMillis = time; }
            }
        };
    
    synchronized String fnam(int trackNo) { return trackNo > 0 && trackNo <= fnams.size() ? fnams.get(trackNo-1) : null; }
    synchronized void addFnam(String fnam) { fnams.add(fnam); notifyAll(); }
    synchronized String playingTrackName() {
        if (playingTrackNo < 1) {
            // Don't have a track yet, be a little patient.
            long timeout = System.currentTimeMillis()+2000;
            do {
                long remain = timeout - System.currentTimeMillis();
                if (remain < 1) { break; }
                try { wait(remain); } catch (InterruptedException e) { }
            } while (playingTrackNo < 1);
        }
        return fnam(playingTrackNo);
    }
    synchronized double trackRemainEst() { return Math.max(endMillis-System.currentTimeMillis(), 0)/1000.0; }
    void quit() {
        synchronized (this) {
            stopped = true;
        }
        stop();
    }
    void skip(int offset) {
        synchronized (this) {
            if (playingTrackNo == fnams.size() && offset > 0) { return; } // ignore forward from last
            playingTrackNo = decodingTrackNo = Math.max(0, Math.min(fnams.size()-1, playingTrackNo-1+offset));
        }
        stop();
    }
    void pause() { chains.pause(); }
    void unpause() { chains.unpause(); }

    private void stop() { chains.stop(); }
    
    private synchronized int nextTrackNo() {
        while (decodingTrackNo >= fnams.size() && !playIdle && !stopped) {
            // Still playing, so more tracks might show up.
            try { wait(); } catch (InterruptedException e) { }
        }
        return (stopped || decodingTrackNo >= fnams.size()) ? 0 : ++decodingTrackNo;
    }

    private void run() throws IOException {
        Track track = null;
        while (true) {
            int trackNo = nextTrackNo();
            if (trackNo == 0) {
                if (track != null) { track.finalEnd(); }
                break;
            }
            track = new Track(fnam(trackNo), track, chains);
            try {
                track.decode();
            } catch (TrackChain.StoppedException ex) { track = null;}
        }
    }

    public static void main(String[] args) throws IOException {
        TrackPlayer player = new TrackPlayer();
        TrackChain.setGlobals(player.chainActiv, args[0], Integer.parseInt(args[1]), Double.parseDouble(args[2]));
        for (int i = 3; i < args.length; i++) { player.addFnam(args[i]); }
        new Thread(player.chains).start();
        new Thread(new SlaveInterface(new BufferedReader(new InputStreamReader(System.in, "UTF-8")),
                                      new OutputStreamWriter(System.out, "UTF-8"),
                                      player)).start();
        player.run();
        System.exit(0);
    }
}
