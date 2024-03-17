# Amazon Chime SDK Call Analytics Consumer

This code will deploy a small application that can be used with [Amazon Chime SDK call analytics](https://docs.aws.amazon.com/chime-sdk/latest/dg/call-analytics.html) to view the results in real-time.

![AmazonChimeSDKCallAnalyticsConsumer](/images/AmazonChimeSDKCallAnalyticsConsumer.png)

## Process

1. A SIP or SIPREC INVITE is sent to the Amazon Chime SDK Voice Connector
2. This triggers EventBridge
3. An EventBridge [event](https://docs.aws.amazon.com/chime/latest/ag/automating-chime-with-cloudwatch-events.html) is sent to the associated Lambda function
4. The Lambda starts the [Amazon Chime SDK media insights pipeline](https://docs.aws.amazon.com/chime-sdk/latest/dg/create-config-console.html)
5. RTP is delivered from the Amazon Chime SDK Voice Connector to the Amazon Chime SDK call analytics processor
6. Amazon Chime SDK events from EventBridge are sent to a Kinesis Data Stream
7. RTP from the Amazon Chime SDK Voice Connector is processed with Transcribe
8. Results from Transcribe are sent from the Amazon Chime SDK call analytics processor to the Kinesis Data Stream
9. Kinesis Data Stream records are consumed on a Lambda function
10. These records are delivered to a WebSocket API
11. And viewable on an S3/CloudFront hosted React App

## Deployed Components

- Amazon Chime SDK call analytics configuration
- S3 bucket for recordings
- EventBridge rule
- EventBridge Lambda function
- Kinesis Data Stream
- Kinesis Data Stream consuming Lambda function
- WebSocket API
- DynamoDB to track connections
- S3 bucket for React app
- CloudFront Distribution associated with S3 bucket

## Messages

All of the messages related to Amazon Chime SDK call analytics will be delivered to the client through the WebSocket API from the Kinesis Data Stream. These messages can be filtered within the app to more easily see the various message types.

![AmazonChimeSDKCallAnalyticsMessages](/images/AmazonChimeSDKCallAnalyticsMessages.png)

## Using

To use this app, you will need to deploy this app and configure an Amazon Chime SDK Voice Connector. This app will start Amazon Chime SDK call analytics for any Amazon Chime Voice Connector in the Region. Any time a call uses an Amazon Chime SDK Voice Connector, the EventBridge Lambda will start an Amazon Chime SDK call analytics media insights pipeline associated with the deployed Amazon Chime SDK call analytics configuration.

## Deploying

To deploy this demo, use:

```bash
yarn launch
```

To remove this demo, use:

```bash
yarn cdk destroy
```
