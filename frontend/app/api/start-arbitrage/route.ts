import { NextRequest, NextResponse } from 'next/server';
import { Client, Connection } from '@temporalio/client';

export async function POST(request: NextRequest) {
  try {
    const { query, location, searchId } = await request.json();
    
    console.log('🚀 Starting Temporal arbitrage workflow...', { query, location, searchId });
    
    // Connect to Temporal server
    const connection = await Connection.connect({
      address: 'localhost:7233',
    });
    
    const client = new Client({
      connection,
    });
    
    // Generate a cleaner workflow ID
    const workflowId = `arbitrage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔍 START-ARBITRAGE - Generated workflowId:', workflowId);
    console.log('🔍 START-ARBITRAGE - Input searchId:', searchId);
    
    // Start the workflow
    const handle = await client.workflow.start('arbitrageWorkflow', {
      args: [{ query, location, searchId }],
      taskQueue: 'arbitrage-task-queue',
      workflowId: workflowId,
    });
    
    console.log('✅ START-ARBITRAGE - Workflow started successfully');
    console.log('🔍 START-ARBITRAGE - Workflow handle ID:', handle.workflowId);
    
    return NextResponse.json({ 
      success: true,
      workflowId: handle.workflowId,
      message: 'Arbitrage workflow started successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to start workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start arbitrage workflow' },
      { status: 500 }
    );
  }
} 