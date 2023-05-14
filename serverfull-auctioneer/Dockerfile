FROM python:3.11-slim-buster

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

COPY *.py ./
COPY ./static ./static

CMD ["python3", "auctioneer.py"]