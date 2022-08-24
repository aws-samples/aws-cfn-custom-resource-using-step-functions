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
/**
 * Maximum number of retry attempts to create/update/delete a resource
 */
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

/**
 * Default delay in milliseconds
 */
export const DEFAULT_DELAY_IN_MILLIS = 30000;

/**
 * Default base delay in milliseconds for retries.
 * This will then be multiplied by the value of delay factor to the power of retry attempt
 */
const DEFAULT_BASE_DELAY_IN_MILLIS = 20000;

/**
 * Default delay factor.
 * Power of delay factor to the retry attempt (DELAY_FACTOR ** RETRY ATTEMPT)
 * is multiplied by base delay to get final expoenential backoff delay
 */
const DEFAULT_DELAY_FACTOR = 2;

/**
 * Function to introduce delay in milliseconds
 * @param ms
 */
export async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Function to introduce exponential backoff delay in milliseconds
 * @param retryAttempt
 * @param baseDelayInMs
 * @param delayFactor
 * @returns
 */
export async function exponentialBackoffDelay(
	retryAttempt: number,
	baseDelayInMs?: number,
	delayFactor?: number
) {
	// Initialize Base Delay
	let baseDelay: number;
	if (baseDelayInMs) {
		baseDelay = baseDelayInMs;
	} else {
		baseDelay = DEFAULT_BASE_DELAY_IN_MILLIS;
	}

	// Initialize delay factor.
	let factor: number;
	if (delayFactor) {
		factor = delayFactor;
	} else {
		factor = DEFAULT_DELAY_FACTOR;
	}

	// Calculate delay
	const delay: number = baseDelay * factor ** retryAttempt;
	return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Method that takes Custom Resource Event as input and figures out
 * which tags are to be added and/or removed for the resource.
 * Property 'Tags' is expected to be part of Customer Resource Properties in the event
 * @param event
 * @returns
 */
export function retrieveTagsToBeUpdated(event: any) {
	const newTags: Map<string, string> = mapJsonTagsToMapObj(event.ResourceProperties.Tags);
	const tagsToBeRemoved: Map<string, string> = new Map<string, string>();
	if (event.OldResourceProperties && event.OldResourceProperties.Tags) {
		const oldTags: Map<string, string> = mapJsonTagsToMapObj(
			event.OldResourceProperties.Tags
		);
		for (const tag of oldTags.entries()) {
			if (!newTags.has(tag[0])) {
				tagsToBeRemoved.set(tag[0], tag[1]);
			}
		}
	}
	return {
		tagsToBeAdded: newTags,
		tagsToBeRemoved: tagsToBeRemoved
	};
}

/**
 * Private method that maps Tags JSON string from event to a Map Object
 * @param tagsJson
 * @returns
 */
function mapJsonTagsToMapObj(tagsJson: string) {
	const tags = JSON.parse(tagsJson);
	const tagsMap: Map<string, string> = new Map<string, string>();
	for (const tag of tags) {
		tagsMap.set(tag.key, tag.value);
	}
	return tagsMap;
}
