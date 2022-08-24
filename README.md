# CFN Custom Resource Using Step Functions

## Implements a Cloudformation custom resource using AWS Step Functions and wait conditions (Typescript)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

### System requirements

- [node (version >= 16x)](https://nodejs.org/en/download/)
- [awscli (v2)](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
- [cdk (v2)](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
- [jq (v1.6)](https://github.com/stedolan/jq/wiki/Installation)

## Prerequisites

Before proceeding any further, you need to identify and designate an AWS account required for the solution to work. You also need to create an AWS account profile in `~/.aws/credentials` for the designated AWS account, if you don’t already have one. The profile needs to have sufficient permissions to run an [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (AWS CDK) stack. It should be your private profile and only be used during the course of this blog. So, it should be fine if you want to use admin privileges. Don’t share the profile details, especially if it has admin privileges. I recommend removing the profile when you’re finished with the testing. For more information about creating an AWS account profile, see [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).

## Project Structure

> Project is deployed in 2 different stacks under `src/` folder.
>> `src/lib/stack-main.ts` deploys common components, S3 source bucket for CodeBuild project, DynamoDB Table to audit custom resources lifecycle events and lambda layer used across other stacks.
>> `src/step-function/stack-main.ts` deploys step function backed custom resource. In the dynamodb there should a entry with partition key as `demo-sfn`, indicating that this custom resource was created.
>> If you run the deployment script again, then it should update the custom resources by updating the timestamp `ts` in DynamoDB. Now you should see the `lastOperation` attribute value as `update`
>> All stacks tie into `app.ts` at root folder location which represents CDK app.

## Deployment using CDK

> 1. Clone the repo
> 2. Navigate to the cloned folder
> 3. run `script-deploy.sh` as shown below by passing the name of the AWS profile you created in the prerequisites section above. If no profile name is passed then **default** profile will be used.
`./script-deploy.sh <AWS-ACCOUNT-PROFILE-NAME>`
> All the stacks should now be deployed.