const { awscdk } = require('projen');
const { JobPermission } = require('projen/lib/github/workflows-model');
const { UpgradeDependenciesSchedule } = require('projen/lib/javascript');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.130.0',
  defaultReleaseBranch: 'main',
  name: 'amazon-chime-sdk-call-analytics-reader',
  license: 'MIT-0',
  projenrcTs: true,
  author: 'Court Schuett',
  jest: false,
  copyrightOwner: 'Amazon.com, Inc.',
  authorAddress: 'https://aws.amazon.com',
  appEntrypoint: 'amazon-chime-sdk-call-analytics-reader.ts',
  eslintOptions: { ignorePatterns: ['src/resources/server/assets/site/**'] },
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
      schedule: UpgradeDependenciesSchedule.WEEKLY,
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['schuettc'],
  },
  deps: [
    'dotenv',
    'cdk-amazon-chime-resources',
    '@aws-sdk/client-dynamodb',
    'aws-lambda',
    '@types/aws-lambda',
    '@aws-sdk/client-apigatewaymanagementapi',
    '@aws-sdk/client-chime-sdk-media-pipelines',
    '@aws-sdk/client-kinesis',
    'fs-extra',
    '@types/fs-extra',
  ],
  autoApproveUpgrades: true,
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
});

const common_exclude = [
  '.yalc',
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
  'dependabot.yml',
  '.DS_Store',
];

const upgradeSite = project.github.addWorkflow('upgrade-site');
upgradeSite.on({ schedule: [{ cron: '0 0 * * 1' }], workflowDispatch: {} });

upgradeSite.addJobs({
  upgradeSite: {
    runsOn: ['ubuntu-latest'],
    name: 'upgrade-site',
    permissions: {
      actions: JobPermission.WRITE,
      contents: JobPermission.READ,
      idToken: JobPermission.WRITE,
    },
    steps: [
      { uses: 'actions/checkout@v3' },
      {
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v3',
        with: {
          'node-version': '18',
        },
      },
      {
        run: 'yarn install --check-files --frozen-lockfile',
        workingDirectory: 'site',
      },
      { run: 'yarn upgrade', workingDirectory: 'site' },
      {
        name: 'Create Pull Request',
        uses: 'peter-evans/create-pull-request@v4',
        with: {
          'token': '${{ secrets.' + AUTOMATION_TOKEN + ' }}',
          'commit-message': 'chore: upgrade site',
          'branch': 'auto/projen-upgrade',
          'title': 'chore: upgrade site',
          'body': 'This PR upgrades site',
          'labels': 'auto-merge, auto-approve',
          'author': 'github-actions <github-actions@github.com>',
          'committer': 'github-actions <github-actions@github.com>',
          'signoff': true,
        },
      },
    ],
  },
});

project.addTask('launch', {
  exec: 'yarn && yarn projen && yarn build && yarn cdk bootstrap && yarn cdk deploy  --require-approval never && yarn configLocal',
});
project.addTask('getBucket', {
  exec: "aws cloudformation describe-stacks --stack-name AmazonChimeSDKCallAnalyticsReader --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`siteBucket`].OutputValue' --output text",
});

project.addTask('configLocal', {
  exec: 'aws s3 cp s3://$(yarn run --silent getBucket)/config.json site/public/',
});

project.tsconfigDev.file.addOverride('include', [
  'src/**/*.ts',
  'site/src/**/*.tsx',
  './.projenrc.ts',
]);

project.eslint.addOverride({
  files: ['site/src/**/*.tsx', 'src/resources/**/*.ts'],
  rules: {
    'indent': 'off',
    '@typescript-eslint/indent': 'off',
  },
});

project.eslint.addOverride({
  files: ['src/resources/**/*.ts', 'src/*.ts', 'site/src/**/*.tsx'],
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
});

project.gitignore.exclude(...common_exclude);
project.synth();
