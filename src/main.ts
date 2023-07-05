import * as exec from '@actions/exec'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
async function Exec(command: string, args: string[]): Promise<string>
{
    let output = ''

    await exec.exec(command, args, {
        listeners: {
            stdout: (data: Buffer) => output += data.toString()
        }
    })

    return output
}

async function GetFileDiff(file: string, base: string): Promise<string>
{
    return await Exec('git', ['diff', base, 'HEAD', '--', file])
}

async function GetAllFileDiff(base: string, extensions: string[]): Promise<string>
{
    const result = await Exec('git', ['diff', '--diff-filter=M', '--name-only', base, 'HEAD'])

    const pattern = `(${extensions.map(ext => `^.*\\.${ext}`).join('|')})$`
    const match = result.match(new RegExp(pattern, 'gm'))

    if (!match) {
        throw new Error(`Not found. Match Pattern="${pattern}"`)
    }

    let diff = ''
    match.forEach(async (file, _) => {
        await GetFileDiff(file, base).then(data => diff += data.toString())
    })

    return diff
}

            apiKey: core.getInput('openai-api-key'),
        - 修正後の改善点のレビューを実施
        await exec.exec('git', ['fetch', 'origin', `${core.getInput('base-sha')}:BASE`])
        const diff = await GetAllFileDiff('BASE', core.getInput('target').split(','))
                { role: 'user', content: diff }


        if (!answer) {
            throw new Error('Failed to get answer')
        }

        const body = tmp.tmpNameSync()
        await fs.writeFile(body, answer, 'base64')

        process.env.GITHUB_TOKEN = core.getInput('github-token')
        await exec.exec('gh', ['pr', 'comment', '--body-file', body, `"${core.getInput('pull-request-url')}"`])