// Copyright (c) 2022 Akio Jinsenji

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { OpenAIClient, AzureKeyCredential, OpenAIKeyCredential } from "@azure/openai";

const IsOptimization = github.context.payload.action === 'synchronize' && core.getBooleanInput('optimize')
const IsAzureOpenAI = !!core.getInput('resource-name')

class SkipException extends Error
{
  constructor(message: string)
  {
    super(message)
  }
}

async function Exec(command: string, args: string[]): Promise<string>
{
  let output = ''

  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      }
    }
  }

  await exec.exec(command, args, options)

  return output
}

async function GetFileDiff(file: string): Promise<string>
{
  core.startGroup(`Diff ${file}`)

  let result = ''

  if (IsOptimization) {
    result = await Exec('git', ['diff', 'HEAD^..HEAD', '--', file])
  } else {
    result = await Exec('git', ['diff', github.context.payload.pull_request?.base.sha, 'HEAD', '--', file])
  }

  core.info(result)
  core.endGroup()

  return result;
}

async function GetAllFileDiff(extensions: string[]): Promise<string>
{
  core.startGroup('Extracting Difference Files')

  let result = ''

  if (IsOptimization) {
    result = await Exec('git', ['diff', '--diff-filter=MAD', '--name-only', 'HEAD^..HEAD'])
  } else {
    result = await Exec('git', ['diff', '--diff-filter=MAD', '--name-only', github.context.payload.pull_request?.base.sha, 'HEAD'])
  }

  const pattern = `(${extensions.map(ext => `^.*\\.${ext.trim()}`).join('|')})$`
  const match = result.match(new RegExp(pattern, 'gm'))
  core.endGroup()

  if (!match) {
    throw new SkipException(`Not found. Match Pattern="${pattern}"`)
  }

  let diff = ''

  for await (const file of match) {
    const data = await GetFileDiff(file)
    diff += data.toString()
  }

  return diff
}

function CreateOpenAIClient(resourceName?: string): OpenAIClient
{
  if (IsAzureOpenAI) {
    core.info('Use Azure OpenAI API.')
    return new OpenAIClient(
      `https://${resourceName}.openai.azure.com/`,
      new AzureKeyCredential(core.getInput('openai-api-key')))
  } else {
    core.info('Use OpenAI API.')
    return new OpenAIClient(new OpenAIKeyCredential(core.getInput('openai-api-key')));
  }
}

function ThrowIfParametersMissing(): void
{
  if (core.getInput('openai-api-key') === '') {
    throw new Error('OpenAI API Key is not set.')
  }

  if (core.getInput('github-token') === '') {
    throw new Error('GitHub Token is not set.')
  }
}

function ThrowIfNotSupportedEvent(): void
{
  if (github.context.eventName != 'pull_request') {
    throw new Error(`Unsupported event: ${github.context.eventName}`)
  } else if (github.context.payload.action != 'opened' && github.context.payload.action != 'synchronize') {
    throw new Error(`Unsupported action: ${github.context.payload.action}`)
  }
}

async function Run(): Promise<void>
{
  try {
    ThrowIfParametersMissing()
    ThrowIfNotSupportedEvent()

    if (github.context.payload.action == 'opened') {
      core.info('Pull Request Opened.')
    } else {
      core.info('Pull Request Synchronized.')
    }

    core.info(`Optimization: ${IsOptimization}`)

    const client = CreateOpenAIClient(core.getInput('resource-name'))

    const system = `
# input
- Result of running git diff command
# What to do
We would like to request the following
- A brief description of the updates based on the differences between the before and after revisions
- Suggestions for improvements to make it better with the revisions
# Restrictions
The following points must be observed in the explanation.
- All languages must be output in ${ core.getInput('language') } when answering.
- Output should be in Markdown format.
- Refer to the output as described in [Output Format].

[Output format]
# Update Summary
<Summary Description>
## <file name(1)>
- <Summary by file(1)>
- <Summary by file(2)>
## <file name(2)>
- <Summary by file(1)>
- <Summary by file(2)>

# Suggestions for improvement
## <file name(1)>
- <Suggestions for Improvement (1)>
- <Suggestions for Improvement (2)>
## <file name(2)>
- <Suggestions for Improvement(1)>
- <Suggestions for Improvement(2)>`

    core.startGroup('Git Update Status')
    await Exec('git', ['fetch', 'origin', github.context.payload.pull_request?.base.sha])
    await Exec('git', ['fetch', 'origin', github.context.payload.pull_request?.head.ref, '--depth=2'])
    await Exec('git', ['checkout', github.context.payload.pull_request?.head.ref])
    core.endGroup()

    const diff = await GetAllFileDiff(core.getInput('target').split(','))

    core.startGroup('OpenAI API Request')
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: diff }
    ]

    const result = await client.getChatCompletions(
      core.getInput('deployment-id') || core.getInput('model'), messages)

    const answer = result.choices[0].message?.content;

    if (!answer) {
      throw new Error('No answer received from the OpenAI API.')
    }
    core.info(`answer: ${answer}`)

    const body = tmp.tmpNameSync()
    await fs.writeFile(body, `${answer}\n\n **by ${IsAzureOpenAI ? 'Azure OpenAI' : 'OpenAI'}**`)
    core.endGroup()

    core.startGroup('GitHub CLI Comment')
    process.env.GITHUB_TOKEN = core.getInput('github-token')
    await exec.exec('gh', [
      'pr',
      'comment',
      '--body-file',
      body,
      github.context.payload.pull_request?.html_url || ''
    ]);
    core.endGroup()

    core.setOutput('output', answer)
  } catch (ex: any) {
    if (ex instanceof SkipException) {
      core.info(ex.message)
    } else {
      core.setFailed(ex.message)
    }
  }
}

Run()
