import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { Configuration, OpenAIApi } from "openai";

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

    const result = await Exec('git', ['diff', base, 'HEAD', '--', file])

    core.info(result)
    core.endGroup()

    return result;
}

async function GetAllFileDiff(base: string, extensions: string[]): Promise<string>
{
    core.startGroup('Extracting Difference Files')
    const result = await Exec('git', ['diff', '--diff-filter=M', '--name-only', base, 'HEAD'])
    const pattern = `(${extensions.map(ext => `^.*\\.${ext}`).join('|')})$`
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

async function Run(): Promise<void>
{
    try {
        if (core.getInput('openai-api-key') === '') {
            throw new Error('OpenAI API Key is not set.')
        }

        if (core.getInput('github-token') === '') {
            throw new Error('GitHub Token is not set.')
        }

        const configuration = new Configuration({
            apiKey: core.getInput('openai-api-key'),
        })

        const openai = new OpenAIApi(configuration)

        const system = `# input
        - Result of running git diff command
        # What to do
        In light of the above, we would like you to do the following
        - Brief description of the update based on the differences between the before and after modifications
        - Suggest improvements to make it better with the revised content.
        # constraint
        The following points must be observed when explaining.
        - Please output in Markdown format.
        - Answers should be output in ${ core.getInput('language') }.
        - Output headings should be "Summary Description of Update" and "Suggestions for Improvement".
        - Headings are output by ${ core.getInput('language') }.
        - If there are changes in multiple files, output file by file.
        = Headings should be attached to each file.
        - The contents are output in list format.
        - One list item outputs one content.`

        const baseSHA = core.getInput('base-sha')
        await Exec('git', ['fetch', 'origin', baseSHA])
        const diff = await GetAllFileDiff(baseSHA, core.getInput('target').split(','))

        const response = await openai.createChatCompletion({
            model: core.getInput('model'),
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: diff }
            ],
        });

        const answer = response.data.choices[0].message?.content;

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
