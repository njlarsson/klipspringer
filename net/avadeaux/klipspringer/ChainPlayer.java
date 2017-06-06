package net.avadeaux.klipspringer;

import java.util.LinkedList;

class ChainPlayer implements Runnable {
    interface Sentinel { void finished(); }
    
    private final LinkedList<TrackChain> chains = new LinkedList<TrackChain>();
    private TrackChain playing;
    private boolean pendingPause = false;
    
    synchronized void add(TrackChain chain) {
        chains.addLast(chain);
        notifyAll();
    }

    synchronized void stop() {
        chains.clear();
        if (playing != null) { playing.stop(); }
    }

    synchronized void pause() {
        if (playing == null || !playing.pause()) {
            pendingPause = true;
            if (playing != null) { playing.stop(); }
        }
    }

    synchronized void unpause() {
        if (playing != null) {
            playing.unpause();
        }
        pendingPause = false;
    }

    public void run() {
        while (true) {
            // Wait until first chain available.
            synchronized (this) {
                while (chains.size() == 0) {
                    try { wait(); } catch (InterruptedException e) { }
                }
            }
            
            // Then run until there are none again.
            while (true) {
                TrackChain chain;
                synchronized (this) {
                    chain = chains.pollFirst();
                    if (pendingPause && chain != null) { chain.pause(); }
                    playing = chain;
                }
                if (chain == null) { break; }
                chain.play();
            }
        }
    }
}
