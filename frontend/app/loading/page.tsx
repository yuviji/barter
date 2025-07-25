"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
// No more direct API imports - Temporal handles everything!
import { Button } from "@/components/ui/button"

export default function LoadingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchId = searchParams.get("id") || ""
  const query = searchParams.get("query") || ""
  const location = searchParams.get("location") || ""

  const [steps, setSteps] = useState([
    { id: 1, text: "🔍 Finding retailers with Tavily + Bedrock", completed: false, error: false },
    { id: 2, text: "💰 Getting MSRP pricing with Claude", completed: false, error: false },
    { id: 3, text: "💾 Saving to database", completed: false, error: false },
    { id: 4, text: "🚀 Redirecting to results (calls continue in background)", completed: false, error: false },
  ])

  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false) // Prevent double execution
  const hasStarted = useRef(false) // Track if workflow already started

  useEffect(() => {
    const startTemporalWorkflow = async () => {
      // Prevent double execution
      if (hasStarted.current || isProcessing) {
        console.log("⚠️ Already processing, skipping duplicate call")
        return
      }

      hasStarted.current = true
      setIsProcessing(true)
      
      try {
        console.log("🚀 Starting Temporal arbitrage workflow...")
        console.log("🔍 CODE VERSION CHECK: Loading page v2.0 - UUID fixes applied")

        // 🎯 THIS IS THE MAGIC: Just start the workflow!
        const response = await fetch('/api/start-arbitrage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, location, searchId })
        });

        if (!response.ok) throw new Error('Failed to start workflow');
        
        const { workflowId } = await response.json();
        console.log("✅ Temporal workflow started:", workflowId);

        // Show progress for first 3 steps + redirect step
        for (let i = 1; i <= 3; i++) {
          await new Promise(r => setTimeout(r, 2000));
          setSteps(prev => prev.map(step => 
            step.id === i ? { ...step, completed: true } : step
          ));
        }
        
        // Mark redirect step as completed
        setSteps(prev => prev.map(step => 
          step.id === 4 ? { ...step, completed: true } : step
        ));

        // Wait a bit more for Supabase save to complete
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("🔍 Getting queryId after first 3 steps completed...");
        
        // Get the queryId from workflow (which has the real UUID from Supabase)
        try {
          console.log("🔍 LOADING PAGE - Fetching partial workflow result for:", workflowId);
          
          // Poll for the queryId to be available (workflow may still be running)
          let realQueryId = null;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!realQueryId && attempts < maxAttempts) {
            attempts++;
            console.log(`🔍 LOADING PAGE - Attempt ${attempts} to get queryId...`);
            
            try {
              const resultResponse = await fetch(`/api/get-workflow-status/${workflowId}`);
              
              if (resultResponse.ok) {
                const statusData = await resultResponse.json();
                console.log("🔍 LOADING PAGE - Status data:", statusData);
                
                if (statusData.queryId) {
                  realQueryId = statusData.queryId;
                  break;
                }
              }
            } catch (pollError) {
              console.log("🔍 Still waiting for queryId...", pollError);
            }
            
            await new Promise(r => setTimeout(r, 1000));
          }
          
          if (realQueryId) {
            console.log("✅ LOADING PAGE - Got queryId early:", realQueryId);
            console.log("🔍 LOADING PAGE - Is it a valid UUID?", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realQueryId));
            console.log("🚀 LOADING PAGE - Redirecting early to dashboard with UUID:", realQueryId);
            console.log("📞 Background workflow will continue with phone calls...");
            
            router.push(`/dashboard?id=${realQueryId}`);
          } else {
            console.error('❌ Could not get queryId after 3 steps');
            setHasError(true);
            setErrorMessage("Could not get search results. Please try again.");
          }
        } catch (error) {
          console.error('❌ Error getting queryId after 3 steps:', error);
          setHasError(true);
          setErrorMessage("Failed to load search results. Please try again.");
        }
        
      } catch (error) {
        console.error("❌ Error starting workflow:", error)
        setHasError(true)
        setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred")
        setSteps(prev => prev.map(step => (!step.completed ? { ...step, error: true } : step)))
      } finally {
        setIsProcessing(false)
      }
    }

    if (searchId && query && location) {
      startTemporalWorkflow()
    }
  }, [query, location, searchId])

  const handleRetry = () => {
    setHasError(false)
    setErrorMessage("")
    setIsProcessing(false) // Reset processing state
    setSteps([
      { id: 1, text: "Searching for luxury retailers", completed: false, error: false },
      { id: 2, text: "Gathering contact information", completed: false, error: false },
      { id: 3, text: "Analyzing arbitrage opportunities", completed: false, error: false },
      { id: 4, text: "Preparing data for dashboard", completed: false, error: false },
    ])

    // Restart the process
    window.location.reload()
  }

  const handleGoBack = () => {
    router.push("/")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {hasError ? "Processing Error" : "Processing Your Search"}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {hasError
              ? "We encountered an issue while processing your request"
              : `Finding arbitrage opportunities for ${query} in ${location.replace(/-/g, " ")}`}
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center space-x-3 rounded-lg border border-gray-700 bg-gray-800/50 p-4"
            >
              {step.error ? (
                <AlertCircle className="h-6 w-6 text-red-500" />
              ) : step.completed ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              )}
              <span className={step.error ? "text-red-400" : step.completed ? "text-white" : "text-gray-400"}>
                {step.text}
              </span>
            </div>
          ))}
        </div>

        {hasError && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
              <Button onClick={handleGoBack} variant="outline" className="flex-1">
                Go Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
