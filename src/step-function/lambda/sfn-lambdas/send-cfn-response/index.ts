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
import { EventProcessor } from './event-processor';
import * as https from 'https';
import * as url from 'url';

export async function handler(event: any, context: any) {
	console.info('Lambda handler start...');
	console.info('Event: ' + JSON.stringify(event));
	const response = await new EventProcessor(event, context).buildResponse();
	console.info('Response: ' + JSON.stringify(response));
	// Send response back to cloudformation
	await sendResponse(event.cfnEvent, context, response);
	return response;
}

/**
 * Send response back to cloudformation
 * @param event
 * @param context
 * @param response
 */
export async function sendResponse(event: any, context: any, response: any) {
	const responseBody = JSON.stringify({
		Status: response.Status,
		Reason: response.Reason,
		UniqueId: response.PhysicalResourceId,
		Data: JSON.stringify(response.Data)
	});
	console.debug('Response body:\n', responseBody);
	const parsedUrl = url.parse(event.ResourceProperties.CallbackUrl);
	const options = {
		hostname: parsedUrl.hostname,
		port: 443,
		path: parsedUrl.path,
		method: 'PUT',
		headers: {
			'content-type': '',
			'content-length': responseBody.length
		}
	};
	await new Promise(() => {
		const request = https.request(options, function (response: any) {
			console.debug('Status code: ' + response.statusCode);
			console.debug('Status message: ' + response.statusMessage);
			context.done();
		});
		request.on('error', function (error) {
			console.debug('send(..) failed executing https.request(..): ' + error);
			context.done();
		});
		request.write(responseBody);
		request.end();
	});
	return;
}
