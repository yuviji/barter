import { tavily } from "@tavily/core";
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

// Initialize Tavily
const tvly = tavily({ apiKey: "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" });

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
        const { query, location } = await request.json();
        
        console.log("🔍 Starting Tavily search...");
        console.log(`📍 Query: "${query}" in ${location}`);
        
        // Search with Tavily
        const searchResults = await tvly.search(`${query} dealers retailers ${location} phone number contact`, {
            search_depth: "advanced",
            max_results: 10,
            include_answer: true,
            include_raw_content: true,
            include_domains: ["rolex.com", "tourneau.com", "bucherer.com", "tiffany.com"]
        });

        console.log("✅ Tavily search completed");
        console.log(`📊 Found ${searchResults.results?.length || 0} results`);

        // Analyze with Claude
        console.log("🧠 Analyzing with Claude...");
        const analysisPrompt = `
You are an expert data analyst. I have search results about ${query} dealers in ${location}. Please analyze this data and extract structured information for each dealer.

Return a JSON array where each object has this exact structure (use snake_case for database compatibility):
{
    "name": "Store Name",
    "phone_number": "Phone Number (10 digits only, no spaces/dashes)",
    "location": "Full Address", 
    "specialization": "luxury watches",
    "has_been_called": false,
    "call_transcript": "",
    "call_audio_recording": "",
    "call_summary": "",
    "price_offered": null
}

Here are the search results to analyze:
${JSON.stringify(searchResults, null, 2)}

INSTRUCTIONS:
1. Extract information directly from the provided search results
2. If phone number or address is missing, use your knowledge base to find correct contact information for that specific store
3. For well-known dealers, you likely know their locations and phone numbers
4. Only set phone_number to "NO_PHONE" if you genuinely don't have knowledge of that store's phone
5. Focus on actual authorized dealers/retailers
6. Ensure phone numbers are ONLY digits (e.g., "2125551234" not "(212) 555-1234")
7. Ensure addresses include street, city, state, and ZIP when possible
8. Set specialization to "luxury watches" for all retailers
9. Default has_been_called to false, call_transcript to "", call_audio_recording to "", call_summary to "", price_offered to null
10. CRITICAL: Never return null for name, phone_number, or location - these fields are required

Return ONLY the JSON array, no other text.`;

        const analysisResult = await callClaude(analysisPrompt, 4000);
        
        console.log("🧠 Raw Claude Response:");
        console.log("=====================================");
        console.log(analysisResult);
        console.log("=====================================");
        
        // Parse and clean the result
        let retailers = [];
        try {
            const cleanedResult = analysisResult.replace(/```json\n?|\n?```/g, '').trim();
            console.log("🔧 Cleaned JSON for parsing:");
            console.log(cleanedResult);
            
            retailers = JSON.parse(cleanedResult);
            console.log("✅ Parsed retailers data:");
            console.log(JSON.stringify(retailers, null, 2));
        } catch (parseError) {
            console.error("❌ Failed to parse Claude response:", parseError);
            console.error("Raw response that failed:", analysisResult.substring(0, 500));
            throw new Error("Failed to parse analysis results");
        }

        // Generate fake phone numbers for retailers without real phone numbers
        function generateFakeNYCNumber(): string {
            const prefixes = ["212", "917", "646"];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
            return `${prefix}${suffix}`;
        }

        // Validate and process retailers to ensure database constraints
        console.log("🔍 Validating and processing retailers...");
        
        retailers = retailers
            .filter((retailer: any) => {
                // Filter out retailers with missing required fields
                if (!retailer.name || !retailer.location) {
                    console.warn("❌ Filtering out retailer with missing required fields:", retailer);
                    return false;
                }
                return true;
            })
            .map((retailer: any) => {
                const processed = {
                    ...retailer,
                    // Ensure required fields are never null/empty
                    name: retailer.name || "Unknown Store",
                    location: retailer.location || "Address Not Available",
                    phone_number: retailer.phone_number === "NO_PHONE" || !retailer.phone_number 
                        ? generateFakeNYCNumber()
                        : retailer.phone_number.replace(/[^0-9]/g, ""),
                    // Ensure boolean and nullable fields have proper defaults
                    has_been_called: false,
                    call_transcript: "",
                    call_audio_recording: "",
                    call_summary: "",
                    price_offered: null,
                    specialization: retailer.specialization || "luxury watches"
                };
                
                console.log("✅ Processed retailer:", JSON.stringify(processed, null, 2));
                return processed;
            });

        // Always add Agnihotri Jewelers as the first retailer (test data)
        const agnihotriJewelers = {
            name: "Agnihotri Jewelers",
            phone_number: "4698805468",
            location: "387 Park Avenue South New York, New York",
            specialization: "luxury watches",
            has_been_called: false,
            call_transcript: "",
            call_audio_recording: "",
            call_summary: "",
            price_offered: null
        };

        // Add Agnihotri first, then other retailers
        const finalRetailers = [agnihotriJewelers, ...retailers];

        console.log(`✅ Analysis complete! Found ${finalRetailers.length} total retailers (including Agnihotri)`);
        console.log("📤 Final response data:", JSON.stringify({ retailers: finalRetailers }, null, 2));
        
        return NextResponse.json({ retailers: finalRetailers });
        
    } catch (error) {
        console.error("❌ API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch arbitrage data" },
            { status: 500 }
        );
    }
} 