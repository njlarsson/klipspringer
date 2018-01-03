package net.avadeaux.klipspringer;

import java.util.*;
import javax.sound.sampled.*;

class TrackChain {
    static class StoppedException extends RuntimeException { }
    
    static interface Activity {
        void playingNext();        // notes that playing thread moved to next track
        void idle(boolean state);  // set true when playing thread is waiting for input
        void endMillis(long time); // sets the minimum time point where track may end
    }
    
    private static Mixer.Info mixerInfo;
    private static int internBufBytes;
    private static double lineBufSecs;
    private static Activity activ;

    private final AudioFormat format;
    private final LinkedList<Long> nextTrackPos = new LinkedList<Long>();
    private SourceDataLine line;
    private byte[] buf;         // internal buffer
    private int bufw = 0;       // write pos in buf
    private int bufn = 0;       // n bytes data in buf
    private long gotBytes = 0, sentBytes = 0, chainEnd = Long.MAX_VALUE;
    private boolean paused = false, stopped = false;

    static synchronized void setGlobals(Activity activ, String namePrefix, int internBufBytes, double lineBufSecs) {
        TrackChain.activ = activ;
        mixerInfo = getPreferredMixerInfo(namePrefix);
        TrackChain.internBufBytes = internBufBytes;
        TrackChain.lineBufSecs = lineBufSecs;
        TrackChain.class.notifyAll();
    }
    
    private static void lineUnavailable(LineUnavailableException ex) {
        System.err.println("Line unavailable");
        ex.printStackTrace();
        System.exit(1);
    }

    private static Mixer.Info getPreferredMixerInfo(String namePrefix) {
        Mixer.Info[] mxInfoArr = AudioSystem.getMixerInfo();
        if (namePrefix == null || namePrefix.length() == 0) {
            System.err.println("Available mixers:");
            System.err.println(mxInfoArr[0].getName() + " (default)");
            for (int i = 1; i < mxInfoArr.length; i++) {
                System.err.println(mxInfoArr[i].getName());                
            }
        } else {
            for (Mixer.Info info : mxInfoArr) {
                if (info.getName().startsWith(namePrefix)) { return info; }
            }
        }
        return mxInfoArr[0];
    }

    TrackChain(AudioFormat format) {
        this.format = format;
    }

    private void initLine() {
        synchronized (TrackChain.class) { // wait for globals to be initalized
            while (mixerInfo == null) {
                try { TrackChain.class.wait(); } catch (InterruptedException e) { }
            }
        }
        try {
            int lineBufSz = (int) secsToBytes(lineBufSecs);
            line = null;
            for (int tries = 0; line == null && tries < 2; tries++) {
                try {
                    line = (SourceDataLine) AudioSystem.getMixer(mixerInfo).
                        getLine(new DataLine.Info(SourceDataLine.class, format, lineBufSz));
                } catch (IllegalArgumentException ex) {
                    System.err.println("Try "+(tries+1)+": "+ex);
                }
            }
            line.open(format, lineBufSz);
            line.start();
        } catch (LineUnavailableException ex) { lineUnavailable(ex); }            
    }
    
    boolean formatMatches(AudioFormat fmt) {
        return format.getEncoding() == fmt.getEncoding()
            && format.getSampleRate() == fmt.getSampleRate()
            && format.getSampleSizeInBits() == fmt.getSampleSizeInBits()
            && format.getChannels() == fmt.getChannels()
            && format.isBigEndian() == fmt.isBigEndian();
    }
    
    private long bytesToMillis(long bytes) {
        return (long) (bytes*1000
                       / ((format.getSampleSizeInBits()+7)/8)
                       / format.getChannels()
                       / format.getSampleRate());
    }

    private long secsToBytes(double secs) {
        return (long) (secs
                       * format.getSampleSizeInBits() / 8
                       * format.getChannels()
                       * format.getSampleRate());
    }
        
    /** Informs that what's written after this are the next track. Invoked from feeding thread. */
    synchronized void nextTrack() {
        nextTrackPos.addLast(gotBytes);
    }

    /** Informs that all data is written, nothing more coming. Invoked from feeding thread. */
    synchronized void end() {
        chainEnd = gotBytes;
        notifyAll();
    }

    /** Invoked from feeding thread. */
    synchronized void write(byte[] data, int off, int len) {
        gotBytes += len;
        if (nextTrackPos.size() == 0) { activ.endMillis(System.currentTimeMillis()+bytesToMillis(gotBytes-sentBytes)); }
        if (buf == null) { buf = new byte[internBufBytes]; }
        while (true) {
            if (stopped) { throw new StoppedException(); }
            int n = Math.min(len, buf.length-bufn);
            for (int i = 0; i < n; i++) {
                buf[bufw++] = data[off++];
                if (bufw == buf.length) { bufw = 0; }
            }
            bufn += n;
            notifyAll();
            if ((len -= n) == 0) { break; }
            while (bufn == buf.length && !stopped) {
                try { wait(); } catch (InterruptedException e) { }
            }
        }            
    }

    /** Returns true if took effect, false if too late to pause. */
    synchronized boolean pause() {
        while (bufn == 0 && gotBytes < chainEnd) {
            // wait for either data or end marker to appear
            try { wait(); } catch (InterruptedException e) { }
        }
        if (bufn > 0) {
            line.stop();
            paused = true;
        }
        return paused;
    }

    synchronized void unpause() {
        paused = false;
        line.start();
        notifyAll();
    }

    synchronized void stop() {
        stopped = true;
        if (line != null) { line.close(); }
        notifyAll();
    }

    /** Loops until everything is played (including final drain). Invoked from consuming thread. */
    synchronized void play() {
        long minFill = Math.min(secsToBytes(0.2), internBufBytes/2);
        while (gotBytes < minFill && !stopped) { // wait until something written
            activ.idle(true);
            try { wait(); } catch (InterruptedException e) { }
        }
        activ.idle(false);
        if (stopped) { return; }
        initLine();
        activ.playingNext();
        while (true) {
            while (bufn == 0 && !stopped) { // no data to write
                if (sentBytes == chainEnd) { // nothing more is coming
                    line.drain();
                    line.close();
                    return;
                }
                activ.idle(true);
                try { wait(); } catch (InterruptedException e) { }
            }
            activ.idle(false);
            if (stopped) { return; }
            int n;
            while ((n = line.available()) == 0) {
                // can't write without blocking, wait for a while
                try {
                    wait(bytesToMillis(line.getBufferSize())/2);
                } catch (InterruptedException e) { }
                if (stopped) { return; }
            }
            while (paused && !stopped) {
                try { wait(); } catch (InterruptedException e) { }
            }
            if (stopped) { return; }
            n = Math.min(Math.min(n, bufn), line.available());
            int r = bufw-bufn;  // read position
            if (r < 0) {        // because circular buffer
                r += buf.length;
                n = Math.min(n, buf.length-r);
            }
            line.write(buf, r, n);
            bufn -= n;
            sentBytes += n;

            // Find end of current track, if possible.
            long endCurrent;
            while (true) {
                if (nextTrackPos.size() == 0) {
                    endCurrent = gotBytes; // track lasts at least this long
                    break;
                }
                endCurrent = nextTrackPos.getFirst();
                if (sentBytes < endCurrent) { break; }

                // We passed a track endpoint, pop it.
                nextTrackPos.removeFirst();
                activ.playingNext();
            }
            activ.endMillis(bytesToMillis(endCurrent-sentBytes)+System.currentTimeMillis());
            notifyAll();
        }
    }
}
