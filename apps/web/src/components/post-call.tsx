"use client";

import { AgentFeed } from "./agent-feed";
import { MockCall } from "./mock-call";
import { CallEval } from "./call-eval";
import { Bot, TrendingUp, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export function PostCall() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-6'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='rounded-lg border p-6'>
            <h1 className='text-2xl font-bold mb-4'>
              Post Call Analysis & Practice
            </h1>
            <p className='text-muted-foreground'>
              Review your call performance, get insights, and practice with AI
              based on your conversations.
            </p>

            <div className='mt-6'>
              <Tabs defaultValue='analysis' className='w-full'>
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger
                    value='analysis'
                    className='flex items-center gap-2'
                  >
                    <TrendingUp className='h-4 w-4' />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger
                    value='evaluation'
                    className='flex items-center gap-2'
                  >
                    <MessageSquare className='h-4 w-4' />
                    Evaluation
                  </TabsTrigger>
                  <TabsTrigger
                    value='practice'
                    className='flex items-center gap-2'
                  >
                    <Bot className='h-4 w-4' />
                    AI Coaching
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='analysis' className='mt-6'>
                  <div className='space-y-4'>
                    <div className='p-4 bg-muted/50 rounded-lg'>
                      <h3 className='font-semibold mb-2'>Call Summary</h3>
                      <p className='text-sm text-muted-foreground'>
                        Call summary and analytics will appear here. This
                        section will show an overview of your recent
                        conversations, key metrics, and trends over time.
                      </p>
                    </div>

                    <div className='p-4 bg-muted/50 rounded-lg'>
                      <h3 className='font-semibold mb-2'>
                        Performance Metrics
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Performance metrics and scoring will appear here. Track
                        your improvement in areas like talk ratio, question
                        quality, and overall conversation flow.
                      </p>
                    </div>

                    <div className='p-4 bg-muted/50 rounded-lg'>
                      <h3 className='font-semibold mb-2'>
                        Areas for Improvement
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        Recommendations and improvement areas will appear here.
                        Get specific, actionable feedback to enhance your sales
                        conversations.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value='evaluation' className='mt-6'>
                  <CallEval />
                </TabsContent>

                <TabsContent value='practice' className='mt-6'>
                  <MockCall />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className='lg:col-span-1'>
          <div className='sticky top-6'>
            <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
              <Bot className='h-5 w-5' />
              Agent Feed
            </h2>
            <AgentFeed />
          </div>
        </div>
      </div>
    </div>
  );
}

export { PostCall };
export default PostCall;
