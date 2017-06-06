package net.avadeaux.klipspringer;

import java.io.*;
import java.util.regex.*;

/**
 * Acts on text-based commands.
 */
class SlaveInterface implements Runnable {
    private final BufferedReader reader;
    private final Writer writer;
    private final TrackPlayer player;
    
    private final static Pattern skipP = Pattern.compile("skip +(-?[0-9]+)");

    SlaveInterface(BufferedReader reader, Writer writer, TrackPlayer player) {
        this.reader = reader;
        this.writer = writer;
        this.player = player;
    }

    public void run() {
        try {
            while (true) {
                String l = reader.readLine().trim();
                Matcher m;
                if ("quit".equals(l)) {
                    player.quit();
                } else if ("get_filename".equals(l)) {
                    String fnam = player.playingTrackName();
                    if (fnam != null) {
                        writer.append("ANS_FILENAME='").append(fnam).append("'\n");
                        writer.append("ANS_REMAINEST='"+player.trackRemainEst()+"'\n");
                    } else {
                        writer.append("ANS_ERR='").append("no current trackname").append("'\n");
                    }
                    writer.append("\n").flush();
                } else if ("get_remainest".equals(l)) {
                    writer.append("ANS_REMAINEST='"+player.trackRemainEst()+"'\n\n").flush();
                } else if ("pause true".equals(l)) {
                    player.pause();
                } else if ("pause false".equals(l)) {
                    player.unpause();
                } else if ((m=skipP.matcher(l)).matches()) {
                    player.skip(Integer.parseInt(m.group(1)));
                } else {
                    writer.append("ANS_ERR='").append("syntax error: ").append(l).append("'\n").flush();
                }
            }
        } catch (IOException ex) {
            System.err.println("Error reading input for slave interface");
            ex.printStackTrace();
            System.exit(1);
        }
    }
}
