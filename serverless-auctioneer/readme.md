# The Broadcaster
The job of the broadcaster is to update every connected webpage 
with the current status of the Queue. It's written using the AWS
API Gateway Websockets.

## But Why Serverless?
1. To Reduce load off of the GamePlay Server; which needs to be lightning
fast to relay controller inputs from 1 client (the gamer) to 1 machine (my Switch). 
2. To deal with arbitrary capacity. A stream can hit the frontpage of 
some social media site & get a ton of clicks spontaneously. All of them can also join the Queue.
3. Speed is not an issue here. The biggest CON of using Lambdas is the speed factor 
(lookup lambda cold vs warm starts). But a few seconds of delay for receiving a Queue update
will likely not upset anybody. However, I wouldn't use Serverless Lambdas for the GamePlay Server.
4. Proprietary lock-in is the last concern on my mind when building this.
