// Copyright (c) 2022 Akio Jinsenji

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { OpenAI, AzureOpenAI } from 'openai'

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

function CreateOpenAIClient(resourceName?: string): OpenAI
{
  if (IsAzureOpenAI) {
    core.info('Use Azure OpenAI API.')
    return new AzureOpenAI({
      apiKey: core.getInput('openai-api-key'),
      endpoint: `https://${resourceName}.openai.azure.com/`,
      deployment: core.getInput('deployment-id')
    })
  } else {
    core.info('Use OpenAI API.')
    return new OpenAI({
      apiKey: core.getInput('openai-api-key')
    });
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

    const displaySuggestions = core.getBooleanInput('display-suggestions')

    if (github.context.payload.action == 'opened') {
      core.info('Pull Request Opened.')
    } else {
      core.info('Pull Request Synchronized.')
    }

    core.info(`Optimization: ${IsOptimization}`)

    const client = CreateOpenAIClient(core.getInput('resource-name'))

    let system = `# input
- Result of running git diff command
# What to do
We would like to request the following
- A brief description of the updates based on the differences between the before and after revisions
`

    if (displaySuggestions) {
      system += `- Suggestions for improvements to make it better with the revisions
`
    }

    system += `
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
`

    if (displaySuggestions) {
      system += `
# Suggestions for improvement
## <file name(1)>
- <Suggestions for Improvement (1)>
- <Suggestions for Improvement (2)>
## <file name(2)>
- <Suggestions for Improvement(1)>
- <Suggestions for Improvement(2)>
`
    }

    core.startGroup('Git Update Status')
    await Exec('git', ['fetch', 'origin', github.context.payload.pull_request?.base.sha])
    await Exec('git', ['fetch', 'origin', github.context.payload.pull_request?.head.ref, '--depth=2'])
    await Exec('git', ['checkout', github.context.payload.pull_request?.head.ref])
    core.endGroup()

    const diff = await GetAllFileDiff(core.getInput('target').split(','))

    core.startGroup('Show prompt')
    core.info(`system: \n${system}\n`)
    core.info(`user: \n${diff}`)
    core.endGroup()

    core.startGroup('OpenAI API Request')
    let options: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: diff }
      ],
      model: core.getInput('model')
    }
    
    if (core.getInput('max-tokens')) {
      options.max_tokens = parseInt(core.getInput('max-tokens'))
    }

    if (core.getInput('temperature')) {
      options.temperature = parseFloat(core.getInput('temperature'))
    }

    if (core.getInput('top-p')) {
      options.top_p = parseFloat(core.getInput('top-p'))
    }

    core.info('GetChatCompletions')
    const result = await client.chat.completions.create(options)

    core.info('Response')
    const answer = result.choices[0].message?.content;

    if (!answer) {
      throw new Error('No answer received from the OpenAI API.')
    }
    core.info(`answer: \n${answer}`)

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
