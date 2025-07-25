"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getRetailersBySearchId, supabase } from "@/lib/supabase"
import { BuyModeView } from "@/components/buy-mode-view"
import { SellModeView } from "@/components/sell-mode-view"
import { ModeToggle } from "@/components/mode-toggle"
import { AutoCallToggle } from "@/components/auto-call-toggle"

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const searchId = searchParams.get("id")
  const [mode, setMode] = useState<"buy" | "sell">("buy")
  const [retailers, setRetailers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lowestPrice, setLowestPrice] = useState<{
    price: number | null
    retailer: string | null
  }>({ price: null, retailer: null })
  const [msrpPrice, setMsrpPrice] = useState<number | null>(null)
  const [backgroundProcessing, setBackgroundProcessing] = useState(true)

  useEffect(() => {
    if (!searchId) return

    console.log("🔍 CODE VERSION CHECK: Dashboard v2.0 - UUID fixes applied");
    console.log("🔍 Dashboard received searchId:", searchId);
    console.log("🔍 Is it a valid UUID?", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchId));

    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        console.log("📊 Fetching retailers from Supabase with ID:", searchId);
        console.log("📊 Fetching MSRP from Supabase with ID:", searchId);
        
        const [retailersRes, queryRes] = await Promise.all([
          getRetailersBySearchId(searchId),
          supabase.from("arbitrage_queries").select("msrp_price").eq("id", searchId).single(),
        ])
        
        console.log("✅ Retrieved retailers:", retailersRes?.length || 0);
        console.log("✅ Retrieved MSRP:", queryRes?.data?.msrp_price);
        setRetailers(retailersRes)
        if (queryRes.data && typeof queryRes.data.msrp_price === "number") {
          setMsrpPrice(queryRes.data.msrp_price)
        } else {
          setMsrpPrice(null)
        }
        
        // Check if any calls are still pending (background processing)
        console.log("🔍 DASHBOARD - Checking background processing status...");
        console.log("🔍 DASHBOARD - Retailers received:", retailersRes?.length);
        
        if (retailersRes && retailersRes.length > 0) {
          console.log("🔍 DASHBOARD - Call status breakdown:");
          retailersRes.forEach((r: any, index: number) => {
            console.log(`   ${index + 1}. ${r.name}: has_been_called = ${r.has_been_called} (type: ${typeof r.has_been_called})`);
          });
        }
        
        const hasPendingCalls = retailersRes.some((r: any) => !r.has_been_called)
        console.log("🔍 DASHBOARD - Has pending calls:", hasPendingCalls);
        console.log("🔍 DASHBOARD - Background processing will be set to:", hasPendingCalls);
        
        setBackgroundProcessing(hasPendingCalls)
        // Find the lowest price offered
        const retailerWithLowestPrice = retailersRes
          .filter((r) => r.price_offered !== null)
          .sort((a, b) => a.price_offered - b.price_offered)[0]

        if (retailerWithLowestPrice) {
          setLowestPrice({
            price: retailerWithLowestPrice.price_offered,
            retailer: retailerWithLowestPrice.name,
          })
        }
      } catch (error) {
        console.error("Error fetching retailers or msrp:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    
    // Set up polling for background call updates
    let pollInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      console.log("🔄 Starting polling for call updates...");
      pollInterval = setInterval(async () => {
        console.log("🔄 Polling for updates...");
        try {
          const retailersRes = await getRetailersBySearchId(searchId);
          setRetailers(retailersRes);
          
          const hasPendingCalls = retailersRes.some((r: any) => !r.has_been_called);
          console.log("🔄 Poll result - pending calls:", hasPendingCalls);
          
          if (!hasPendingCalls) {
            console.log("✅ All calls complete - stopping polling");
            setBackgroundProcessing(false);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          }
          
          // Update lowest price
          const retailerWithLowestPrice = retailersRes
            .filter((r) => r.price_offered !== null)
            .sort((a, b) => a.price_offered - b.price_offered)[0];

          if (retailerWithLowestPrice) {
            setLowestPrice({
              price: retailerWithLowestPrice.price_offered,
              retailer: retailerWithLowestPrice.name,
            });
          }
        } catch (error) {
          console.error("Error during polling:", error);
        }
      }, 3000); // Poll every 3 seconds
    };
    
    // Start polling if there are pending calls
    if (backgroundProcessing) {
      startPolling();
    }
    
    // Cleanup polling on unmount or searchId change
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [searchId, backgroundProcessing])

  if (!searchId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-500">Select a search from the sidebar or start a new search</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Arbitrage Dashboard</h1>
        <div className="flex items-center gap-4">
          {backgroundProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              📞 Phone calls in progress...
            </div>
          )}
          <AutoCallToggle />
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        ) : mode === "buy" ? (
          <BuyModeView retailers={retailers} setRetailers={setRetailers} msrpPrice={msrpPrice} />
        ) : (
          <SellModeView retailers={retailers} />
        )}
      </div>
    </div>
  )
}
