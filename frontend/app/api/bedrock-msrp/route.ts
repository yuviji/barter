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
        const { query } = await request.json();
        
        console.log("💰 Getting MSRP price for:", query);
        
        const msrpPrompt = `What is the current MSRP (Manufacturer's Suggested Retail Price) for ${query}? Return ONLY the numerical price value without any currency symbols or additional text. For example, if the MSRP is $15,000, return: 15000`;
        
        const msrpResult = await callClaude(msrpPrompt, 50);
        
        // Extract price from response
        const price = msrpResult.replace(/[^0-9]/g, '');
        const msrpPrice = parseInt(price) || 0;
        
        console.log(`✅ MSRP found: $${msrpPrice.toLocaleString()}`);
        
        return NextResponse.json({ msrpPrice });
        
    } catch (error) {
        console.error("❌ MSRP API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch MSRP price" },
            { status: 500 }
        );
    }
} 