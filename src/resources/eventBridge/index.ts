import { randomUUID } from 'crypto';
import {
  CreateMediaInsightsPipelineCommand,
  ChimeSDKMediaPipelinesClient,
} from '@aws-sdk/client-chime-sdk-media-pipelines';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis'; // ES Modules import
import { EventBridgeEvent } from 'aws-lambda';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const MEDIA_INSIGHT_CONFIGURATION = process.env.MEDIA_INSIGHT_CONFIGURATION;
const KINESIS_DATA_STREAM_ARN = process.env.KINESIS_DATA_STREAM_ARN;

const chimeSdkMediaPipelineClient = new ChimeSDKMediaPipelinesClient({
  region: AWS_REGION,
});

const kinesisClient = new KinesisClient({ region: AWS_REGION });

exports.handler = async (event: EventBridgeEvent<any, any>): Promise<void> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  await putRecord(event);

  if (event['detail-type'] === 'Chime VoiceConnector Streaming Status') {
    if (event.detail.streamingStatus === 'ALL_STARTED') {
      console.log('ALL_STARTED');
      const [
        { streamArn: callerStreamArn, startFragmentNumber: callerStreamStart },
        { streamArn: agentStreamArn, startFragmentNumber: agentStreamStart },
      ] = event.detail.streams;

      await startPipeline({
        callerStreamArn,
        callerStreamStart,
        agentStreamArn,
        agentStreamStart,
      });
    }
  }
};

async function putRecord(event: EventBridgeEvent<any, any>) {
  console.log('Putting Event to KDS');
  try {
    await kinesisClient.send(
      new PutRecordCommand({
        Data: new TextEncoder().encode(JSON.stringify(event)),
        PartitionKey: '1',
        StreamARN: KINESIS_DATA_STREAM_ARN,
      }),
    );
  } catch (error) {
    console.log(error);
  }
}

async function startPipeline({
  callerStreamArn,
  callerStreamStart,
  agentStreamArn,
  agentStreamStart,
}: {
  callerStreamArn: string;
  callerStreamStart: string;
  agentStreamArn: string;
  agentStreamStart: string;
}) {
  console.log('Starting Media Insight Pipeline');
  const response = await chimeSdkMediaPipelineClient.send(
    new CreateMediaInsightsPipelineCommand({
      MediaInsightsPipelineConfigurationArn: MEDIA_INSIGHT_CONFIGURATION,
      KinesisVideoStreamSourceRuntimeConfiguration: {
        Streams: [
          {
            StreamArn: callerStreamArn,
            FragmentNumber: callerStreamStart,
            StreamChannelDefinition: {
              NumberOfChannels: 1,
              ChannelDefinitions: [
                { ChannelId: 0, ParticipantRole: 'CUSTOMER' },
              ],
            },
          },
          {
            StreamArn: agentStreamArn,
            FragmentNumber: agentStreamStart,
            StreamChannelDefinition: {
              NumberOfChannels: 1,
              ChannelDefinitions: [{ ChannelId: 1, ParticipantRole: 'AGENT' }],
            },
          },
        ],
        MediaEncoding: 'pcm',
        MediaSampleRate: 8000,
      },
      MediaInsightsRuntimeMetadata: {
        TestData: randomUUID(),
      },
    }),
  );
  console.info(
    'Media Insight Pipeline Started',
    JSON.stringify(response, null, 2),
  );
  console.log('Media Insight Pipeline Started');
}
