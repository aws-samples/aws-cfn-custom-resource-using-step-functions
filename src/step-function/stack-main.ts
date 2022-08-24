/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';
import { Construct } from 'constructs';
import {
	Stack,
	StackProps,
	Duration,
	CustomResource,
	CfnOutput,
	CfnWaitConditionHandle,
	CfnWaitCondition
} from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { aws_stepfunctions as sfn } from 'aws-cdk-lib';
import { aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import * as hash from 'object-hash';
import {
	SSM_PARAM_COMMON_LIB_LAYER,
	SSM_PARAM_EXT_LIB_LAYER,
	SSM_PARAM_DDB_ARN,
	getNormalizedResourceName,
	getNormalizedCfnExportedName
} from '../utils/cdk-utils';

/**
 * Stack to deploy custom resourrce backed by step function
 */
export class SfnStackMain extends Stack {
	// Base path lambdas
	private basePath = 'dist/step-function/lambda';
	// Base path layers
	private logLevel = 'INFO';
	// Base path step function lambdas
	private basePathSfnLambdas: string = this.basePath.concat('/sfn-lambdas');

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		/******************************* Retrive SSM Parameters ********************************/
		const commonLibLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'CommonLibLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_COMMON_LIB_LAYER)
		);

		const extLibLayer = lambda.LayerVersion.fromLayerVersionArn(
			this,
			'ExtLibLayer',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_EXT_LIB_LAYER)
		);

		const demoTable = dynamodb.Table.fromTableArn(
			this,
			'DynamoDBTable',
			ssm.StringParameter.valueForStringParameter(this, SSM_PARAM_DDB_ARN)
		);
		/***************************************************************************************/

		/************************************ Create Lambda ************************************/
		// Lambda to create resource
		const createLambda = new lambda.Function(this, 'CreateResourceLambda', {
			runtime: lambda.Runtime.NODEJS_16_X,
			code: lambda.Code.fromAsset(this.basePathSfnLambdas.concat('/create')),
			handler: 'index.handler',
			timeout: Duration.seconds(600),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				LOG_LEVEL: this.logLevel
			},
			layers: [commonLibLayer, extLibLayer]
		});

		// Permissions to pull configurations from DynamoDB
		createLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['dynamodb:PutItem'],
				effect: iam.Effect.ALLOW,
				resources: [demoTable.tableArn]
			})
		);

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			createLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/************************************* Update Lambda **********************************/
		// Lambda to delete resource
		const updateLambda = new lambda.Function(this, 'UpdateResourceLambda', {
			runtime: lambda.Runtime.NODEJS_16_X,
			code: lambda.Code.fromAsset(this.basePathSfnLambdas.concat('/update')),
			handler: 'index.handler',
			timeout: Duration.seconds(600),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				TARGET_DYNAMODB_TABLE_NAME: demoTable.tableName,
				LOG_LEVEL: this.logLevel
			},
			layers: [commonLibLayer, extLibLayer]
		});

		// Permissions to pull configurations from DynamoDB
		updateLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['dynamodb:PutItem'],
				effect: iam.Effect.ALLOW,
				resources: [demoTable.tableArn]
			})
		);

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			updateLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/************************************ Delete Lambda ***********************************/
		// Lambda to delete resource
		const deleteLambda = new lambda.Function(this, 'DeleteResourceLambda', {
			runtime: lambda.Runtime.NODEJS_16_X,
			code: lambda.Code.fromAsset(this.basePathSfnLambdas.concat('/delete')),
			handler: 'index.handler',
			timeout: Duration.seconds(600),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				TARGET_DYNAMODB_TABLE_NAME: demoTable.tableName,
				LOG_LEVEL: this.logLevel
			},
			layers: [commonLibLayer, extLibLayer]
		});

		// Permissions to pull configurations from DynamoDB
		deleteLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['dynamodb:PutItem'],
				effect: iam.Effect.ALLOW,
				resources: [demoTable.tableArn]
			})
		);

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			deleteLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/***************************** Send CFN Response Lambda *******************************/
		// Lambda to retrieve replication mapping configs
		const sendCfnResponseLambda = new lambda.Function(this, 'SendCfnResponseLambda', {
			runtime: lambda.Runtime.NODEJS_16_X,
			code: lambda.Code.fromAsset(this.basePathSfnLambdas.concat('/send-cfn-response')),
			handler: 'index.handler',
			timeout: Duration.seconds(60),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				LOG_LEVEL: this.logLevel
			},
			layers: [commonLibLayer, extLibLayer]
		});

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			sendCfnResponseLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/********************************** Step Function *************************************/
		// Make a decision on whether to add/update/delete the custom resource
		const requestTypeChoiceState = new sfn.Choice(this, 'ProcessByEventType', {
			comment: 'Checks the event type and branches the processing accordingly'
		});

		/**
		 * Task to invoke CreateResourceLambda.
		 * Input: { "srcTablename": "" }
		 */
		const createTask = new tasks.LambdaInvoke(this, 'CreateResourceTask', {
			comment: 'Code to create resource',
			lambdaFunction: createLambda,
			// invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
			payloadResponseOnly: true,
			resultPath: '$.output',
			outputPath: '$'
		});

		/**
		 * Task to invoke UpdateResourceLambda.
		 * Input: { "srcTablename": "" }
		 */
		const updateTask = new tasks.LambdaInvoke(this, 'UpdateResourceTask', {
			comment: 'Code to update resource',
			lambdaFunction: updateLambda,
			// invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
			payloadResponseOnly: true,
			resultPath: '$.output',
			outputPath: '$'
		});

		/**
		 * Task to invoke DeleteResourceLambda.
		 * Input: { "srcTablename": "" }
		 */
		const deleteTask = new tasks.LambdaInvoke(this, 'DeleteResourceTask', {
			comment: 'Code to delete resource',
			lambdaFunction: deleteLambda,
			// invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
			payloadResponseOnly: true,
			resultPath: '$.output',
			outputPath: '$'
		});

		/**
		 * Task to invoke SendCfnResponseLambda.
		 * Input: { "uuid": "", "status": true }
		 */
		const sendCfnResponseTask = new tasks.LambdaInvoke(this, 'SendCfnResponseTask', {
			comment: 'Enables event source mapping for source DynamoDB table',
			lambdaFunction: sendCfnResponseLambda,
			// invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
			payloadResponseOnly: true,
			resultPath: '$.cfnResponse',
			outputPath: '$'
		});

		// Make a decision whether to repeat the metric pull task or end the workflow
		const scanChoiceState = new sfn.Choice(this, 'IsLastScan', {
			comment: 'Checks the event type and branches the processing accordingly'
		});

		// Done state
		const doneState = new sfn.Pass(this, 'Done');

		// Error handling
		createTask.addCatch(sendCfnResponseTask, {
			errors: ['States.ALL'],
			resultPath: '$.errorInfo'
		});

		updateTask.addCatch(sendCfnResponseTask, {
			errors: ['States.ALL'],
			resultPath: '$.errorInfo'
		});

		deleteTask.addCatch(sendCfnResponseTask, {
			errors: ['States.ALL'],
			resultPath: '$.errorInfo'
		});

		// Define order of the workflow
		requestTypeChoiceState
			.when(sfn.Condition.stringEquals('$.cfnEvent.RequestType', 'Create'), createTask)
			.when(sfn.Condition.stringEquals('$.cfnEvent.RequestType', 'Update'), updateTask)
			.when(sfn.Condition.stringEquals('$.cfnEvent.RequestType', 'Delete'), deleteTask)
			.otherwise(new sfn.Fail(this, 'RequestTypeNotSupported'));

		createTask.next(sendCfnResponseTask);
		updateTask.next(sendCfnResponseTask);
		deleteTask.next(sendCfnResponseTask);
		sendCfnResponseTask.next(doneState);

		// State Machine
		const customResourceStateMachine = new sfn.StateMachine(
			this,
			'CustomResourceStepFn',
			{
				definition: sfn.Chain.start(requestTypeChoiceState),
				tracingEnabled: true,
				logs: {
					level: sfn.LogLevel.ALL,
					destination: new logs.LogGroup(this, 'CustomResourceStepFnLogGroup')
				}
			}
		);

		// Suppress resource based findings automatically added by CDK
		NagSuppressions.addResourceSuppressions(
			customResourceStateMachine,
			[
				{
					id: 'AwsSolutions-IAM5',
					reason:
						'Suppress AwsSolutions-IAM5 resource and action based findings for StepFunction default policy',
					appliesTo: [
						'Resource::*',
						{
							regex: '/^Resource::<CreateResourceLambda(.*):\\*$/g'
						},
						{
							regex: '/^Resource::<UpdateResourceLambda(.*):\\*$/g'
						},
						{
							regex: '/^Resource::<DeleteResourceLambda(.*):\\*$/g'
						},
						{
							regex: '/^Resource::<SendCfnResponseLambda(.*):\\*$/g'
						}
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/***************************** Custom Resource Lambda *********************************/
		// Lambda to load seed data from DynamoDb to Aurora
		const customResourceLambda = new lambda.Function(this, 'CustomResourceLambda', {
			runtime: lambda.Runtime.NODEJS_16_X,
			code: lambda.Code.fromAsset(this.basePath.concat('/custom-resource-lambda')),
			handler: 'index.handler',
			timeout: Duration.seconds(600),
			environment: {
				ACCOUNT_ID: this.account,
				REGION: this.region,
				SFN_ARN: customResourceStateMachine.stateMachineArn
			},
			layers: [commonLibLayer, extLibLayer]
		});

		// Permissions to invoke step function
		customResourceLambda.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['states:StartExecution'],
				effect: iam.Effect.ALLOW,
				resources: [customResourceStateMachine.stateMachineArn]
			})
		);

		// Suppress rule for AWSLambdaBasicExecutionRole
		NagSuppressions.addResourceSuppressions(
			customResourceLambda,
			[
				{
					id: 'AwsSolutions-IAM4',
					reason: 'Suppress AwsSolutions-IAM4 for AWSLambdaBasicExecutionRole',
					appliesTo: [
						'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					]
				}
			],
			true
		);
		/**************************************************************************************/

		/************************** Custom Resource Definition *****************************/
		// When you intend to update CustomResource make sure that a new WaitCondition and
		// a new WaitConditionHandle resource is created to track CustomResource update.
		// The strategy we are using here is to create a hash of Custom Resource properties.
		// The resource names for WaitCondition and WaitConditionHandle carry this hash.
		// Anytime there is an update to the custom resource properties, a new hash is generated,
		// which automatically leads to new WaitCondition and WaitConditionHandle resources.
		const resourceName: string = getNormalizedResourceName('DemoCustomResource');
		const demoData = {
			pk: 'demo-sfn',
			sk: resourceName,
			ts: Date.now().toString()
		};
		const dataHash = hash(demoData);
		const wcHandle = new CfnWaitConditionHandle(this, 'WCHandle'.concat(dataHash));
		const customResource = new CustomResource(this, resourceName, {
			serviceToken: customResourceLambda.functionArn,
			properties: {
				DDBTable: String(demoTable.tableName),
				Data: JSON.stringify(demoData),
				CallbackUrl: wcHandle.ref
			}
		});

		// Note: AWS::CloudFormation::WaitCondition resource type does not support updates.
		new CfnWaitCondition(this, 'WC'.concat(dataHash), {
			count: 1,
			timeout: '300',
			handle: wcHandle.ref
		}).node.addDependency(customResource);
		/**************************************************************************************/

		/*********************************** List of Outputs **********************************/
		new CfnOutput(this, getNormalizedResourceName('OutSfnArn'), {
			description: 'Demo state machine ARN',
			exportName: getNormalizedCfnExportedName('DEMO-STATE-MACHINE-ARN'),
			value: customResourceStateMachine.stateMachineArn
		});
		/************************************* End Outputs ************************************/
	}
}
