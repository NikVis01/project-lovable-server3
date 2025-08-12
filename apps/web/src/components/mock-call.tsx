"use client";

import { useState, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { EvaluationDisplay } from "./evaluation-display";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  User,
  Bot,
  MessageSquare,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface TranscriptSession {
  id: string;
  socketId: string;
  languageCode: string;
  transcriptInput?: string;
  transcriptOutput?: string;
  audioInputUrl?: string;
  audioOutputUrl?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
}

interface Evaluation {
  fillerWords?: string[];
  goodQuestions?: string[];
  badQuestions?: string[];
  talkRatiAndSentiment?: Array<{
    seller: number;
    client: number;
    sentiment: number;
  }>;
  generalStrenghts?: string[];
  generalWeaknesses?: string[];
  recommendations?: string[];
}

interface ConversationMessage {
  id: string;
  text: string;
  sender: "user" | "agent" | "system";
  timestamp: Date;
  isFinal?: boolean;
}

export function MockCall() {
  // State for sessions and evaluations
  const [sessions, setSessions] = useState<TranscriptSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSession, setSelectedSession] =
    useState<TranscriptSession | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for mock conversation
  const [mockAgentId, setMockAgentId] = useState<string>("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize the conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to mock conversation");
      setError(null);
      addMessage("Connected to mock AI agent", "system");
      toast.success("Connected to mock practice session");
    },
    onDisconnect: () => {
      console.log("Disconnected from mock conversation");
      addMessage("Disconnected from mock AI agent", "system");
      setCurrentConversationId(null);
    },
    onMessage: (message) => {
      const m: any = message as any;
      const text: string = typeof m === "string" ? m : m?.message ?? "";
      const isFinal: boolean = !!m?.is_final;
      const mType: string | undefined = m?.type;
      const source: string | undefined = m?.source;

      if (mType === "debug") {
        console.log("Debug message:", text);
        return;
      }

      if (mType === "user_transcript" || source === "user") {
        addMessage(text, "user", !isFinal);
        return;
      }

      if (mType === "agent_response" || source === "agent") {
        addMessage(text, "agent", !isFinal);
        return;
      }

      if (text) addMessage(text, "system");
    },
    onError: (error) => {
      const msg = (error as any)?.message ?? String(error);
      console.error("Mock conversation error:", error);
      setError(msg || "An error occurred");
      addMessage(`Error: ${msg || "Unknown error"}`, "system");
      toast.error(`Mock conversation error: ${msg || "Unknown error"}`);
    },
  });

  // Helper function to add messages
  const addMessage = (
    text: string,
    sender: ConversationMessage["sender"],
    isInterim = false
  ) => {
    const messageId = `${Date.now()}-${Math.random()}`;
    const newMessage: ConversationMessage = {
      id: messageId,
      text,
      sender,
      timestamp: new Date(),
      isFinal: !isInterim,
    };

    setConversationMessages((prev) => {
      if (isInterim) {
        const lastMessageIndex = prev.length - 1;
        if (
          lastMessageIndex >= 0 &&
          prev[lastMessageIndex].sender === sender &&
          !prev[lastMessageIndex].isFinal
        ) {
          const updated = [...prev];
          updated[lastMessageIndex] = newMessage;
          return updated;
        }
      }
      return [...prev, newMessage];
    });
  };

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load evaluation when session changes
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAndEvaluation(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
      const response = await fetch(`${serverUrl}/api/sessions`);

      if (response.ok) {
        const data = await response.json();
        const endedSessions = data.sessions.filter(
          (s: TranscriptSession) =>
            s.status === "ENDED" && (s.transcriptInput || s.transcriptOutput)
        );
        setSessions(endedSessions);

        if (endedSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(endedSessions[0].id);
        }
      } else {
        throw new Error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      setError("Failed to load sessions");
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAndEvaluation = async (sessionId: string) => {
    try {
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

      // Load session details
      const sessionResponse = await fetch(
        `${serverUrl}/api/sessions/${sessionId}`
      );
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        setSelectedSession(session);
      }

      // Load evaluation
      const evalResponse = await fetch(`${serverUrl}/api/eval/${sessionId}`);
      if (evalResponse.ok) {
        const evalData = await evalResponse.json();
        setEvaluation(evalData);
      } else {
        setEvaluation(null);
      }
    } catch (error) {
      console.error("Error loading session data:", error);
      setError("Failed to load session data");
    }
  };

  const generateMockSystemPrompt = (
    session: TranscriptSession,
    evaluation: Evaluation | null
  ): string => {
    const clientInput = session.transcriptInput || "";
    const salesOutput = session.transcriptOutput || "";

    let prompt = `TITLE: Sales Performance Coach & Mock Client

ROLE
You are a dual-role AI: First, you act as a sales performance coach providing feedback, then you become a mock client for practice.

PHASE 1 - COACHING FEEDBACK (Start with this)
Begin the conversation by providing constructive feedback based on the previous sales call. Reference the evaluation data and transcript analysis.

CONVERSATION ANALYSIS
Original conversation context:
CLIENT SAID: ${clientInput}
SALESPERSON SAID: ${salesOutput}

`;

    if (evaluation) {
      prompt += `PERFORMANCE EVALUATION RESULTS:

`;

      if (
        evaluation.generalWeaknesses &&
        evaluation.generalWeaknesses.length > 0
      ) {
        prompt += `Key Areas That Need Improvement:
`;
        evaluation.generalWeaknesses.forEach((weakness, index) => {
          prompt += `${index + 1}. ${weakness}
`;
        });
        prompt += `
`;
      }

      if (
        evaluation.generalStrenghts &&
        evaluation.generalStrenghts.length > 0
      ) {
        prompt += `What You Did Well:
`;
        evaluation.generalStrenghts.forEach((strength, index) => {
          prompt += `${index + 1}. ${strength}
`;
        });
        prompt += `
`;
      }

      if (evaluation.recommendations && evaluation.recommendations.length > 0) {
        prompt += `Specific Recommendations:
`;
        evaluation.recommendations.forEach((rec, index) => {
          prompt += `${index + 1}. ${rec}
`;
        });
        prompt += `
`;
      }

      if (evaluation.fillerWords && evaluation.fillerWords.length > 0) {
        prompt += `Filler Words to Reduce: ${evaluation.fillerWords.join(", ")}
`;
      }

      if (evaluation.badQuestions && evaluation.badQuestions.length > 0) {
        prompt += `
Questions to Avoid:
`;
        evaluation.badQuestions.forEach((question, index) => {
          prompt += `${index + 1}. ${question}
`;
        });
      }
    }

    prompt += `
COACHING INSTRUCTIONS:
1. Start by greeting the user and explaining you'll provide feedback first
2. Give specific, actionable feedback based on the evaluation data above
3. Be constructive but direct about areas for improvement
4. Highlight what they did well to build confidence
5. After providing feedback, ask if they're ready to practice with a mock client scenario
6. Wait for their confirmation before switching to Phase 2

PHASE 2 - MOCK CLIENT PRACTICE (Only after user confirms they want to practice)
Once the user agrees to practice:
1. Switch to acting as a realistic client/prospect based on the original conversation
2. Present similar challenges and objections from the original call
3. Test the areas that need improvement identified in the evaluation
4. Be appropriately challenging but fair
5. Stay in character as the client throughout the practice session

MOCK CLIENT BEHAVIOR GUIDELINES:
- Simulate a similar client personality and context from the original call
- Present realistic objections and questions
- Test the salesperson on their weak areas identified in the evaluation
- Be responsive to improved sales techniques
- Don't break character to give coaching during the practice

START WITH PHASE 1 - Provide coaching feedback first and ask if they want to practice.`;

    return prompt;
  };

  const createMockAgent = async () => {
    if (!selectedSession) {
      toast.error("Please select a session first");
      return;
    }

    try {
      setIsCreatingAgent(true);
      const systemPrompt = generateMockSystemPrompt(
        selectedSession,
        evaluation
      );

      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

      // Get available voices
      const voicesResponse = await fetch(`${serverUrl}/api/elevenlabs/voices`);
      if (!voicesResponse.ok) {
        throw new Error("Failed to fetch voices");
      }
      const voicesData = await voicesResponse.json();
      const voices = voicesData.voices || [];

      // Use the first available voice
      const voiceId =
        voices.length > 0 ? voices[0].voice_id : "21m00Tcm4TlvDq8ikWAM";

      // Create agent
      const agentResponse = await fetch(`${serverUrl}/api/elevenlabs/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Mock Session - ${selectedSession.id.slice(0, 8)}`,
          system_prompt: systemPrompt,
          voice_id: voiceId,
          conversation_config: {
            agent: {
              first_message:
                "Hello! I'm your sales performance coach. I've analyzed your recent call and I'm here to help you improve. Let me start by giving you some feedback on what I observed, and then we can practice together. Are you ready to hear what I found?",
              language: "en",
            },
          },
        }),
      });

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        throw new Error(errorData.error || "Failed to create mock agent");
      }

      const agentData = await agentResponse.json();
      const createdAgentId =
        agentData.agent_id || agentData.agentId || agentData.id;

      if (!createdAgentId) {
        throw new Error("Agent created but no ID returned");
      }

      setMockAgentId(createdAgentId);
      toast.success("AI Coach created successfully!");
    } catch (error) {
      console.error("Error creating mock agent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create mock agent";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const startMockConversation = async () => {
    if (!mockAgentId) {
      toast.error("Please create a mock agent first");
      return;
    }

    try {
      setError(null);
      setConversationMessages([]);

      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
      const userId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "demo-user-001";

      const response = await fetch(
        `${serverUrl}/api/elevenlabs/conversation-token?agentId=${encodeURIComponent(
          mockAgentId
        )}&userId=${encodeURIComponent(userId)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get conversation token");
      }

      const { conversationToken } = await response.json();

      const conversationId = await conversation.startSession({
        conversationToken,
        connectionType: "webrtc",
      });

      setCurrentConversationId(conversationId);
      addMessage("Mock practice session started", "system");

      if (conversation.setVolume) {
        await conversation.setVolume({ volume: isMuted ? 0 : 1 });
      }
    } catch (error) {
      console.error("Error starting mock conversation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start mock conversation";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const endMockConversation = async () => {
    try {
      await conversation.endSession();
      setCurrentConversationId(null);
      addMessage("Mock practice session ended", "system");
      toast.info("Mock practice session ended");
    } catch (error) {
      console.error("Error ending mock conversation:", error);
      toast.error("Error ending mock conversation");
    }
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (conversation.setVolume) {
      try {
        await conversation.setVolume({ volume: newMutedState ? 0 : 1 });
        toast.info(newMutedState ? "Muted" : "Unmuted");
      } catch (error) {
        console.error("Error setting volume:", error);
        toast.error("Error changing volume");
      }
    }
  };

  const resetSession = () => {
    setMockAgentId("");
    setConversationMessages([]);
    setCurrentConversationId(null);
    setError(null);
    if (conversation.status === "connected") {
      endMockConversation();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";

  return (
    <div className='w-full space-y-6'>
      <Card className='p-6'>
        <div className='space-y-6'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold mb-2'>Mock Sales Practice</h2>
            <p className='text-muted-foreground'>
              Get personalized feedback and practice with AI coaching based on
              your previous sales conversations
            </p>
          </div>

          <Tabs defaultValue='setup' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='setup'>Setup Mock Session</TabsTrigger>
              <TabsTrigger value='practice'>Practice Session</TabsTrigger>
            </TabsList>

            <TabsContent value='setup' className='space-y-4'>
              {/* Session Selection */}
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='sessionSelect'>Select Previous Session</Label>
                  <select
                    id='sessionSelect'
                    className='w-full p-2 border rounded-md'
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    disabled={loading || isCreatingAgent}
                  >
                    <option value=''>Select a session...</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {formatDate(session.startedAt)} -{" "}
                        {session.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSession && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <Card className='p-4'>
                        <h3 className='font-semibold mb-2 flex items-center gap-2'>
                          <User className='h-4 w-4' />
                          Client Transcript
                        </h3>
                        <div className='text-sm text-muted-foreground max-h-32 overflow-y-auto'>
                          {selectedSession.transcriptInput ||
                            "No client transcript available"}
                        </div>
                      </Card>

                      <Card className='p-4'>
                        <h3 className='font-semibold mb-2 flex items-center gap-2'>
                          <MessageSquare className='h-4 w-4' />
                          Sales Transcript
                        </h3>
                        <div className='text-sm text-muted-foreground max-h-32 overflow-y-auto'>
                          {selectedSession.transcriptOutput ||
                            "No sales transcript available"}
                        </div>
                      </Card>
                    </div>

                    {evaluation && (
                      <div>
                        <h3 className='font-semibold mb-4'>
                          Performance Evaluation
                        </h3>
                        <EvaluationDisplay evaluation={evaluation} />
                      </div>
                    )}

                    <div className='flex gap-4'>
                      <Button
                        onClick={createMockAgent}
                        disabled={isCreatingAgent || !selectedSession}
                        className='flex items-center gap-2'
                      >
                        {isCreatingAgent ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Creating AI Coach...
                          </>
                        ) : (
                          <>
                            <Bot className='h-4 w-4' />
                            Create AI Coach
                          </>
                        )}
                      </Button>

                      {mockAgentId && (
                        <Button
                          onClick={resetSession}
                          variant='outline'
                          className='flex items-center gap-2'
                        >
                          <RotateCcw className='h-4 w-4' />
                          Reset
                        </Button>
                      )}
                    </div>

                    {mockAgentId && (
                      <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
                        <p className='text-green-700 text-sm'>
                          ✅ AI Coach created! Switch to the Practice Session
                          tab to get feedback and start practicing.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value='practice' className='space-y-4'>
              {!mockAgentId ? (
                <div className='text-center p-8'>
                  <Bot className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                  <p className='text-muted-foreground'>
                    Please create an AI coach in the Setup tab first
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {/* Control Buttons */}
                  <div className='flex justify-center gap-4'>
                    <Button
                      onClick={
                        isConnected
                          ? endMockConversation
                          : startMockConversation
                      }
                      disabled={isConnecting}
                      variant={isConnected ? "destructive" : "default"}
                      size='lg'
                      className='flex items-center gap-2'
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className='h-5 w-5 animate-spin' />
                          Connecting...
                        </>
                      ) : isConnected ? (
                        <>
                          <PhoneOff className='h-5 w-5' />
                          End Practice
                        </>
                      ) : (
                        <>
                          <Play className='h-5 w-5' />
                          Start Practice
                        </>
                      )}
                    </Button>

                    {isConnected && (
                      <Button
                        onClick={toggleMute}
                        variant='outline'
                        size='lg'
                        className='flex items-center gap-2'
                      >
                        {isMuted ? (
                          <>
                            <VolumeX className='h-5 w-5' />
                            Unmute
                          </>
                        ) : (
                          <>
                            <Volume2 className='h-5 w-5' />
                            Mute
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className='flex items-center justify-center gap-2 text-sm'>
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isConnected
                          ? "bg-green-500"
                          : isConnecting
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={
                        isConnected
                          ? "text-green-600"
                          : isConnecting
                          ? "text-yellow-600"
                          : "text-gray-600"
                      }
                    >
                      {isConnected
                        ? "Coaching Session Active"
                        : isConnecting
                        ? "Connecting..."
                        : "Ready for Coaching"}
                    </span>

                    {isConnected && conversation.isSpeaking && (
                      <>
                        <div className='h-3 w-3 rounded-full bg-blue-500 animate-pulse ml-4' />
                        <span className='text-blue-600'>AI Coach Speaking</span>
                      </>
                    )}
                  </div>

                  {/* Conversation Messages */}
                  {conversationMessages.length > 0 && (
                    <Card className='p-4'>
                      <h3 className='font-semibold mb-4'>Coaching Session</h3>
                      <div className='space-y-2 max-h-64 overflow-y-auto'>
                        {conversationMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-2 rounded-md text-sm ${
                              message.sender === "user"
                                ? "bg-blue-100 ml-8"
                                : message.sender === "agent"
                                ? "bg-gray-100 mr-8"
                                : "bg-yellow-50 text-center"
                            }`}
                          >
                            <div className='font-medium text-xs mb-1'>
                              {message.sender === "user"
                                ? "You"
                                : message.sender === "agent"
                                ? "AI Coach"
                                : "System"}
                            </div>
                            {message.text}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {error && (
            <div className='flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md'>
              <AlertCircle className='h-4 w-4 text-red-500' />
              <span className='text-red-700 text-sm'>{error}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
