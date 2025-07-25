// Client-side Bedrock + Tavily service that calls API routes
import { RetailerData } from "@/types/retailer";

// Fetch arbitrage data using Tavily + Bedrock Claude via API route
export async function fetchArbitrageData(query: string, location: string): Promise<RetailerData[]> {
  try {
    console.log("🔍 Fetching arbitrage data via Bedrock + Tavily...");
    
    const response = await fetch("/api/bedrock-arbitrage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, location }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`✅ Successfully fetched ${data.retailers.length} retailers`);
    console.log("📥 RAW API RESPONSE DATA:")
    console.log("=====================================")
    console.log(JSON.stringify(data.retailers, null, 2))
    console.log("=====================================")
    
    return data.retailers;
    
  } catch (error) {
    console.error("❌ Bedrock arbitrage data fetch error:", error);
    throw error;
  }
}

// Fetch MSRP price using Bedrock Claude via API route
export async function fetchMsrpPrice(query: string): Promise<number> {
  try {
    console.log("💰 Fetching MSRP price via Bedrock Claude...");
    
    const response = await fetch("/api/bedrock-msrp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`✅ MSRP price found: $${data.msrpPrice.toLocaleString()}`);
    return data.msrpPrice;
    
  } catch (error) {
    console.error("❌ Bedrock MSRP fetch error:", error);
    throw error;
  }
}

// Summarize call transcript using Bedrock Claude via API route
export async function summarizeCallTranscript(transcript: string, retailerName: string): Promise<string> {
  try {
    console.log("📝 Summarizing transcript via Bedrock Claude...");
    
    const response = await fetch("/api/bedrock-summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript, retailerName }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    console.log("✅ Transcript summarized successfully");
    return data.summary;
    
  } catch (error) {
    console.error("❌ Bedrock transcript summarization error:", error);
    throw error;
  }
} 