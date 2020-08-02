echo 'BUILDING SERVERLESS BROADCASTER'
cd ./serverless-auctioneer
npm run build

echo 'BUILDING FARGATE HEARTBEAT SERVER'
cd ../heartbeat
docker build -t aelzeiny/twitch-heartbeat .
docker push aelzeiny/twitch-heartbeat

echo 'BUILDING REACT TWITCH FRONTEND'
cd ../twitch-frontend
npm run build

echo 'BUILDING FARGATE TRAFFIC CONTROLLER'
cd ../traffic-controller
mvn clean install
docker push aelzeiny/twitch-arena