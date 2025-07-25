import { NextRequest, NextResponse } from 'next/server';
import { Client, Connection } from '@temporalio/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const workflowId = params.workflowId;
    
    console.log('🔍 Getting workflow result for:', workflowId);
    
    // Connect to Temporal server
    const connection = await Connection.connect({
      address: 'localhost:7233',
    });
    
    const client = new Client({
      connection,
    });
    
    // Get workflow handle and result
    const handle = client.workflow.getHandle(workflowId);
    const result = await handle.result();
    
    console.log('✅ API ROUTE - Raw workflow result:', result);
    console.log('🔍 API ROUTE - queryId from result:', result?.queryId);
    console.log('🔍 API ROUTE - Is queryId a valid UUID?', result?.queryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.queryId));
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Failed to get workflow result:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow result' },
      { status: 500 }
    );
  }
} 