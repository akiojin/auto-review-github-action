import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { Configuration, OpenAIApi } from "openai";

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
    const result = await Exec('git', ['diff', '--diff-filter=M', '--name-only', base, 'HEAD'])

    const pattern = `(${extensions.map(ext => `^.*\\.${ext}`).join('|')})$`
    const match = result.match(new RegExp(pattern, 'gm'))

    if (!match) {
        throw new Error(`Not found. Match Pattern="${pattern}"`)
    }

    let diff = ''

    for await (const file of match) {
        const data = await GetFileDiff(file, base)
        diff += data.toString()
    }

    return diff
}

async function Run()
{
    try {
        const configuration = new Configuration({
            apiKey: core.getInput('openai-api-key'),
        })

        const openai = new OpenAIApi(configuration)

        const system = `
        # 入力情報
        - git diffコマンドの実行結果
        # 実行する内容
        上記の内容から、以下の点を実行してください。
        - 修正前と修正後の差分から、更新内容の概要説明
        - 修正後の内容で、より良くするための改善案を提案
        # 制約事項
        説明の際には以下の点を必ず考慮してください。
        - Markdown形式で出力してください。
        - 日本語で出力してください。
        - 出力は「更新内容の概要説明」と「改善の提案」を見出しとしてください。
        - 更新内容の概要説明
            - 複数のファイルの変更点がある場合は、ファイル単位で出力してください。
            = ファイル単位で見出しをつけてください。
            - リスト形式で更新内容を出力してください。
            - 1つのリストアイテムには1つの更新内容を出力してください。
        - 改善の提案
            - 複数のファイルの変更点がある場合は、ファイル単位で出力してください。
            = ファイル単位で見出しをつけてください。
            - リスト形式で更新内容を出力してください。
            - 1つのリストアイテムには1つの改善提案を出力してください。
        `

        const baseSHA = core.getInput('base-sha')
        await exec.exec('git', ['fetch', 'origin', baseSHA])
        const diff = await GetAllFileDiff(baseSHA, core.getInput('target').split(','))

        const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: diff }
            ],
        });

        const answer = response.data.choices[0].message?.content;

        if (!answer) {
            throw new Error('Failed to get answer')
        }

        const body = tmp.tmpNameSync()
        await fs.writeFile(body, answer)

        process.env.GITHUB_TOKEN = core.getInput('github-token')

        core.startGroup('GitHub CLI Comment')
        await exec.exec('gh', ['pr', 'comment', '--body-file', body, core.getInput('pull-request-url')])
        core.endGroup()
    } catch (ex: any) {
        core.setFailed(ex.message)
    }
}

Run()
