import { ConversationalAI } from "@/components/conversational-ai";
import { AgentManager } from "@/components/agent-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Bot } from "lucide-react";

export default function PreCallPage() {
  return (
    <div className='container mx-auto max-w-6xl px-4 py-6'>
      <Tabs defaultValue='conversation-ai' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger
            value='conversation-ai'
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
        </TabsList>

        <TabsContent value='conversation-ai' className='mt-6'>
          <ConversationalAI />
        </TabsContent>

        <TabsContent value='agent-manager' className='mt-6'>
          <AgentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
