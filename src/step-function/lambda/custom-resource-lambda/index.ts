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
import { CommonHandler } from './common-handler';
import * as cfnresponse from 'cfn-response';

console.info('Loading StepFunction backed custom resource lambda');

/**
 * Lambda handler
 */
exports.handler = async (event: any, context: any) => {
	let response;
	try {
		console.info(JSON.stringify(event));
		if (
			event.RequestType == 'Create' ||
			event.RequestType == 'Update' ||
			event.RequestType == 'Delete'
		) {
			const handler = new CommonHandler(event, context);
			response = await handler.handleRequest();
		}
	} catch (ex: any) {
		console.error(JSON.stringify(ex));
		response = {
			PhysicalResourceId: event.PhysicalResourceId ? event.PhysicalResourceId : undefined,
			Data: {},
			Status: cfnresponse.FAILED
		};
	}
	// Send response back to cloudformation
	await sendResponse(event, context, response);
	return response;
};

/**
 * Send response back to cloudformation
 * @param event
 * @param context
 * @param response
 */
export async function sendResponse(event: any, context: any, response: any) {
	await new Promise(() =>
		cfnresponse.send(
			event,
			context,
			response.Status,
			response.Data,
			response.PhysicalResourceId,
			false
		)
	);
	return;
}
