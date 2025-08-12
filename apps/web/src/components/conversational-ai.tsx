"use client";

import { useState, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Mic,
  MicOff,
  Loader2,
  Settings,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "./ui/label";

interface ConversationMessage {
  id: string;
  text: string;
  sender: "user" | "agent" | "system";
  timestamp: Date;
  isFinal?: boolean;
}

const predefinedAgents = [
  {
    id: "1",
    name: "Eagle",
  },
  {
    id: "2",
    name: "Owl",
  },
  {
    id: "3",
    name: "Peacock",
  },
  {
    id: "4",
    name: "Dove",
  },
];

export function ConversationalAI() {
  // Configuration state
  const [agentId, setAgentId] = useState(
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || ""
  );
  const [userId, setUserId] = useState("");
  // Always use WebRTC
  const [isMuted, setIsMuted] = useState(false);

  // Agents list
  type ListedAgent = { id: string; name?: string };
  const [agents, setAgents] = useState<ListedAgent[]>(predefinedAgents);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize the conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs conversation");
      setError(null);
      addMessage("Connected to AI agent", "system");
      toast.success("Connected to AI agent");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs conversation");
      addMessage("Disconnected from AI agent", "system");
      setCurrentConversationId(null);
    },
    onMessage: (message) => {
      // Be permissive with payload shape from SDK
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

      // Fallback
      if (text) addMessage(text, "system");
    },
    onError: (error) => {
      const msg = (error as any)?.message ?? String(error);
      console.error("Conversation error:", error);
      setError(msg || "An error occurred");
      addMessage(`Error: ${msg || "Unknown error"}`, "system");
      toast.error(`Conversation error: ${msg || "Unknown error"}`);

      // Auto-retry connection after a delay if it's a connection error
      if (
        typeof msg === "string" &&
        (msg.includes("connection") || msg.includes("network"))
      ) {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          if (currentConversationId && conversation.status === "disconnected") {
            console.log("Attempting to reconnect...");
            startConversation();
          }
        }, 3000);
      }
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

    setMessages((prev) => {
      // If this is an interim message, replace the last interim message from the same sender
      if (isInterim) {
        const lastMessageIndex = prev.length - 1;
        if (
          lastMessageIndex >= 0 &&
          prev[lastMessageIndex].sender === sender &&
          !prev[lastMessageIndex].isFinal
        ) {
          // Replace the last interim message
          const updated = [...prev];
          updated[lastMessageIndex] = newMessage;
          return updated;
        }
      }

      return [...prev, newMessage];
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Request microphone permission on component mount
  useEffect(() => {
    // Set a default user id until auth is implemented
    const defaultUser =
      process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "demo-user-001";
    setUserId(defaultUser);

    // Load agents
    void refreshAgents();

    const requestMicrophonePermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone permission granted");
      } catch (error) {
        console.error("Microphone permission denied:", error);
        setError("Microphone access is required for voice conversation");
        toast.error("Please allow microphone access for voice conversation");
      }
    };

    requestMicrophonePermission();
  }, []);

  const refreshAgents = async () => {
    try {
      setLoadingAgents(true);
      setAgentsError(null);

      let backendAgents: ListedAgent[] = [];

      try {
        const serverUrl =
          process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
        const resp = await fetch(`${serverUrl}/api/elevenlabs/agents`);
        if (resp.ok) {
          const data = await resp.json();
          backendAgents = (data.agents || [])
            .map((a: any) => ({
              id: a.agent_id || a.agentId || a.id,
              name: a.name || a.agent_name || undefined,
            }))
            .filter((a: ListedAgent) => !!a.id);
        } else {
          console.warn(
            "Failed to fetch backend agents, using only predefined agents"
          );
        }
      } catch (e) {
        console.warn(
          "Backend agents unavailable, using only predefined agents:",
          e
        );
      }

      // Combine predefined agents with backend agents
      // Remove duplicates by ID, preferring backend agents over predefined ones
      const combinedAgents: ListedAgent[] = [...predefinedAgents];

      backendAgents.forEach((backendAgent) => {
        const existingIndex = combinedAgents.findIndex(
          (agent) => agent.id === backendAgent.id
        );
        if (existingIndex >= 0) {
          // Replace predefined agent with backend agent (backend has priority)
          combinedAgents[existingIndex] = backendAgent;
        } else {
          // Add new backend agent
          combinedAgents.push(backendAgent);
        }
      });

      setAgents(combinedAgents);

      // If no agent selected yet, preselect the first
      if (!agentId && combinedAgents.length > 0) {
        setAgentId(combinedAgents[0].id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load agents";
      setAgentsError(msg);
      // Fallback to predefined agents only
      setAgents(predefinedAgents);
      if (!agentId && predefinedAgents.length > 0) {
        setAgentId(predefinedAgents[0].id);
      }
      toast.error(msg);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const startConversation = async () => {
    if (!agentId.trim()) {
      setError("Agent ID is required");
      toast.error("Please enter an Agent ID");
      return;
    }

    setIsInitializing(true);
    setError(null);
    setMessages([]);

    try {
      let conversationId: string;

      // Always use WebRTC
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
      const response = await fetch(
        `${serverUrl}/api/elevenlabs/conversation-token?agentId=${encodeURIComponent(
          agentId
        )}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get conversation token");
      }

      const { conversationToken } = await response.json();

      conversationId = await conversation.startSession({
        conversationToken,
        connectionType: "webrtc",
      });

      setCurrentConversationId(conversationId);
      addMessage("Conversation started", "system");

      // Set initial volume to 100% (or 0 if muted)
      if (conversation.setVolume) {
        await conversation.setVolume({ volume: isMuted ? 0 : 1 });
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start conversation";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
      setCurrentConversationId(null);
      addMessage("Conversation ended", "system");
      toast.info("Conversation ended");
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast.error("Error ending conversation");
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

  const clearMessages = () => {
    setMessages([]);
    toast.info("Messages cleared");
  };

  const isConnected = conversation.status === "connected";
  const isConnecting = isInitializing || conversation.status === "connecting";

  return (
    <div className='w-full space-y-6'>
      {/* Configuration Section */}
      <Card className='p-6'>
        <div className='space-y-4'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold mb-2'>Practice sales sparring</h2>
          </div>

          {/* Configuration Form */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='agentSelect'>Agent *</Label>
              <div className='flex gap-2'>
                <select
                  id='agentSelect'
                  className='w-full p-2 border rounded-md'
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  disabled={isConnected || loadingAgents}
                >
                  {agents.length === 0 ? (
                    <option value=''>No agents found</option>
                  ) : (
                    agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name ? `${a.name} — ${a.id.slice(0, 8)}…` : a.id}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {agentsError && (
                <p className='text-xs text-red-600'>{agentsError}</p>
              )}
            </div>

            {/* User ID removed; using hard-coded default until auth is implemented */}

            {/* Connection type removed; WebRTC enforced */}

            {/* Volume slider removed; audio is always 100% unless muted */}
          </div>

          {/* Control Buttons */}
          <div className='flex justify-center gap-4'>
            <Button
              onClick={isConnected ? endConversation : startConversation}
              disabled={isConnecting || (!agentId.trim() && !isConnected)}
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
                  End Conversation
                </>
              ) : (
                <>
                  <Phone className='h-5 w-5' />
                  Start Conversation
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
                ? "Connected"
                : isConnecting
                ? "Connecting..."
                : "Disconnected"}
            </span>

            {isConnected && conversation.isSpeaking && (
              <>
                <div className='h-3 w-3 rounded-full bg-blue-500 animate-pulse ml-4' />
                <span className='text-blue-600'>Agent Speaking</span>
              </>
            )}

            {isConnected && currentConversationId && (
              <span className='text-xs text-gray-500 ml-4'>
                ID: {currentConversationId.slice(0, 8)}...
              </span>
            )}
          </div>

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
