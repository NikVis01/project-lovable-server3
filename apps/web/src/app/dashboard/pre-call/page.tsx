import { ConversationalAI } from "@/components/conversational-ai";
import { AgentManager } from "@/components/agent-manager";

export default function PreCallPage() {
  return (
    <div>
      <ConversationalAI />
      <AgentManager />
    </div>
  );
}
