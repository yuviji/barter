import { proxyActivities, sleep, log, setHandler, defineQuery } from '@temporalio/workflow';
import type * as activities from './activities';

// Define query to get queryId while workflow is running
export const getQueryIdQuery = defineQuery<string | null>('getQueryId');

// Configure activity options
const { 
  findRetailers, 
  getMsrpPrice, 
  saveToSupabase,
  makePhoneCalls,
  summarizeTranscripts,
  updatePrices 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes'
});

export interface ArbitrageWorkflowInput {
  query: string;
  location: string;
  searchId: string;
}

export interface ArbitrageWorkflowResult {
  queryId: string;
  retailersFound: number;
  msrpPrice: number | null;
  callsMade: number;
  avgPrice: number | null;
}

export async function arbitrageWorkflow(
  input: ArbitrageWorkflowInput
): Promise<ArbitrageWorkflowResult> {
  const { query, location, searchId } = input;
  
  // Track queryId for queries
  let currentQueryId: string | null = null;
  
  // Set up query handler to expose queryId while workflow is running
  setHandler(getQueryIdQuery, () => currentQueryId);
  
  log.info('🚀 Starting arbitrage workflow', { query, location, searchId });

  // Step 1: Find retailers using Tavily + Bedrock
  log.info('📍 Step 1: Finding retailers...');
  const retailers = await findRetailers(query, location);
  log.info(`✅ Found ${retailers.length} retailers`);

  // Step 2: Get MSRP price using Bedrock
  log.info('💰 Step 2: Getting MSRP price...');
  const msrpPrice = await getMsrpPrice(query);
  log.info(`✅ MSRP: $${msrpPrice}`);

  // Step 3: Save initial data to Supabase
  log.info('💾 Step 3: Saving to database...');
  const queryId = await saveToSupabase(query, location, msrpPrice, retailers);
  currentQueryId = queryId; // Make queryId available for queries
  log.info(`✅ Saved with queryId: ${queryId}`);

  // Step 4: Make phone calls to retailers
  log.info('📞 Step 4: Making phone calls...');
  const callResults = await makePhoneCalls(queryId, retailers);
  log.info(`✅ Made ${callResults.length} calls`);

  // Step 5: Summarize call transcripts 
  log.info('📝 Step 5: Summarizing transcripts...');
  await summarizeTranscripts(queryId, callResults);
  log.info('✅ Transcripts summarized');

  // Step 6: Update final prices in database
  log.info('🔄 Step 6: Updating prices...');
  const finalStats = await updatePrices(queryId);
  log.info('✅ Prices updated');

  log.info('🎉 Arbitrage workflow completed successfully!');
  log.info('🔍 WORKFLOW RETURNING queryId', { queryId });
  log.info('🔍 UUID validation', { isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId) });

  const result = {
    queryId,
    retailersFound: retailers.length,
    msrpPrice,
    callsMade: callResults.length,
    avgPrice: finalStats.avgPrice
  };
  
  log.info('🔍 Complete workflow result', result);
  return result;
} 