import {
  ChimeSDKVoiceClient,
  StartVoiceToneAnalysisTaskCommand,
} from '@aws-sdk/client-chime-sdk-voice';

const voiceAnalyticsClient = new ChimeSDKVoiceClient({
  region: process.env.AWS_REGION,
});

interface LambdaEvent {
  'detail-type': string;
  'detail': any;
}

export const handler: AWSLambda.Handler<LambdaEvent> = async (
  event,
  context,
) => {
  try {
    const { 'detail-type': detailType, detail } = event;
    console.log(JSON.stringify(event));

    if (detailType === 'VoiceAnalyticsStatus' && detail) {
      await processVoiceAnalyticsEvent(detail);
      console.log('Success');
    } else {
      console.log('Invalid event type');
    }
  } catch (error) {
    console.error('Internal Server Error');
    throw error;
  }
};

async function processVoiceAnalyticsEvent(detail: any) {
  const {
    detailStatus,
    callId,
    voiceConnectorId,
    transactionId,
    isCaller,
    inviteHeaders,
  } = detail;

  if (detailStatus === 'AnalyticsReady') {
    await startVoiceToneAnalysis(voiceConnectorId, transactionId);
  }
}

async function startVoiceToneAnalysis(
  voiceConnectorId: string,
  transactionId: string,
) {
  try {
    const voiceAnalyticsResponse = await voiceAnalyticsClient.send(
      new StartVoiceToneAnalysisTaskCommand({
        VoiceConnectorId: voiceConnectorId,
        TransactionId: transactionId,
        LanguageCode: 'en-US',
      }),
    );
    console.log(JSON.stringify(voiceAnalyticsResponse));
  } catch (error) {
    console.error('Error starting voice tone analysis:', error);
    throw error;
  }
}
