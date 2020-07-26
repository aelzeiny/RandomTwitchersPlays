FROM python:3

COPY requirements.txt /
RUN pip install -r requirements.txt

COPY apis.py /
COPY heartbeat.py /
COPY twitch_chatbot.py /

ENTRYPOINT ["python3", "heartbeat.py"]