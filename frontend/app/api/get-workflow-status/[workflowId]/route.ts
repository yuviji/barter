import { NextRequest, NextResponse } from 'next/server';
import { Client, Connection } from '@temporalio/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const resolvedParams = await params;
    const workflowId = resolvedParams.workflowId;
    
    console.log('🔍 Getting workflow status for:', workflowId);
    
    // Connect to Temporal server
    const connection = await Connection.connect({
      address: 'localhost:7233',
    });
    
    const client = new Client({
      connection,
    });
    
    // Get workflow handle
    const handle = client.workflow.getHandle(workflowId);
    
    // Try to get any available query results (like queryId)
    try {
      const workflowInfo = await handle.describe();
      console.log('🔍 Workflow info:', workflowInfo.status.name);
      
      // Try to query the workflow for its current queryId
      try {
        const queryId = await handle.query('getQueryId');
        console.log('✅ Got queryId from workflow query:', queryId);
        
        return NextResponse.json({ 
          status: workflowInfo.status.name,
          queryId: queryId,
          workflowRunning: workflowInfo.status.name === 'RUNNING'
        });
      } catch (queryError) {
        console.log('🔍 No queryId query available yet, workflow may still be in early steps');
        
        return NextResponse.json({ 
          status: workflowInfo.status.name,
          queryId: null,
          workflowRunning: workflowInfo.status.name === 'RUNNING'
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to get workflow status:', error);
      return NextResponse.json(
        { error: 'Failed to get workflow status' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('❌ Failed to connect to workflow:', error);
    return NextResponse.json(
      { error: 'Failed to connect to workflow' },
      { status: 500 }
    );
  }
} 