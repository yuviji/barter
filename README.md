## Inspiration
Back in highschool, we used to be big into reselling shoes and watches. Unfortunately, it was WAY too much of a timesink. 

If you think about it, the **entire process is very cumbersome and complicated** - you first need to source a list of vendors, call and negotiate each and every single one of them, decide on a final price, create descriptions for listings, and finally post these listings on secondary marketplaces. I'm getting exhausted just thinking about it.

To solve this problem, we built Barter.

## What it does
Barter is a **symphony of dozens of agents working in tandem.**

First, the user tells Barter the product he/she wants to flip a profit on. Barter deploys an agent to compile a list of the most relevant product vendors in the city, their location, and their phone number. 

Then, Barter deploys voice agents to call each and every one of these vendors sequentially. **We're able to inform each agent about the results of the earlier calls,** meaning each agent is able to negotiate with the context of the lowest offered price + bring the price down even more. 

Barter uses one last agent to compile all the call info, calculate a reasonable sell price, and create listings on secondary marketplaces such as EBay, Craigslist, and Facebook Marketplace.

## How we built it
The entire workflow, end-to-end, is powered by Temporal. **Temporal replaced the cumbersome system of using multiple API calls to find vendors, upload to supabase, call each vendor, and summarize the results (all of these were prone to failure) with containerized, streamlined workflows.**

The agent that compiles a list of releavant vendors is powered by **Tavily's web search MCP** and **AWS Bedrock**. We return an object from these LLM calls that we then upload to our supabase for storage. We've seen that integrating with the **Tavily MCP allows us to source large amount of accurage information better than most other sources** (e.g. Perplexity API on its own), providing us with an engine to power the entire workflow.

The agents that sequentially call each vendor are powered by vapi, Temporal, and AWS Bedrock (for grabbing summaries of calls). **Temporal also allows us to run multiple queries in parallel;** this means, for instance, that a reseller could be calling hundreds of shoe, luxury watch, and jewelry vendors all at the same time, saving **DAYS** of work. **This also means that our system becomes significantly more scalable, since API calls aren't running over each other and each workflow instead operates independently with its own states.** 

Lastly, the agent that compiles the info and creates listings is powered by AWS Bedrock. **Throughout the entire process, Bedrock helps us create adaptive agents - from extracting retailer data and fetching MSRP prices to summarizing call transcripts for voice agent collaboration, Bedrock helps us create an intelligent pipeline where data flows from one part of the workflow to the next.**

## Challenges we ran into
At first, parts of the process kept breaking and interrupting our flow. A single API error here or browser error there threw the entire process off, meaning we had to restart the flow.

**We were able to get around this thanks to the huge help of Temporal**, which allowed us to monitor failures and deploy quick fixes. 

## Accomplishments that we're proud of
We are proud of the immense value we're able to create by automating the reseller's process: the vendors get to sell more of their product, the buyers get to enjoy more of the type of good they like, and the resellers benefit because they're able to bring in a higher volume of deals/more revenue into their business.

Using Temporal, Tavily, and Bedrock, we were successfully able to entirely automate a very tedious process and deliver a solution which has the potential to dramatically alter the entire reselling industry.

## What we learned
This was our first time truly integrating an MCP with an Agent, so getting to learn the process around that was quite interesting. We also learned that this more custom approach gave us more flexibility and as far more robust than simply using a web-enabled API such as perplexity.

## What's next for barter
We intend to ask our dropshipper friends to see if they would use the product. If there's certifiable demand, we'd then get started on building and deploying a more robust MVP and look to scale Barter into a full-fledged company.

After dominating the resell industry, we'd look to take over the manufacturing and customer sectors next.

