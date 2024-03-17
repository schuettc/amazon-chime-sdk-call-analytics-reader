import path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import {
  ManagedPolicy,
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Architecture, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { MediaInsightsPipeline } from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface VoiceAnalyticsLambdaResourcesProps {
  logLevel: string;
}

export class VoiceAnalyticsLambdaResources extends Construct {
  voiceAnalyticsLambda: IFunction;

  constructor(
    scope: Construct,
    id: string,
    props: VoiceAnalyticsLambdaResourcesProps,
  ) {
    super(scope, id);

    const eventBridgeLambdaRole = new Role(this, 'eventBridgeLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['KinesisVideoPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                `arn:aws:kinesisvideo:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:stream/ChimeVoiceConnector*`,
              ],
              actions: ['kinesisvideo:*'],
            }),
          ],
        }),
        ['ChimePolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['chime:StartVoiceToneAnalysisTask'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    this.voiceAnalyticsLambda = new NodejsFunction(
      this,
      'voiceAnalyticsLambda',
      {
        entry: path.join(__dirname, 'resources/voiceAnalytics/index.ts'),
        runtime: Runtime.NODEJS_LATEST,
        architecture: Architecture.ARM_64,
        handler: 'handler',
        role: eventBridgeLambdaRole,
        environment: {
          LOG_LEVEL: props.logLevel,
        },
        timeout: Duration.seconds(30),
      },
    );

    // props.kinesisDataStream.grantReadWrite(eventBridgeLambda);
  }
}

interface EventBridgeLambdaResourcesProps {
  logLevel: string;
  kinesisDataStream: Stream;
  webSocketApi: WebSocketApi;
  webSocketStage: WebSocketStage;
  connectionTable: Table;
  mediaInsightsConfiguration: MediaInsightsPipeline;
}

export class EventBridgeLambdaResources extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: EventBridgeLambdaResourcesProps,
  ) {
    super(scope, id);

    const eventBridgeLambdaRole = new Role(this, 'eventBridgeLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        ['KinesisVideoPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                `arn:aws:kinesisvideo:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:stream/ChimeVoiceConnector*`,
              ],
              actions: ['kinesisvideo:*'],
            }),
          ],
        }),
        ['ChimePolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['chime:CreateMediaInsightsPipeline'],
            }),
          ],
        }),
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    const eventBridgeLambda = new NodejsFunction(this, 'eventBridgeLambda', {
      entry: path.join(__dirname, 'resources/eventBridge/index.ts'),
      runtime: Runtime.NODEJS_LATEST,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      role: eventBridgeLambdaRole,
      environment: {
        MEDIA_INSIGHT_CONFIGURATION:
          props.mediaInsightsConfiguration
            .mediaInsightsPipelineConfigurationArn,
        KINESIS_DATA_STREAM_ARN: props.kinesisDataStream.streamArn,
      },
      timeout: Duration.seconds(30),
    });

    props.kinesisDataStream.grantReadWrite(eventBridgeLambda);
    props.connectionTable.grantReadWriteData(eventBridgeLambda);
    props.webSocketStage.grantManagementApiAccess(eventBridgeLambda);
    props.webSocketApi.grantManageConnections(eventBridgeLambda);

    const chimeSdkRule = new Rule(this, 'chimeSdkRule', {
      eventPattern: {
        source: ['aws.chime'],
        detailType: [
          'Chime VoiceConnector Streaming Status',
          'Media Insights State Change',
        ],
      },
    });
    chimeSdkRule.addTarget(new LambdaFunction(eventBridgeLambda));
  }
}
