import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NextRequest, NextResponse } from "next/server";

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: "us-east-2",
    credentials: {
        accessKeyId: "AKIA6GBMGF2DNSV2DLOQ",
        secretAccessKey: "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",
    }
});

// Helper function to call Claude via Bedrock
async function callClaude(prompt: string, maxTokens: number = 2000): Promise<string> {
    try {
        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: maxTokens,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body)
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        return responseBody.content[0].text;
    } catch (error) {
        console.error("❌ Claude API Error:", error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    try {
        const { transcript, retailerName } = await request.json();
        
        console.log("📝 Summarizing call transcript for:", retailerName);
        
        const summaryPrompt = `
Please analyze this call transcript with ${retailerName} and provide a clear summary including:
- Product availability (in stock, out of stock, special order needed)
- Pricing information mentioned
- Key details about the conversation
- Next steps or follow-up actions needed

Transcript:
${transcript}

Provide a concise but comprehensive summary in markdown format.`;
        
        const summary = await callClaude(summaryPrompt, 1000);
        
        console.log("✅ Transcript summarized successfully");
        
        return NextResponse.json({ summary });
        
    } catch (error) {
        console.error("❌ Summarization API Error:", error);
        return NextResponse.json(
            { error: "Failed to summarize transcript" },
            { status: 500 }
        );
    }
} 