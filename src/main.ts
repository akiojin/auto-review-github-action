import * as core from '@actions/core'
import { Configuration, OpenAIApi } from "openai";

async function Run()
{
    try {
        const configuration = new Configuration({
            apiKey: core.getInput('api-key'),
        })

        const openai = new OpenAIApi(configuration)

        const response = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [{ role: "user", content: "こんにちは、あなたの名前を教えてください。" }],
        });
        
        const answer = response.data.choices[0].message?.content;
        console.log(answer);
    } catch (ex: any) {
        core.setFailed(ex.message)
    }
}

Run()
