import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { Configuration, OpenAIApi } from "openai";

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
        - 修正後の改善点のレビューを実施
        # 制約事項
        説明の際には以下の点を必ず考慮してください。
        - Markdown形式で出力してください。
        - 日本語で出力してください。
        - 複数のファイルの変更点がある場合は、ファイル単位で出力してください。
        - 更新内容の概要説明
            - 更新内容の概要説明では、先頭に「更新内容の概要は以下のとおりです。」としてください。
            - リスト形式で更新内容を出力してください。
            - 1つのリストアイテムには1つの更新内容を出力してください。
        - 改善点については自由に回答してください。
        `

        let diff: string = ''
        const options: exec.ExecOptions = {
          listeners: {
            stdout: (data: Buffer) => {
              diff += data.toString()
            }
          }
        }

        await exec.exec('git', ['fetch', 'origin', `${core.getInput('base-sha')}:BASE`])
        await exec.exec('git', ['diff', '--diff-filter=M', 'BASE', 'HEAD'], options)

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
        await fs.writeFile(body, answer, 'base64')
      
        process.env.GITHUB_TOKEN = core.getInput('github-token')
        await exec.exec('gh', ['pr', 'comment', '--body-file', body, `"${core.getInput('pull-request-url')}"`])
    } catch (ex: any) {
        core.setFailed(ex.message)
    }
}

Run()
