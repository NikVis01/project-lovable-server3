import { AgentFeed } from "@/components/agent-feed";
import { Bot } from "lucide-react";

export default function PostCallPage() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-6'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <div className='rounded-lg border p-6'>
            <h1 className='text-2xl font-bold mb-4'>Post Call Analysis</h1>
            <p className='text-muted-foreground'>
              Review your call performance and insights.
            </p>

            {/* Placeholder for post-call content */}
            <div className='mt-8 space-y-4'>
              <div className='p-4 bg-muted/50 rounded-lg'>
                <h3 className='font-semibold mb-2'>Call Summary</h3>
                <p className='text-sm text-muted-foreground'>
                  Call summary and analytics will appear here.
                </p>
              </div>

              <div className='p-4 bg-muted/50 rounded-lg'>
                <h3 className='font-semibold mb-2'>Performance Metrics</h3>
                <p className='text-sm text-muted-foreground'>
                  Performance metrics and scoring will appear here.
                </p>
              </div>

              <div className='p-4 bg-muted/50 rounded-lg'>
                <h3 className='font-semibold mb-2'>Areas for Improvement</h3>
                <p className='text-sm text-muted-foreground'>
                  Recommendations and improvement areas will appear here.
                </p>
              </div>
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
