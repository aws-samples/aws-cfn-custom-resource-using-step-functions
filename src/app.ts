#!/usr/bin/env node
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
import 'source-map-support/register';
import { App, Tags, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { CommonLibStackMain } from './lib/stack-main';
import { SfnStackMain } from './step-function/stack-main';

const app = new App();
const appName = app.node.tryGetContext('appName');
const stackPrefix: string = appName ? `${appName}` : 'demo';

new CommonLibStackMain(app, 'CommonLibStack', {
	stackName: `${stackPrefix}-common-lib`,
	description: 'Deploys common libaries and components'
});

new SfnStackMain(app, 'SfnCustomResourceStack', {
	stackName: `${stackPrefix}-sfn`,
	description: 'Deploys custom resource backed by step function'
});

// Tag all stacks
Tags.of(app).add('appName', app.node.tryGetContext('appName'));

// Integrate cdk-nag for compliance
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
