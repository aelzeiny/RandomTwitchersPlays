# The Auctioneer  (DEPRECATED)
**Deprecated**: in favor of `serverfull-auctioneer`
The job of the broadcaster is to update every connected webpage 
with the current status of the Queue. It's written using the AWS
API Gateway Websockets.

## But Why not Serverless HTTP/Websocket Endpoints?
This was a learning experience. Serverless problems require serverless solutions. There are plenty of good use-cases for serverless. This was not one of them.

1. Local development was really hard. Properietary lockin can also mean obtuse local development.
2. Serverless websockets require a storage backend to store state that would otherwise be stored in memory. Every websocket request has an ID, and you have to put that ID somewhere if you ever want to broadcast to that websocket again. This could be DynamoDB or, in my case, Redis. Just one more thing to keep track of.
3. I had to implement OAuth2 on serverless. That wasn't a terrible experience, but there are so many out-of-the-box options to implementing this now-a-days.
4. Compile-time is terrible. Not traditional compiling, but I mean CloudFormation rollouts. Add an endpoint? Well that's a whole new lambda config you gotta roll out. What happens to the old running lambdas? Well you gotta wait for those to die off.
5. Serverless problems require serverless solutions. Is one of your API endpoints slow? Well now you gotta ping the endpoint on a cron job to keep that lambda hot.

## But Why Serverless?
1. To Reduce load off of the GamePlay Server; which needs to be lightning
fast to relay controller inputs from 1 client (the gamer) to 1 machine (my Switch). 
2. To deal with arbitrary capacity. A stream can hit the frontpage of 
some social media site & get a ton of clicks spontaneously. All of them can also join the Queue.
3. Speed is not an issue here. The biggest CON of using Lambdas is the speed factor 
(lookup lambda cold vs warm starts). But a few seconds of delay for receiving a Queue update
will likely not upset anybody. However, I wouldn't use Serverless Lambdas for the GamePlay Server.
4. Proprietary lock-in is the last concern on my mind when building this.


