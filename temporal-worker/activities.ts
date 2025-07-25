// Temporal Activities - Business Logic from your existing API routes
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { createClient } from '@supabase/supabase-js';

// Types (copy from your existing types)
export interface RetailerData {
  name: string;
  phone_number: string;
  location: string;
  specialization: string;
  has_been_called: boolean;
  call_transcript: string;
  call_audio_recording: string;
  call_summary: string;
  price_offered: number | null;
}

export interface CallResult {
  retailerId: string;
  success: boolean;
  transcript?: string;
  audioUrl?: string;
  priceOffered?: number | null;
  callSummary?: string;
  callStatus?: string;
}

interface VAPICallResponse {
  success: boolean;
  status: string;
  summary?: string;
  transcript?: string;
}

// Initialize clients (same as your existing API routes)
const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-2',
  credentials: {
    accessKeyId: "AKIA6GBMGF2DNSV2DLOQ",
    secretAccessKey: "396B/x+mIES8uP0ZtKztKSB1Zo8Iaubr2uVXFGy0",
  }
});

// Tavily MCP will be used instead of API - MCP tools will be available in execution context

// Initialize Supabase client
const supabaseUrl = "https://xpuwkidotxibgucnsxmg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdXdraWRvdHhpYmd1Y25zeG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjQ0NTgsImV4cCI6MjA2NDI0MDQ1OH0.NQuMB5qENF6MX4yQotQlKprEKGiEnwF8QTK2AFaVspE";
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function (copy from your existing API route)
async function callClaude(prompt: string, maxTokens: number = 4000): Promise<string> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };

  const command = new InvokeModelCommand({
    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    body: JSON.stringify(body)
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

// Activity 1: Find Retailers (from your bedrock-arbitrage API route)
export async function findRetailers(query: string, location: string): Promise<RetailerData[]> {
  console.log('🔍 Activity: Finding retailers...', { query, location });
  
  // TODO: Replace with Tavily MCP search tool
  // const searchResults = await tavilySearch({
  //   query: `${query} dealers authorized retailers in ${location} with contact information phone numbers`,
  //   maxResults: 8
  // });
  
  // Temporary placeholder - replace with actual MCP search results
  const searchResults = { results: [] };

  // Claude analysis (copy your existing prompt)
  const analysisPrompt = `You are an expert data analyst. I have search results about ${query} dealers in ${location}. Please analyze this data and extract structured information for each dealer.

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
  
  console.log("🧠 TEMPORAL ACTIVITY - Raw Claude Response:");
  console.log("================================================");
  console.log(analysisResult);
  console.log("================================================");
  console.log("📏 Response length:", analysisResult.length);
  console.log("🔤 Response type:", typeof analysisResult);
  
  const cleanedResult = analysisResult.replace(/```json\n?|\n?```/g, '').trim();
  console.log("🧹 Cleaned Claude Response:");
  console.log("================================================");
  console.log(cleanedResult);
  console.log("================================================");
  
  let retailers;
  try {
    retailers = JSON.parse(cleanedResult);
    console.log("✅ Successfully parsed JSON from Claude");
    console.log("📊 Parsed retailers count:", retailers.length);
  } catch (error) {
    console.error("❌ Failed to parse Claude response as JSON:", error);
    console.error("❌ Problematic string:", cleanedResult);
    throw new Error("Claude returned invalid JSON");
  }

  // Add Agnihotri Jewelers as first (copy your existing logic)
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

  const finalRetailers = [agnihotriJewelers, ...retailers];
  
  // DEBUGGING: Verify all retailers have has_been_called = false
  console.log('🔍 FIND RETAILERS - Final retailer list with call status:');
  finalRetailers.forEach((retailer, index) => {
    console.log(`   ${index + 1}. ${retailer.name}: has_been_called = ${retailer.has_been_called}`);
  });

  return finalRetailers;
}

// Activity 2: Get MSRP Price (from your bedrock-msrp API route)
export async function getMsrpPrice(query: string): Promise<number | null> {
  console.log('💰 Activity: Getting MSRP price...', { query });
  
  const msrpPrompt = `What is the current MSRP (Manufacturer's Suggested Retail Price) for a ${query}? 
  
Please respond with ONLY a number (no currency symbols, no text, no explanations). 
If you cannot find a specific MSRP, respond with "null".

Examples of good responses:
- 8950
- 12500
- null`;

  const msrpResult = await callClaude(msrpPrompt, 100);
  
  const price = parseFloat(msrpResult.trim());
  return isNaN(price) ? null : price;
}

// Activity 3: Save to Supabase (REAL implementation)
export async function saveToSupabase(
  query: string, 
  location: string, 
  msrpPrice: number | null, 
  retailers: RetailerData[]
): Promise<string> {
  console.log('💾 Activity: Saving to Supabase...', { query, location, msrpPrice, retailersCount: retailers.length });
  
  try {
    console.log('🔍 SUPABASE SAVE - About to insert query:', { query, location, msrpPrice });
    
    // Insert into arbitrage_queries and get the primary key (id)
    const { data: queryData, error: queryError } = await supabase
      .from("arbitrage_queries")
      .insert([
        {
          query_text: query,
          location: location,
          msrp_price: msrpPrice,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    console.log('🔍 SUPABASE SAVE - Insert query result:', { queryData, queryError });

    if (queryError || !queryData) {
      console.error("❌ Error inserting into arbitrage_queries:", queryError);
      console.error("❌ Query data received:", queryData);
      throw new Error(`Failed to save query to database: ${queryError?.message || 'No data returned'}`);
    }
    
    const queryId = queryData.id;
    console.log('✅ Saved query with UUID:', queryId);
    console.log('🔍 UUID type check:', typeof queryId, 'Value:', queryId);

    // Insert all retailers into arbitrage_companies
    const companiesToInsert = retailers.map((retailer) => {
      console.log("🔍 Processing company for insert:", JSON.stringify(retailer, null, 2));
      
      // Validate required fields
      if (!retailer.name || !retailer.phone_number || !retailer.location) {
        console.error("❌ Company missing required fields:", retailer);
        throw new Error(`Company missing required fields: name=${retailer.name}, phone=${retailer.phone_number}, location=${retailer.location}`);
      }

      const insertData = {
        name: retailer.name,
        phone_number: retailer.phone_number,
        location: retailer.location,
        has_been_called: false, // EXPLICITLY set to false, don't rely on fallback
        call_transcript: retailer.call_transcript || "",
        call_audio_recording: retailer.call_audio_recording || "",
        call_summary: retailer.call_summary || "",
        price_offered: retailer.price_offered,
        query_id: queryId,
        created_at: new Date().toISOString(),
      };
      
      console.log("🔍 EXPLICIT INSERT DATA - has_been_called value:", insertData.has_been_called);
      console.log("📤 Complete insert data:", JSON.stringify(insertData, null, 2));
      
      return insertData;
    });

    console.log('🗃️ Saving companies to database:', companiesToInsert.length);
    console.log('🔍 FINAL INSERT ARRAY - Check has_been_called values:');
    companiesToInsert.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name}: has_been_called = ${company.has_been_called}`);
    });
    
    const { data: insertResult, error: companiesError } = await supabase
      .from("arbitrage_companies")
      .insert(companiesToInsert)
      .select(); // Get back what was actually inserted
    
    if (companiesError) {
      console.error("❌ Error inserting companies:", companiesError);
      throw new Error("Failed to save companies to database");
    }

    console.log('✅ Successfully saved all data to Supabase with queryId:', queryId);
    console.log('🔍 VERIFY DATABASE INSERT - What was actually saved:');
    if (insertResult) {
      insertResult.forEach((saved, index) => {
        console.log(`   ${index + 1}. ${saved.name}: has_been_called = ${saved.has_been_called}`);
      });
    }
    
    // DOUBLE-CHECK: Query the database immediately to see what was actually saved
    console.log('🔍 DOUBLE-CHECK: Re-querying database to verify...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('arbitrage_companies')
      .select('name, has_been_called')
      .eq('query_id', queryId);
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
    } else if (verifyData) {
      console.log('🔍 DOUBLE-CHECK RESULTS:');
      verifyData.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}: has_been_called = ${item.has_been_called} (type: ${typeof item.has_been_called})`);
      });
      
      const stillPending = verifyData.filter(item => !item.has_been_called);
      console.log(`🔍 DOUBLE-CHECK: ${stillPending.length} retailers should have pending calls`);
    }
    
    console.log('🔍 CRITICAL: Returning UUID to workflow:', queryId);
    console.log('🔍 UUID validation:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId));
    return queryId;

  } catch (error) {
    console.error('❌ Supabase save failed:', error);
    throw error;
  }
}

// Activity 4: Make Phone Calls (SEQUENTIAL - All companies, but using user's number)
export async function makePhoneCalls(queryId: string, retailers: RetailerData[]): Promise<CallResult[]> {
  console.log('📞 Activity: Making REAL calls to ALL retailers sequentially...', { queryId, retailersCount: retailers.length });
  console.log('📞 NOTE: All calls will go to user number (469) 880-5468 for testing');
  
  const results: CallResult[] = [];
  
  // Call ALL retailers sequentially, but always use user's number
  for (const retailer of retailers) {
    console.log(`📞 Making REAL call for ${retailer.name} (calling user's number for testing)`);
    
    try {
      // Call your VAPI backend - it will use the hardcoded user number
      const response = await fetch('http://localhost:3001/api/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailer: {
            name: retailer.name,
            phone_number: retailer.phone_number, // This will be overridden by VAPI backend
            location: retailer.location
          },
          queryId: queryId
        })
      });

      if (!response.ok) {
        throw new Error(`VAPI call failed: ${response.status} ${response.statusText}`);
      }

      const callData = await response.json() as VAPICallResponse;
      console.log(`✅ Call completed for ${retailer.name}:`, callData);
      console.log(`🔍 Call summary received: "${callData.summary}"`);
      console.log(`🔍 Call transcript received: "${callData.transcript?.substring(0, 100)}..."`);

      // Extract price from summary if available
      let extractedPrice: number | null = null;
      if (callData.summary) {
        console.log(`🔍 Attempting to extract price from summary: "${callData.summary}"`);
        
        // Try multiple patterns to extract price:
        // 1. With dollar sign: $34000, $34,000
        // 2. Without dollar sign: 34000, 34,000
        // 3. Text with numbers: "agreed to 34000", "price is 34000"
        
        const patterns = [
          /\$([0-9,]+)/,           // $34000 or $34,000
          /\b([0-9,]+)\b/,         // standalone number: 34000, 34,000
          /price[^\d]*([0-9,]+)/i, // "price is 34000"
          /agreed[^\d]*([0-9,]+)/i // "agreed to 34000"
        ];
        
        for (const pattern of patterns) {
          const match = callData.summary.match(pattern);
          if (match) {
            extractedPrice = parseInt(match[1].replace(/,/g, ''));
            console.log(`💰 Extracted price using pattern ${pattern}: $${extractedPrice}`);
            break;
          }
        }
        
        if (!extractedPrice) {
          console.log(`❌ Could not extract price from summary: "${callData.summary}"`);
        }
      }

      // Store the result
      results.push({
        retailerId: retailer.name,
        success: callData.success,
        transcript: callData.transcript || `Called ${retailer.name} about pricing...`,
        priceOffered: extractedPrice,
        callSummary: callData.summary,
        callStatus: callData.status
      });

      // Update Supabase immediately with call results
      console.log(`💾 Updating ${retailer.name} in Supabase with call results...`);
      await updateRetailerCallData(queryId, retailer.name, {
        has_been_called: true,
        call_transcript: callData.transcript || '',
        call_summary: callData.summary || '',
        call_audio_recording: '', // Add if available from VAPI
        price_offered: extractedPrice, // Add the extracted price
      });

      console.log(`✅ Successfully updated ${retailer.name} in database with:
        - has_been_called: true
        - call_summary: "${callData.summary}"
        - price_offered: ${extractedPrice}
        - call_transcript: ${callData.transcript ? 'Yes' : 'No'}`);

    } catch (error) {
      console.error(`❌ Failed to call ${retailer.name}:`, error);
      
      // Store failed result
      results.push({
        retailerId: retailer.name,
        success: false,
        transcript: `Failed to call ${retailer.name}: ${error}`,
        priceOffered: null,
        callSummary: 'Call failed',
        callStatus: 'failed'
      });

      // Update Supabase with failed call
      await updateRetailerCallData(queryId, retailer.name, {
        has_been_called: true,
        call_transcript: `Failed to call: ${error}`,
        call_summary: 'Call failed',
        call_audio_recording: '',
        price_offered: null,
      });
    }

    // Small delay between calls to be respectful
    console.log('⏳ Waiting 2 seconds before next call...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('✅ All calls completed');
  return results;
}

// Helper function to update retailer call data in Supabase
async function updateRetailerCallData(queryId: string, retailerName: string, callData: {
  has_been_called: boolean;
  call_transcript: string;
  call_summary: string;
  call_audio_recording: string;
  price_offered?: number | null;
}): Promise<void> {
  try {
    console.log(`💾 SUPABASE UPDATE - Updating ${retailerName} with data:`, JSON.stringify(callData, null, 2));
    
    const { data: updateResult, error } = await supabase
      .from('arbitrage_companies')
      .update(callData)
      .eq('query_id', queryId)
      .eq('name', retailerName)
      .select(); // Get back what was updated

    if (error) {
      console.error(`❌ Failed to update retailer ${retailerName}:`, error);
      throw error;
    }

    console.log(`✅ Successfully updated ${retailerName} in Supabase`);
    console.log(`🔍 SUPABASE UPDATE - Updated record:`, JSON.stringify(updateResult, null, 2));
    
    // Verify the update worked by querying again
    const { data: verifyData, error: verifyError } = await supabase
      .from('arbitrage_companies')
      .select('name, has_been_called, call_summary, price_offered')
      .eq('query_id', queryId)
      .eq('name', retailerName)
      .single();
      
    if (verifyError) {
      console.error(`❌ Failed to verify update for ${retailerName}:`, verifyError);
    } else {
      console.log(`🔍 VERIFICATION - ${retailerName} current state in DB:`, JSON.stringify(verifyData, null, 2));
    }
    
  } catch (error) {
    console.error(`❌ Error updating retailer ${retailerName}:`, error);
    throw error;
  }
}

// Activity 5: Summarize Transcripts (from your bedrock-summarize API route)
export async function summarizeTranscripts(queryId: string, callResults: CallResult[]): Promise<void> {
  console.log('📝 Activity: Summarizing transcripts...', { queryId, callsCount: callResults.length });
  
  for (const result of callResults) {
    if (result.transcript) {
      const summaryPrompt = `Please summarize this phone call transcript from a watch dealer:

"${result.transcript}"

Provide a concise summary focusing on:
1. Whether they have the item in stock
2. The price they offered (if any)
3. Key details about condition, availability, etc.

Keep it under 100 words.`;

      const summary = await callClaude(summaryPrompt, 200);
      console.log(`📝 Summarized call with ${result.retailerId}:`, summary.substring(0, 100) + '...');
    }
  }
}

// Activity 6: Update Final Prices
export async function updatePrices(queryId: string): Promise<{ avgPrice: number | null }> {
  console.log('🔄 Activity: Updating final prices...', { queryId });
  
  // TODO: Update prices in Supabase based on call results
  // Calculate average price, update database, etc.
  
  return { avgPrice: 9250 }; // Mock for now
} 