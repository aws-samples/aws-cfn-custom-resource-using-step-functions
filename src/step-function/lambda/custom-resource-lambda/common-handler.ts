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
import { StartExecutionInput } from 'aws-sdk/clients/stepfunctions';
import * as cfnresponse from 'cfn-response';
import {
	DEFAULT_MAX_RETRY_ATTEMPTS,
	exponentialBackoffDelay
} from '/opt/common/common-util';
import { BaseHandler } from './base-handler';

/**
 * Handler for creating custom resource
 * Hands off the task to a step function
 */
export class CommonHandler extends BaseHandler {
	// Constructor
	constructor(event: any, context: any) {
		super(event, context);
	}

	/**
	 * Processes create resource event
	 */
	async handleRequest() {
		try {
			// Start seeder workflow execution
			await this.startExecution();

			return {
				PhysicalResourceId: this.event.PhysicalResourceId
					? this.event.PhysicalResourceId
					: this.buildPhysicalResourceId(),
				Data: {},
				Status: cfnresponse.SUCCESS
			};
		} catch (ex) {
			console.error(JSON.stringify(ex));
			throw ex;
		}
	}

	private buildPhysicalResourceId() {
		return 'loader-'.concat(this.event.ResourceProperties.DDBTable);
	}

	private async startExecution() {
		const input = {
			cfnEvent: this.event,
			cfnContext: this.context
		};
		const params: StartExecutionInput = {
			stateMachineArn: String(process.env.SFN_ARN),
			input: JSON.stringify(input)
		};
		let attempt = 0;
		let retry = false;
		do {
			try {
				const response = await this.sfnClient.startExecution(params).promise();
				console.debug('Response: ' + JSON.stringify(response));
				retry = false;
			} catch (ex: any) {
				if (ex.retryable && attempt < DEFAULT_MAX_RETRY_ATTEMPTS) {
					console.error(JSON.stringify(ex));
					retry = true;
					attempt = attempt + 1;
					await exponentialBackoffDelay(attempt, 5000);
				} else {
					retry = false;
					throw ex;
				}
			}
		} while (retry);
	}
}
