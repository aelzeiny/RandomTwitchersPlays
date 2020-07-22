FROM openjdk:8-jre

# Add the service itself
ARG JAR_FILE="TwitchArena-6.13.0.jar"
ADD target/${JAR_FILE} /usr/share/twitch-arena/twitch-arena.jar

ENTRYPOINT ["java", "-jar", "/usr/share/twitch-arena/twitch-arena.jar"]