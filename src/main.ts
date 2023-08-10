import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { OpenAIClient, AzureKeyCredential, OpenAIKeyCredential } from "@azure/openai";

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

async function GetFileDiff(file: string, base: string): Promise<string>
{
    core.startGroup(`Diff ${file}`)

    //const result = await Exec('git', ['diff', base, 'HEAD', '--', file])
    const result = await Exec('git', ['diff', 'HEAD^'])

    base = base.replace(/"/g, '')
//    github.context.payload.pull_request?.head.sha

    core.info(result)
    core.endGroup()

    return result;
}

async function GetAllFileDiff(base: string, extensions: string[]): Promise<string>
{
    core.startGroup('Extracting Difference Files')
    const result = await Exec('git', ['diff', '--diff-filter=M', '--name-only', base, 'HEAD'])
    const pattern = `(${extensions.map(ext => `^.*\\.${ext.trim()}`).join('|')})$`
    const match = result.match(new RegExp(pattern, 'gm'))
    core.endGroup()

    if (!match) {
        throw new SkipException(`Not found. Match Pattern="${pattern}"`)
    }

    let diff = ''

    for await (const file of match) {
        const data = await GetFileDiff(file, base)
        diff += data.toString()
    }

    return diff
}

function CreateOpenAIClient(resourceName?: string): OpenAIClient
{
    if (resourceName) {
        core.info('Use Azure OpenAI API.')
        return new OpenAIClient(
            `https://${resourceName}.openai.azure.com/`,
            new AzureKeyCredential(core.getInput('openai-api-key')))
    } else {
        core.info('Use OpenAI API.')
        return new OpenAIClient(new OpenAIKeyCredential(core.getInput('openai-api-key')));
    }
}

async function Run(): Promise<void>
{
    try {
        if (core.getInput('openai-api-key') === '') {
            throw new Error('OpenAI API Key is not set.')
        }

        if (core.getInput('github-token') === '') {
            throw new Error('GitHub Token is not set.')
        }

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

        const baseSHA = core.getInput('base-sha')
        await Exec('git', ['fetch', 'origin', baseSHA])
        const diff = await GetAllFileDiff(baseSHA, core.getInput('target').split(','))

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

        const body = tmp.tmpNameSync()
        await fs.writeFile(body, answer)

        process.env.GITHUB_TOKEN = core.getInput('github-token')

        core.startGroup('GitHub CLI Comment')
        await exec.exec('gh', ['pr', 'comment', '--body-file', body, core.getInput('pull-request-url')])
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
