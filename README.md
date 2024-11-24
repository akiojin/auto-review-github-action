# auto-review-github-action

![Build][0] ![Test][1]

This action is an automated review action using OpenAI or Azure OpenAI.
It replies to a pull request with a summary of the pull request and suggestions for improvement.

This action requires an OpenAI API key.

## Submission details

The pull request summary and suggestions for improvement will be posted in the pull request comments as follows

![Execute](ss5.png)

## Usage

```yml
- uses: akiojin/auto-review-github-action@v1
  if: github.event_name == 'pull_request'
  continue-on-error: true
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    target: 'ts,yml'
```

In this example, the review is performed when there is an update to `*.ts` or `*.yml`.

You must also add `write` permission to `pull_requests` in your permission settings.

```yml
permissions:
  pull-requests: write
  ...
```

## Arguments

| Name             | Required | Type      | Default               | Description                                                                                                                                                                                                   |
| ---------------- | -------- | --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai-api-key` | `true`   | `string`  |                       | Specify the API key for OpenAI; for Azure OpenAI, specify the API key for Azure OpenAI.                                                                                                                       |
| `model`          | `false`  | `string`  | `gpt-4o`              | Specifies the ChatGPT model to use; can be omitted if Azure OpenAI is used. Possible values are: `gpt-4`, `gpt-3.5`, `gpt-3.5-turbo`.                                                                         |
| `github-token`   | `true`   | `string`  | `${{ github.token }}` | Specify a GitHub token. By default, `${{ github.token }}` is specified.                                                                                                                                       |
| `target`         | `true`   | `string`  |                       | Specify the extension of the file to be reviewed. If there are multiple files, specify them separated by commas. ex) `'md,txt,ts'`                                                                            |
| `language`       | `true`   | `string`  | `English`             | Specify the language in which the comments will be written. This value should be specified in plain language. ex) 日本語                                                                                         |
| `resource-name`  | `false`  | `string`  |                       | Specify the resource name when using Azure OpenAI.<br>The resource name corresponds to the <resource name> in the URL of the Azure OpenAI resource.<br>https://<resource name>.openai.azure.com/              |
| `deployment-id`  | `false`  | `string`  |                       | Specify a deployment name when using Azure OpenAI.                                                                                                                                                            |
| `optimize`       | `false`  | `boolean` | `true`                | Specifies whether to optimize the review of pull requests.<br>If optimized, only the differences from the parent commit are reviewed.<br>If not optimized, all differences from the base branch are reviewed. |

## Notes

ChatGPT has a limit on the number of messages that can be sent at one time.
Therefore, if there are significant changes, ChatGPT may return an error 400.
In that case, review cannot be performed, so please use `continue-on-error: true` to allow the step to proceed even if an error occurs.

## Review Optimization

You can optimize your pull request reviews.
Optimization offers the following advantages

- Only the differences can be reviewed.
- Reduces the number of tokens used for OpenAI

Optimization is enabled by default.

If no optimization is performed, the review will always be a difference from the base branch,
may contain similar reviews and consume more OpenAI tokens.

## How to create an API key for OpenAI

[OpenAI platform](https://platform.openai.com/)

View the list of API keys by clicking "Personal > View API keys" in the upper right corner of the above site.

![OpenAI platform](ss1.png)

Next, select "Create new secret key" to create a new API key.

![Create new secret key](ss2.png)

Enter an appropriate name in "Name" and select "Create secret key" to create a key.

![Create secret key](ss3.png)

Copy the created API key.

![Copy API key](ss4.png)

Set the copied API key to secret with an easy-to-understand name such as `OPENAI_API_KEY`.

----

[0]: https://github.com/akiojin/auto-review-github-action/actions/workflows/Build.yml/badge.svg
[1]: https://github.com/akiojin/auto-review-github-action/actions/workflows/PR.yml/badge.svg
