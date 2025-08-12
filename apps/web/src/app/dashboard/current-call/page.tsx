import { UnifiedTranscriptionRecorder } from "@/components/unified-transcription-recorder";
import { AgentFeed } from "@/components/agent-feed";
import { CallEval } from "@/components/call-eval";
import { SessionsHistory } from "@/components/sessions-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Bot, BarChart, History } from "lucide-react";

export default function CurrentCallPage() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-6'>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <Tabs defaultValue='recorder' className='w-full'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='recorder' className='flex items-center gap-2'>
                <Mic className='h-4 w-4' />
                Live Recording
              </TabsTrigger>
              <TabsTrigger
                value='evaluation'
                className='flex items-center gap-2'
              >
                <BarChart className='h-4 w-4' />
                Evaluation
              </TabsTrigger>
              <TabsTrigger value='history' className='flex items-center gap-2'>
                <History className='h-4 w-4' />
                Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value='recorder' className='mt-6'>
              <UnifiedTranscriptionRecorder />
            </TabsContent>

            <TabsContent value='evaluation' className='mt-6'>
              <CallEval />
            </TabsContent>

            <TabsContent value='history' className='mt-6'>
              <SessionsHistory />
            </TabsContent>
          </Tabs>
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
