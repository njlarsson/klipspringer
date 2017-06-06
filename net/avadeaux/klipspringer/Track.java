package net.avadeaux.klipspringer;

import java.io.*;
import javax.sound.sampled.*;
import org.jflac.*;
import org.jflac.metadata.StreamInfo;
import org.jflac.util.ByteData;

/**
 * Single track, with its own input stream and flac decoder.
 */
class Track {
    private final FLACDecoder decoder;
    private TrackChain chain = null; // set when audio format can be determined

    public Track(String fnam, Track prev, ChainPlayer chains) throws FileNotFoundException {
        decoder = new FLACDecoder(new FileInputStream(fnam));
        decoder.addPCMProcessor(new PCMProcessor() {
                public void processStreamInfo(StreamInfo streamInfo) {
                    AudioFormat fmt = streamInfo.getAudioFormat();
                    if (prev != null && prev.chain.formatMatches(fmt)) {
                        chain = prev.chain;
                        chain.nextTrack();
                    } else {
                        if (prev != null) { prev.chain.end(); }
                        chain = new TrackChain(fmt);
                        chains.add(chain);
                    }
                }
                public void processPCM(ByteData pcm) {
                    chain.write(pcm.getData(), 0, pcm.getLen());
                }
            });
    }

    void decode() throws IOException {
        decoder.decode();
    }

    void finalEnd() {
        chain.end();
    }
}
