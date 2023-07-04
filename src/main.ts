import * as core from '@actions/core'
//import * as exec from '@actions/exec'
import { Configuration, OpenAIApi } from "openai";

async function Run()
{
    try {
        const configuration = new Configuration({
            apiKey: core.getInput('api-key'),
        })

        const openai = new OpenAIApi(configuration)

        const system = `
        # 入力情報
        - git diffコマンドの実行結果
        # 実行する内容
        上記の内容から、以下の点を実行してください。
        - 修正前と修正後の差分から、更新内容の概要説明
        - 修正後のソースコードの改善点を説明
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

/*        let output: string = ''
        const options: exec.ExecOptions = {
          listeners: {
            stdout: (data: Buffer) => {
              output += data.toString()
            }
          }
        }
      
        await exec.exec('git', ['diff', 'HEAD', core.getInput('base-sha')], options)*/
      
        const test = `
        diff --git a/_after.txt b/_after.txt
        new file mode 100644
        index 0000000..fab6351
        --- /dev/null
        +++ b/_after.txt
        @@ -0,0 +1,15 @@
        +name: Build
        +
        +on: push
        +
        +jobs:
        +  Build:
        +    runs-on: ubuntu-latest
        +    timeout-minutes: 5
        +
        +    steps:
        +      - uses: actions/checkout@v3
        +      - uses: actions/setup-node@v3
        +        with:
        +          node-version: 16
        +      - run: npm run build
        diff --git a/_before.txt b/_before.txt
        new file mode 100644
        index 0000000..e69de29
        diff --git a/_diff.txt b/_diff.txt
        new file mode 100644
        index 0000000..91398aa
        --- /dev/null
        +++ b/_diff.txt
        @@ -0,0 +1,16 @@
        +0a1,15
        +> name: Build
        +> 
        +> on: push
        +> 
        +> jobs:
        +>   Build:
        +>     runs-on: ubuntu-latest
        +>     timeout-minutes: 5
        +> 
        +>     steps:
        +>       - uses: actions/checkout@v3
        +>       - uses: actions/setup-node@v3
        +>         with:
        +>           node-version: 16
        +>       - run: npm run build
        diff --git a/package-lock.json b/package-lock.json
        index 4f9d152..150bab3 100644
        --- a/package-lock.json
        +++ b/package-lock.json
        @@ -10,14 +10,14 @@
               "license": "MIT",
               "devDependencies": {
                 "@actions/core": "1.10.0",
        -        "@commitlint/cli": "17.6.6",
        -        "@commitlint/config-conventional": "17.6.6",
        -        "@types/node": "20.3.3",
        +        "@commitlint/cli": "17.6.5",
        +        "@commitlint/config-conventional": "17.6.5",
        +        "@types/node": "20.2.5",
                 "@vercel/ncc": "0.36.1",
                 "husky": "8.0.3",
                 "openai": "^3.3.0",
                 "rimraf": "5.0.1",
        -        "typescript": "5.1.6"
        +        "typescript": "5.0.4"
               }
             },
             "node_modules/@actions/core": {
        @@ -137,13 +137,13 @@
               }
             },
             "node_modules/@commitlint/cli": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/cli/-/cli-17.6.6.tgz",
        -      "integrity": "sha512-sTKpr2i/Fjs9OmhU+beBxjPavpnLSqZaO6CzwKVq2Tc4UYVTMFgpKOslDhUBVlfAUBfjVO8ParxC/MXkIOevEA==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/cli/-/cli-17.6.5.tgz",
        +      "integrity": "sha512-3PQrWr/uo6lzF5k7n5QuosCYnzaxP9qGBp3jhWP0Vmsa7XA6wrl9ccPqfQyXpSbQE3zBROVO3TDqgPKe4tfmLQ==",
               "dev": true,
               "dependencies": {
                 "@commitlint/format": "^17.4.4",
        -        "@commitlint/lint": "^17.6.6",
        +        "@commitlint/lint": "^17.6.5",
                 "@commitlint/load": "^17.5.0",
                 "@commitlint/read": "^17.5.1",
                 "@commitlint/types": "^17.4.4",
        @@ -161,9 +161,9 @@
               }
             },
             "node_modules/@commitlint/config-conventional": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/config-conventional/-/config-conventional-17.6.6.tgz",
        -      "integrity": "sha512-phqPz3BDhfj49FUYuuZIuDiw+7T6gNAEy7Yew1IBHqSohVUCWOK2FXMSAExzS2/9X+ET93g0Uz83KjiHDOOFag==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/config-conventional/-/config-conventional-17.6.5.tgz",
        +      "integrity": "sha512-Xl9H9KLl86NZm5CYNTNF9dcz1xelE/EbvhWIWcYxG/rn3UWYWdWmmnX2q6ZduNdLFSGbOxzUpIx61j5zxbeXxg==",
               "dev": true,
               "dependencies": {
                 "conventional-changelog-conventionalcommits": "^5.0.0"
        @@ -225,25 +225,25 @@
               }
             },
             "node_modules/@commitlint/is-ignored": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/is-ignored/-/is-ignored-17.6.6.tgz",
        -      "integrity": "sha512-4Fw875faAKO+2nILC04yW/2Vy/wlV3BOYCSQ4CEFzriPEprc1Td2LILmqmft6PDEK5Sr14dT9tEzeaZj0V56Gg==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/is-ignored/-/is-ignored-17.6.5.tgz",
        +      "integrity": "sha512-CQvAPt9gX7cuUbMrIaIMKczfWJqqr6m8IlJs0F2zYwyyMTQ87QMHIj5jJ5HhOaOkaj6dvTMVGx8Dd1I4xgUuoQ==",
               "dev": true,
               "dependencies": {
                 "@commitlint/types": "^17.4.4",
        -        "semver": "7.5.2"
        +        "semver": "7.5.0"
               },
               "engines": {
                 "node": ">=v14"
               }
             },
             "node_modules/@commitlint/lint": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/lint/-/lint-17.6.6.tgz",
        -      "integrity": "sha512-5bN+dnHcRLkTvwCHYMS7Xpbr+9uNi0Kq5NR3v4+oPNx6pYXt8ACuw9luhM/yMgHYwW0ajIR20wkPAFkZLEMGmg==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/lint/-/lint-17.6.5.tgz",
        +      "integrity": "sha512-BSJMwkE4LWXrOsiP9KoHG+/heSDfvOL/Nd16+ojTS/DX8HZr8dNl8l3TfVr/d/9maWD8fSegRGtBtsyGuugFrw==",
               "dev": true,
               "dependencies": {
        -        "@commitlint/is-ignored": "^17.6.6",
        +        "@commitlint/is-ignored": "^17.6.5",
                 "@commitlint/parse": "^17.6.5",
                 "@commitlint/rules": "^17.6.5",
                 "@commitlint/types": "^17.4.4"
        @@ -556,9 +556,9 @@
               "dev": true
             },
             "node_modules/@types/node": {
        -      "version": "20.3.3",
        -      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.3.3.tgz",
        -      "integrity": "sha512-wheIYdr4NYML61AjC8MKj/2jrR/kDQri/CIpVoZwldwhnIrD/j9jIU5bJ8yBKuB2VhpFV7Ab6G2XkBjv9r9Zzw==",
        +      "version": "20.2.5",
        +      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.2.5.tgz",
        +      "integrity": "sha512-JJulVEQXmiY9Px5axXHeYGLSjhkZEnD+MDPDGbCbIAbMslkKwmygtZFy1X6s/075Yo94sf8GuSlFfPzysQrWZQ==",
               "dev": true
             },
             "node_modules/@types/normalize-package-data": {
        @@ -2192,9 +2192,9 @@
               ]
             },
             "node_modules/semver": {
        -      "version": "7.5.2",
        -      "resolved": "https://registry.npmjs.org/semver/-/semver-7.5.2.tgz",
        -      "integrity": "sha512-SoftuTROv/cRjCze/scjGyiDtcUyxw1rgYQSZY7XTmtR5hX+dm76iDbTH8TkLPHCQmlbQVSSbNZCPM2hb0knnQ==",
        +      "version": "7.5.0",
        +      "resolved": "https://registry.npmjs.org/semver/-/semver-7.5.0.tgz",
        +      "integrity": "sha512-+XC0AD/R7Q2mPSRuy2Id0+CGTZ98+8f+KvwirxOKIEyid+XSx6HbC63p+O4IndTHuX5Z+JxQ0TghCkO5Cg/2HA==",
               "dev": true,
               "dependencies": {
                 "lru-cache": "^6.0.0"
        @@ -2480,16 +2480,16 @@
               }
             },
             "node_modules/typescript": {
        -      "version": "5.1.6",
        -      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.1.6.tgz",
        -      "integrity": "sha512-zaWCozRZ6DLEWAWFrVDz1H6FVXzUSfTy5FUMWsQlU8Ym5JP9eO4xkTIROFCQvhQf61z6O/G6ugw3SgAnvvm+HA==",
        +      "version": "5.0.4",
        +      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.0.4.tgz",
        +      "integrity": "sha512-cW9T5W9xY37cc+jfEnaUvX91foxtHkza3Nw3wkoF4sSlKn0MONdkdEndig/qPBWXNkmplh3NzayQzCiHM4/hqw==",
               "dev": true,
               "bin": {
                 "tsc": "bin/tsc",
                 "tsserver": "bin/tsserver"
               },
               "engines": {
        -        "node": ">=14.17"
        +        "node": ">=12.20"
               }
             },
             "node_modules/universalify": {
        @@ -2763,13 +2763,13 @@
               }
             },
             "@commitlint/cli": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/cli/-/cli-17.6.6.tgz",
        -      "integrity": "sha512-sTKpr2i/Fjs9OmhU+beBxjPavpnLSqZaO6CzwKVq2Tc4UYVTMFgpKOslDhUBVlfAUBfjVO8ParxC/MXkIOevEA==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/cli/-/cli-17.6.5.tgz",
        +      "integrity": "sha512-3PQrWr/uo6lzF5k7n5QuosCYnzaxP9qGBp3jhWP0Vmsa7XA6wrl9ccPqfQyXpSbQE3zBROVO3TDqgPKe4tfmLQ==",
               "dev": true,
               "requires": {
                 "@commitlint/format": "^17.4.4",
        -        "@commitlint/lint": "^17.6.6",
        +        "@commitlint/lint": "^17.6.5",
                 "@commitlint/load": "^17.5.0",
                 "@commitlint/read": "^17.5.1",
                 "@commitlint/types": "^17.4.4",
        @@ -2781,9 +2781,9 @@
               }
             },
             "@commitlint/config-conventional": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/config-conventional/-/config-conventional-17.6.6.tgz",
        -      "integrity": "sha512-phqPz3BDhfj49FUYuuZIuDiw+7T6gNAEy7Yew1IBHqSohVUCWOK2FXMSAExzS2/9X+ET93g0Uz83KjiHDOOFag==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/config-conventional/-/config-conventional-17.6.5.tgz",
        +      "integrity": "sha512-Xl9H9KLl86NZm5CYNTNF9dcz1xelE/EbvhWIWcYxG/rn3UWYWdWmmnX2q6ZduNdLFSGbOxzUpIx61j5zxbeXxg==",
               "dev": true,
               "requires": {
                 "conventional-changelog-conventionalcommits": "^5.0.0"
        @@ -2830,22 +2830,22 @@
               }
             },
             "@commitlint/is-ignored": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/is-ignored/-/is-ignored-17.6.6.tgz",
        -      "integrity": "sha512-4Fw875faAKO+2nILC04yW/2Vy/wlV3BOYCSQ4CEFzriPEprc1Td2LILmqmft6PDEK5Sr14dT9tEzeaZj0V56Gg==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/is-ignored/-/is-ignored-17.6.5.tgz",
        +      "integrity": "sha512-CQvAPt9gX7cuUbMrIaIMKczfWJqqr6m8IlJs0F2zYwyyMTQ87QMHIj5jJ5HhOaOkaj6dvTMVGx8Dd1I4xgUuoQ==",
               "dev": true,
               "requires": {
                 "@commitlint/types": "^17.4.4",
        -        "semver": "7.5.2"
        +        "semver": "7.5.0"
               }
             },
             "@commitlint/lint": {
        -      "version": "17.6.6",
        -      "resolved": "https://registry.npmjs.org/@commitlint/lint/-/lint-17.6.6.tgz",
        -      "integrity": "sha512-5bN+dnHcRLkTvwCHYMS7Xpbr+9uNi0Kq5NR3v4+oPNx6pYXt8ACuw9luhM/yMgHYwW0ajIR20wkPAFkZLEMGmg==",
        +      "version": "17.6.5",
        +      "resolved": "https://registry.npmjs.org/@commitlint/lint/-/lint-17.6.5.tgz",
        +      "integrity": "sha512-BSJMwkE4LWXrOsiP9KoHG+/heSDfvOL/Nd16+ojTS/DX8HZr8dNl8l3TfVr/d/9maWD8fSegRGtBtsyGuugFrw==",
               "dev": true,
               "requires": {
        -        "@commitlint/is-ignored": "^17.6.6",
        +        "@commitlint/is-ignored": "^17.6.5",
                 "@commitlint/parse": "^17.6.5",
                 "@commitlint/rules": "^17.6.5",
                 "@commitlint/types": "^17.4.4"
        @@ -3088,9 +3088,9 @@
               "dev": true
             },
             "@types/node": {
        -      "version": "20.3.3",
        -      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.3.3.tgz",
        -      "integrity": "sha512-wheIYdr4NYML61AjC8MKj/2jrR/kDQri/CIpVoZwldwhnIrD/j9jIU5bJ8yBKuB2VhpFV7Ab6G2XkBjv9r9Zzw==",
        +      "version": "20.2.5",
        +      "resolved": "https://registry.npmjs.org/@types/node/-/node-20.2.5.tgz",
        +      "integrity": "sha512-JJulVEQXmiY9Px5axXHeYGLSjhkZEnD+MDPDGbCbIAbMslkKwmygtZFy1X6s/075Yo94sf8GuSlFfPzysQrWZQ==",
               "dev": true
             },
             "@types/normalize-package-data": {
        @@ -4276,9 +4276,9 @@
               "dev": true
             },
             "semver": {
        -      "version": "7.5.2",
        -      "resolved": "https://registry.npmjs.org/semver/-/semver-7.5.2.tgz",
        -      "integrity": "sha512-SoftuTROv/cRjCze/scjGyiDtcUyxw1rgYQSZY7XTmtR5hX+dm76iDbTH8TkLPHCQmlbQVSSbNZCPM2hb0knnQ==",
        +      "version": "7.5.0",
        +      "resolved": "https://registry.npmjs.org/semver/-/semver-7.5.0.tgz",
        +      "integrity": "sha512-+XC0AD/R7Q2mPSRuy2Id0+CGTZ98+8f+KvwirxOKIEyid+XSx6HbC63p+O4IndTHuX5Z+JxQ0TghCkO5Cg/2HA==",
               "dev": true,
               "requires": {
                 "lru-cache": "^6.0.0"
        @@ -4486,9 +4486,9 @@
               "dev": true
             },
             "typescript": {
        -      "version": "5.1.6",
        -      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.1.6.tgz",
        -      "integrity": "sha512-zaWCozRZ6DLEWAWFrVDz1H6FVXzUSfTy5FUMWsQlU8Ym5JP9eO4xkTIROFCQvhQf61z6O/G6ugw3SgAnvvm+HA==",
        +      "version": "5.0.4",
        +      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.0.4.tgz",
        +      "integrity": "sha512-cW9T5W9xY37cc+jfEnaUvX91foxtHkza3Nw3wkoF4sSlKn0MONdkdEndig/qPBWXNkmplh3NzayQzCiHM4/hqw==",
               "dev": true
             },
             "universalify": {
        diff --git a/package.json b/package.json
        index 1596529..4b9244c 100644
        --- a/package.json
        +++ b/package.json
        @@ -25,14 +25,14 @@
           "homepage": "https://github.com/akiojin/auto-review-github-action#readme",
           "devDependencies": {
             "@actions/core": "1.10.0",
        -    "@commitlint/cli": "17.6.6",
        -    "@commitlint/config-conventional": "17.6.6",
        -    "@types/node": "20.3.3",
        +    "@commitlint/cli": "17.6.5",
        +    "@commitlint/config-conventional": "17.6.5",
        +    "@types/node": "20.2.5",
             "@vercel/ncc": "0.36.1",
             "husky": "8.0.3",
             "openai": "^3.3.0",
             "rimraf": "5.0.1",
        -    "typescript": "5.1.6"
        +    "typescript": "5.0.4"
           },
           "private": true
         }
        `

        const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: test }
            ],
        });
        
        const answer = response.data.choices[0].message?.content;
        console.log(answer);
    } catch (ex: any) {
        core.setFailed(ex.message)
    }
}

Run()
