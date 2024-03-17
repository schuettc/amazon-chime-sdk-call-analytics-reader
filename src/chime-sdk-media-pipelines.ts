import { Stack, StackProps } from 'aws-cdk-lib';
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  PrincipalWithConditions,
} from 'aws-cdk-lib/aws-iam';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  ElementsType,
  LanguageCode,
  MediaInsightsPipeline,
  SpeakerSearchStatus,
  VoiceToneAnalysisStatus,
} from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';

interface MediaPipelineResourcesProps extends StackProps {
  kinesisDataStream: Stream;
  recordingBucket: Bucket;
  voiceAnalyticsLambda: IFunction;
}

export class MediaPipelineResources extends Construct {
  public transcribeMediaInsightsPipeline: MediaInsightsPipeline;
  constructor(
    scope: Construct,
    id: string,
    props: MediaPipelineResourcesProps,
  ) {
    super(scope, id);

    const kdsSinkPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          resources: [
            `arn:aws:kinesis:${Stack.of(this).region}:${
              Stack.of(this).account
            }:stream/${props.kinesisDataStream.streamName}`,
          ],
          actions: ['kinesis:PutRecord'],
        }),
        new PolicyStatement({
          resources: [
            `arn:aws:kms:${Stack.of(this).region}:${
              Stack.of(this).account
            }:key/*`,
          ],
          actions: ['kms:GenerateDataKey'],
          conditions: {
            StringLike: { 'aws:ResourceTag/AWSServiceName': 'ChimeSDK' },
          },
        }),
      ],
    });

    const s3SinkPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          resources: [`${props.recordingBucket.bucketArn}/*`],
          actions: ['s3:PutObject', 's3:PutObjectAcl', 's3:PutObjectTagging'],
        }),
        new PolicyStatement({
          resources: [
            `arn:aws:kinesisvideo:${Stack.of(this).region}:${
              Stack.of(this).account
            }:stream/*`,
          ],
          actions: [
            'kinesisvideo:GetDataEndpoint',
            'kinesisvideo:ListFragments',
            'kinesisvideo:GetMediaForFragmentList',
          ],
          conditions: {
            StringLike: { 'aws:ResourceTag/AWSServiceName': 'ChimeSDK' },
          },
        }),
        new PolicyStatement({
          resources: [
            `arn:aws:kinesisvideo:${Stack.of(this).region}:${
              Stack.of(this).account
            }:stream/Chime*`,
          ],
          actions: [
            'kinesisvideo:ListFragments',
            'kinesisvideo:GetMediaForFragmentList',
          ],
        }),
        new PolicyStatement({
          resources: [
            `arn:aws:kms:${Stack.of(this).region}:${
              Stack.of(this).account
            }:key/*`,
          ],
          actions: ['kms:GenerateDataKey'],
          conditions: {
            StringLike: { 'aws:ResourceTag/AWSServiceName': 'ChimeSDK' },
          },
        }),
      ],
    });

    const lambdaSinkPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: ['lambda:InvokeFunction', 'lambda:GetPolicy'],
          resources: [props.voiceAnalyticsLambda.functionArn],
        }),
      ],
    });

    const kvsRole = new Role(this, 'kvsRole', {
      assumedBy: new PrincipalWithConditions(
        new ServicePrincipal('mediapipelines.chime.amazonaws.com'),
        {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:chime:*:${Stack.of(this).account}:*`,
          },
        },
      ),
      inlinePolicies: {
        ['mediaInsightsPolicy']: new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: [
                'transcribe:StartCallAnalyticsStreamTranscription',
                'transcribe:StartStreamTranscription',
              ],
            }),
            new PolicyStatement({
              resources: [
                `arn:aws:kinesisvideo:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:stream/Chime*`,
              ],
              actions: [
                'kinesisvideo:GetDataEndpoint',
                'kinesisvideo:GetMedia',
              ],
            }),
            new PolicyStatement({
              resources: [
                `arn:aws:kinesisvideo:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:stream/*`,
              ],
              actions: [
                'kinesisvideo:GetDataEndpoint',
                'kinesisvideo:GetMedia',
              ],
              conditions: {
                StringLike: { 'aws:ResourceTag/AWSServiceName': 'ChimeSDK' },
              },
            }),
            new PolicyStatement({
              resources: [
                `arn:aws:kms:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:key/*`,
              ],
              actions: ['kms:Decrypt'],
              conditions: {
                StringLike: { 'aws:ResourceTag/AWSServiceName': 'ChimeSDK' },
              },
            }),
          ],
        }),
        ['kinesisDataStreamSinkPolicy']: kdsSinkPolicy,
        ['s3RecordingSinkPolicy']: s3SinkPolicy,
        ['lambdaSinkPolicy']: lambdaSinkPolicy,
      },
    });

    this.transcribeMediaInsightsPipeline = new MediaInsightsPipeline(
      this,
      'transcribeConfiguration',
      {
        resourceAccessRoleArn: kvsRole.roleArn,
        mediaInsightsPipelineConfigurationName: 'CallAnalyticsReader',
        elements: [
          {
            type: ElementsType.AMAZON_TRANSCRIBE_PROCESSOR,
            amazonTranscribeProcessorConfiguration: {
              languageCode: LanguageCode.EN_US,
            },
          },
          {
            type: ElementsType.KINESIS_DATA_STREAM_SINK,
            kinesisDataStreamSinkConfiguration: {
              insightsTarget: props.kinesisDataStream.streamArn,
            },
          },
          {
            type: ElementsType.S3_RECORDING_SINK,
            s3RecordingSinkConfiguration: {
              destination: props.recordingBucket.bucketArn,
            },
          },
          {
            type: ElementsType.VOICE_ANALYTICS_PROCESSOR,
            voiceAnalyticsProcessorConfiguration: {
              speakerSearchStatus: SpeakerSearchStatus.DISABLED,
              voiceToneAnalysisStatus: VoiceToneAnalysisStatus.ENABLED,
            },
          },
          {
            type: ElementsType.LAMBDA_FUNCTION_SINK,
            lambdaFunctionSinkConfiguration: {
              insightsTarget: props.voiceAnalyticsLambda.functionArn,
            },
          },
        ],
      },
    );
  }
}
