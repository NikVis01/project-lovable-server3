"use client";

import { UnifiedTranscriptionRecorder } from "@/components/unified-transcription-recorder";
import { SessionsHistory } from "@/components/sessions-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, History } from "lucide-react";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-2'>
      <pre className='overflow-x-auto font-mono text-sm mb-8'>{TITLE_TEXT}</pre>

      <Tabs defaultValue='recorder' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='recorder' className='flex items-center gap-2'>
            <Mic className='h-4 w-4' />
            Live Recording
          </TabsTrigger>
          <TabsTrigger value='history' className='flex items-center gap-2'>
            <History className='h-4 w-4' />
            Sessions History
          </TabsTrigger>
        </TabsList>

        <TabsContent value='recorder' className='mt-6'>
          <UnifiedTranscriptionRecorder />
        </TabsContent>

        <TabsContent value='history' className='mt-6'>
          <SessionsHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
