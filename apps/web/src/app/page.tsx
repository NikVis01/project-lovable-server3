"use client";

import { UnifiedTranscriptionRecorder } from "@/components/unified-transcription-recorder";
import { SessionsHistory } from "@/components/sessions-history";
import { ConversationalAI } from "@/components/conversational-ai";
import { AgentManager } from "@/components/agent-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, History, Phone, Bot } from "lucide-react";
import { AgentFeed } from "@/components/agent-feed";
import { CallEval } from "@/components/call-eval";

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
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='recorder' className='flex items-center gap-2'>
            <Mic className='h-4 w-4' />
            Live Recordings
          </TabsTrigger>
          <TabsTrigger
            value='conversational-ai'
            className='flex items-center gap-2'
          >
            <Phone className='h-4 w-4' />
            AI Conversation
          </TabsTrigger>
          <TabsTrigger
            value='agent-manager'
            className='flex items-center gap-2'
          >
            <Bot className='h-4 w-4' />
            Agent Manager
          </TabsTrigger>
          <TabsTrigger value='history' className='flex items-center gap-2'>
            <History className='h-4 w-4' />
            Sessions History
          </TabsTrigger>
        </TabsList>

        <TabsContent value='recorder' className='mt-6'>
          <UnifiedTranscriptionRecorder />
        </TabsContent>

        <TabsContent value='conversational-ai' className='mt-6'>
          <ConversationalAI />
        </TabsContent>

        <TabsContent value='agent-manager' className='mt-6'>
          <AgentManager />
        </TabsContent>

        <TabsContent value='history' className='mt-6'>
          <div className='mb-4'>
            <CallEval />
          </div>
          <SessionsHistory />
        </TabsContent>
      </Tabs>

      <div className='mt-6'>
        <AgentFeed />
      </div>
    </div>
  );
}
