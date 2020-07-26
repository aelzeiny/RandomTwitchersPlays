package live.twitch.arena.dto;

/**
 * How is it that this class is written in 1000 different libraries & I still roll my own due to
 * Docker-Maven issues with com.sun.tools.javac.util.Pair?
 */
public class Pair<T, U> {
    public final T first;
    public final U second;
    public Pair(T first, U second) {
        this.first = first;
        this.second = second;
    }
}
