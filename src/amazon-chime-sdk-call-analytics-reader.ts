import { App, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { config } from 'dotenv';
import {
  DatabaseResources,
  EventBridgeLambdaResources,
  VoiceAnalyticsLambdaResources,
  KinesisResources,
  ApiGatewayResources,
  MediaPipelineResources,
  SiteResources,
  S3Resources,
} from './';

config();

export interface AmazonChimeSDKCallAnalyticsReaderProps extends StackProps {
  logLevel: string;
}

export class AmazonChimeSDKCallAnalyticsReader extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AmazonChimeSDKCallAnalyticsReaderProps,
  ) {
    super(scope, id, props);

    const s3Resources = new S3Resources(this, 'S3Resources');

    const databaseResources = new DatabaseResources(this, 'DatabaseResources');

    const voiceAnalyticsLambda = new VoiceAnalyticsLambdaResources(
      this,
      'VoiceAnalyticsLambdaResources',
      { logLevel: props.logLevel },
    );

    const kinesisResources = new KinesisResources(this, 'KinesisResources');

    const mediaPipelineResources = new MediaPipelineResources(
      this,
      'MediaPipelineResources',
      {
        kinesisDataStream: kinesisResources.kinesisDataStream,
        recordingBucket: s3Resources.recordingBucket,
        voiceAnalyticsLambda: voiceAnalyticsLambda.voiceAnalyticsLambda,
      },
    );

    const apiGatewayResources = new ApiGatewayResources(
      this,
      'APIGatewayResources',
      {
        kinesisDataStream: kinesisResources.kinesisDataStream,
        connectionTable: databaseResources.connectionTable,
        logLevel: props.logLevel,
      },
    );

    new EventBridgeLambdaResources(this, 'EventBridgeLambdaResources', {
      logLevel: props.logLevel,
      kinesisDataStream: kinesisResources.kinesisDataStream,
      webSocketApi: apiGatewayResources.webSocketApi,
      webSocketStage: apiGatewayResources.webSocketStage,

      connectionTable: databaseResources.connectionTable,
      mediaInsightsConfiguration:
        mediaPipelineResources.transcribeMediaInsightsPipeline,
    });

    const siteResources = new SiteResources(this, 'SiteResources', {
      webSocketApi: apiGatewayResources.webSocketApi,
      webSocketStage: apiGatewayResources.webSocketStage,
    });

    new CfnOutput(this, 'DistributionUrl', {
      value: siteResources.distribution.domainName,
    });

    new CfnOutput(this, 'siteBucket', {
      value: siteResources.siteBucket.bucketName,
    });
  }
}

const app = new App();

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const summarizerProps = {
  logLevel: process.env.LOG_LEVEL || 'INFO',
};

new AmazonChimeSDKCallAnalyticsReader(
  app,
  'AmazonChimeSDKCallAnalyticsReader',
  { ...summarizerProps, env: devEnv },
);

app.synth();
