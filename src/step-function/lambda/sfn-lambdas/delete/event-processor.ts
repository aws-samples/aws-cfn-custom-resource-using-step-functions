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
import * as AWS from 'aws-sdk';
import { PutItemInput, PutItemOutput } from 'aws-sdk/clients/dynamodb';
import {
	exponentialBackoffDelay,
	DEFAULT_MAX_RETRY_ATTEMPTS
} from '/opt/common/common-util';

export class EventProcessor {
	private event: any;
	private context: any;
	protected dynamodbClient: AWS.DynamoDB;

	constructor(event: any, context: any) {
		this.event = event;
		this.context = context;
		this.dynamodbClient = new AWS.DynamoDB();
	}

	async process() {
		console.info('Process delete resource request...');
		await this.updateDynamoDB();
		return 'SUCCESS';
	}

	private async updateDynamoDB() {
		console.info('Update entry in the DynamoDB Table...');
		const data = JSON.parse(this.event.cfnEvent.ResourceProperties.Data);
		const params: PutItemInput = {
			TableName: this.event.cfnEvent.ResourceProperties.DDBTable,
			Item: {
				pk: {
					S: data.pk
				},
				sk: {
					S: data.sk
				},
				ts: {
					S: data.ts
				},
				lastOperation: {
					S: 'delete'
				}
			}
		};
		console.debug('Put item input: ' + JSON.stringify(params));
		let response: PutItemOutput = {};
		let attempt = 0;
		let retry = false;
		do {
			try {
				response = await this.dynamodbClient.putItem(params).promise();
				retry = false;
			} catch (ex: any) {
				if (ex.retryable && attempt < DEFAULT_MAX_RETRY_ATTEMPTS) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 2000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry);
		return response;
	}
}
