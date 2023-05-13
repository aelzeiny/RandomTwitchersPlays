FROM arm64v8/python:3.11-slim-buster
WORKDIR /app
COPY requirements.txt .
COPY *.py .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "controller_relay.py"]