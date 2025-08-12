import { UnifiedTranscriptionRecorder } from "@/components/unified-transcription-recorder";
import { AgentFeed } from "@/components/agent-feed";
import { CallEval } from "@/components/call-eval";
import { SessionsHistory } from "@/components/sessions-history";

export default function CurrentCallPage() {
  return (
    <div>
      <UnifiedTranscriptionRecorder />
      <AgentFeed />
      <CallEval />
      <SessionsHistory />
    </div>
  );
}
