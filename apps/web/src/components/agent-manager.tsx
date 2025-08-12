"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import {
  Bot,
  Plus,
  Settings,
  Mic,
  Save,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

interface Agent {
  agent_id: string;
  name: string;
  system_prompt: string;
  voice_id: string;
  voice_name?: string;
  conversation_config?: {
    agent_prompt?: string;
    first_message?: string;
    language?: string;
  };
  created_at?: string;
}

interface CreateAgentRequest {
  name: string;
  system_prompt: string;
  voice_id: string;
  conversation_config: {
    agent_prompt: string;
    first_message?: string;
    language: string;
  };
}

export function AgentManager() {
  // State for voices
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  // State for agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // State for creating new agent
  const [isCreating, setIsCreating] = useState(false);
  const [newAgent, setNewAgent] = useState<CreateAgentRequest>({
    name: "",
    system_prompt: "",
    voice_id: "",
    conversation_config: {
      agent_prompt: "",
      first_message: "Hello! How can I help you today?",
      language: "en",
    },
  });

  // Talk speed (TTS) control: 0.7 - 1.2 per ElevenLabs docs
  const [talkSpeed, setTalkSpeed] = useState<number>(1.0);

  // Sales client personality selection (Dove/Peacock/Owl/Eagle)
  const [clientPersonality, setClientPersonality] = useState<
    "" | "dove" | "peacock" | "owl" | "eagle"
  >("");
  const personalityLabels: Record<
    "dove" | "peacock" | "owl" | "eagle",
    string
  > = {
    dove: "Dove — Amiable / Relationship-oriented",
    peacock: "Peacock — Expressive / Social",
    owl: "Owl — Analytical / Detail-oriented",
    eagle: "Eagle — Driver / Results-oriented",
  };
  const personalitySnippets: Record<
    "dove" | "peacock" | "owl" | "eagle",
    string
  > = {
    dove: "Client personality: Dove (amiable, relationship-oriented). Traits: peaceful, cooperative, avoids conflict, values trust and stability. Selling approach: build rapport, be patient and reassuring, emphasize reliability and support, avoid aggressive tactics.",
    peacock:
      "Client personality: Peacock (expressive, social). Traits: outgoing, optimistic, talkative, enjoys recognition and excitement. Selling approach: be enthusiastic, use stories and visuals, let them speak, make it engaging and fun.",
    owl: "Client personality: Owl (analytical, detail-oriented). Traits: logical, methodical, data-driven, cautious, needs facts before deciding. Selling approach: provide evidence and numbers, be precise, explain the process and tradeoffs, give time to analyze.",
    eagle:
      "Client personality: Eagle (driver, results-oriented). Traits: bold, decisive, competitive, goal-focused, fast-moving. Selling approach: get to the point, highlight ROI and outcomes, present next steps clearly, respect their time.",
  };

  // State for selected voice preview
  const [selectedVoicePreview, setSelectedVoicePreview] = useState<
    string | null
  >(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  // State for active tab
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  // Visibility state for sensitive data
  const [showSystemPrompts, setShowSystemPrompts] = useState<{
    [key: string]: boolean;
  }>({});

  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

  // Load voices on mount
  useEffect(() => {
    loadVoices();
  }, []);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  const loadVoices = async () => {
    try {
      setLoadingVoices(true);
      setVoicesError(null);

      const response = await fetch(`${serverUrl}/api/elevenlabs/voices`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load voices");
      }

      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error("Error loading voices:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load voices";
      setVoicesError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingVoices(false);
    }
  };

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      setAgentsError(null);

      const response = await fetch(`${serverUrl}/api/elevenlabs/agents`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load agents");
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error loading agents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load agents";
      setAgentsError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingAgents(false);
    }
  };

  const playVoicePreview = async (voiceId: string, voiceName: string) => {
    try {
      setPlayingPreview(voiceId);

      const response = await fetch(
        `${serverUrl}/api/elevenlabs/voice-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_id: voiceId,
            text: `Hello! I'm ${voiceName}. This is how I sound.`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate voice preview");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setPlayingPreview(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingPreview(null);
        URL.revokeObjectURL(audioUrl);
        toast.error("Failed to play voice preview");
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing voice preview:", error);
      setPlayingPreview(null);
      toast.error("Failed to play voice preview");
    }
  };

  const createAgent = async () => {
    if (!newAgent.name.trim()) {
      toast.error("Please enter an agent name");
      return;
    }

    if (!newAgent.system_prompt.trim()) {
      toast.error("Please enter a system prompt");
      return;
    }

    if (!newAgent.voice_id) {
      toast.error("Please select a voice");
      return;
    }

    try {
      setIsCreating(true);
      // Compose system prompt with optional client personality guidance
      const personaSnippet = clientPersonality
        ? `\n\n${personalitySnippets[clientPersonality]}`
        : "";
      const payload = {
        ...newAgent,
        system_prompt: `${newAgent.system_prompt}${personaSnippet}`.trim(),
        conversation_config: {
          ...newAgent.conversation_config,
          // Pass TTS speed to server → ElevenLabs
          tts: { speed: talkSpeed },
        },
      };

      const response = await fetch(`${serverUrl}/api/elevenlabs/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create agent");
      }

      const createdAgent = await response.json();
      toast.success(`Agent "${newAgent.name}" created successfully!`);

      // Reset form
      setNewAgent({
        name: "",
        system_prompt: "",
        voice_id: "",
        conversation_config: {
          agent_prompt: "",
          first_message: "Hello! How can I help you today?",
          language: "en",
        },
      });
      setClientPersonality("");

      // Reload agents and switch to manage tab
      await loadAgents();
      setActiveTab("manage");
    } catch (error) {
      console.error("Error creating agent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create agent";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteAgent = async (agentId: string, agentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete agent "${agentName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${serverUrl}/api/elevenlabs/agents/${agentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete agent");
      }

      toast.success(`Agent "${agentName}" deleted successfully`);
      await loadAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete agent";
      toast.error(errorMessage);
    }
  };

  const copyAgentId = async (agentId: string) => {
    try {
      await navigator.clipboard.writeText(agentId);
      toast.success("Agent ID copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy Agent ID");
    }
  };

  const toggleSystemPromptVisibility = (agentId: string) => {
    setShowSystemPrompts((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  const selectedVoice = voices.find((v) => v.voice_id === newAgent.voice_id);

  return (
    <div className='w-full space-y-6'>
      {/* Header */}
      <Card className='p-6'>
        <div className='text-center'>
          <h2 className='text-2xl font-bold mb-2 flex items-center justify-center gap-2'>
            <Bot className='h-6 w-6' />
            AI Agent Manager
          </h2>
          <p className='text-muted-foreground'>
            Create and manage custom conversational AI agents with personalized
            voices and prompts
          </p>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "create" | "manage")}
      >
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='create' className='flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Create Agent
          </TabsTrigger>
          <TabsTrigger value='manage' className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            Manage Agents
          </TabsTrigger>
        </TabsList>

        {/* Create Agent Tab */}
        <TabsContent value='create' className='mt-6'>
          <Card className='p-6'>
            <div className='space-y-6'>
              <h3 className='text-lg font-semibold'>Create New Agent</h3>

              {/* Agent Basic Info */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='agent-name'>Agent Name *</Label>
                  <Input
                    id='agent-name'
                    placeholder='e.g., Gym Owner Client (for sales practice)'
                    value={newAgent.name}
                    onChange={(e) =>
                      setNewAgent((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='language'>Language</Label>
                  <select
                    id='language'
                    className='w-full p-2 border rounded-md'
                    value={newAgent.conversation_config.language}
                    onChange={(e) =>
                      setNewAgent((prev) => ({
                        ...prev,
                        conversation_config: {
                          ...prev.conversation_config,
                          language: e.target.value,
                        },
                      }))
                    }
                  >
                    <option value='en'>English</option>
                    <option value='es'>Spanish</option>
                    <option value='fr'>French</option>
                    <option value='de'>German</option>
                    <option value='it'>Italian</option>
                    <option value='pt'>Portuguese</option>
                    <option value='zh'>Chinese</option>
                    <option value='ja'>Japanese</option>
                    <option value='ko'>Korean</option>
                  </select>
                </div>
              </div>

              {/* Client Personality (DISC birds) */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='client-personality'>Client Personality</Label>
                  <select
                    id='client-personality'
                    className='w-full p-2 border rounded-md'
                    value={clientPersonality}
                    onChange={(e) =>
                      setClientPersonality(
                        e.target.value as
                          | ""
                          | "dove"
                          | "peacock"
                          | "owl"
                          | "eagle"
                      )
                    }
                  >
                    <option value=''>None</option>
                    <option value='dove'>
                      🕊 Dove — Amiable / Relationship-oriented
                    </option>
                    <option value='peacock'>
                      🦚 Peacock — Expressive / Social
                    </option>
                    <option value='owl'>
                      🦉 Owl — Analytical / Detail-oriented
                    </option>
                    <option value='eagle'>
                      🦅 Eagle — Driver / Results-oriented
                    </option>
                  </select>
                  {clientPersonality && (
                    <p className='text-xs text-gray-600'>
                      {personalityLabels[clientPersonality]}
                    </p>
                  )}
                </div>

                {/* Talk Speed */}
                <div className='space-y-2'>
                  <Label htmlFor='talk-speed'>
                    Talk Speed: {talkSpeed.toFixed(2)}x
                  </Label>
                  <div className='px-2'>
                    <Slider
                      id='talk-speed'
                      min={0.7}
                      max={1.2}
                      step={0.05 as any}
                      value={[talkSpeed] as any}
                      onValueChange={(vals: number[] | any) => {
                        const v = Array.isArray(vals) ? vals[0] : vals;
                        if (typeof v === "number")
                          setTalkSpeed(Math.min(1.2, Math.max(0.7, v)));
                      }}
                    />
                  </div>
                  <p className='text-xs text-gray-600'>
                    Range 0.70x – 1.20x. Lower is slower, higher is faster.
                  </p>
                </div>
              </div>

              {/* System Prompt */}
              <div className='space-y-2'>
                <Label htmlFor='system-prompt'>System Prompt *</Label>
                <textarea
                  id='system-prompt'
                  className='w-full p-3 border rounded-md min-h-[120px]'
                  placeholder="Define the agent as a SALES CLIENT for practice. Example: 'You are a gym owner who runs a busy fitness center with 500+ members. You're interested in adding ice baths to improve member recovery and attract new clients. You have a budget of $15-25k and need to see clear ROI. Ask detailed questions about installation, maintenance costs, member usage data, and how it will help with member retention. Be realistic about gym owner concerns like space, liability, and ongoing costs.'"
                  value={newAgent.system_prompt}
                  onChange={(e) =>
                    setNewAgent((prev) => ({
                      ...prev,
                      system_prompt: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Agent Prompt (optional) */}
              <div className='space-y-2'>
                <Label htmlFor='agent-prompt'>
                  Additional Instructions (optional)
                </Label>
                <textarea
                  id='agent-prompt'
                  className='w-full p-3 border rounded-md min-h-[80px]'
                  placeholder='Additional sales client behaviors: "Show skepticism about price at first, ask for references from similar gyms, inquire about trial periods or financing options, express concerns about member adoption rates..."'
                  value={newAgent.conversation_config.agent_prompt}
                  onChange={(e) =>
                    setNewAgent((prev) => ({
                      ...prev,
                      conversation_config: {
                        ...prev.conversation_config,
                        agent_prompt: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              {/* First Message */}
              <div className='space-y-2'>
                <Label htmlFor='first-message'>First Message</Label>
                <Input
                  id='first-message'
                  placeholder='e.g., "Hi there! I heard you have ice bath solutions for gyms. I run FitLife Gym and I&apos;m exploring recovery options for my members. Can you tell me more about your products?"'
                  value={newAgent.conversation_config.first_message}
                  onChange={(e) =>
                    setNewAgent((prev) => ({
                      ...prev,
                      conversation_config: {
                        ...prev.conversation_config,
                        first_message: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              {/* Voice Selection */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Label>Select Voice *</Label>
                  {loadingVoices && (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  )}
                </div>

                {voicesError ? (
                  <div className='flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md'>
                    <AlertCircle className='h-4 w-4 text-red-500' />
                    <span className='text-red-700 text-sm'>{voicesError}</span>
                    <Button
                      onClick={loadVoices}
                      variant='outline'
                      size='sm'
                      className='ml-auto'
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto'>
                    {voices.map((voice) => (
                      <Card
                        key={voice.voice_id}
                        className={`p-3 cursor-pointer transition-all ${
                          newAgent.voice_id === voice.voice_id
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setNewAgent((prev) => ({
                            ...prev,
                            voice_id: voice.voice_id,
                          }))
                        }
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex-1'>
                            <h4 className='font-medium text-sm'>
                              {voice.name}
                            </h4>
                            <p className='text-xs text-gray-600'>
                              {voice.category}
                            </p>
                            {voice.description && (
                              <p className='text-xs text-gray-500 mt-1 line-clamp-2'>
                                {voice.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={(e) => {
                              e.stopPropagation();
                              playVoicePreview(voice.voice_id, voice.name);
                            }}
                            disabled={playingPreview === voice.voice_id}
                          >
                            {playingPreview === voice.voice_id ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <Mic className='h-4 w-4' />
                            )}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedVoice && (
                  <div className='p-3 bg-blue-50 border border-blue-200 rounded-md'>
                    <p className='text-sm text-blue-800'>
                      <strong>Selected:</strong> {selectedVoice.name} (
                      {selectedVoice.category})
                    </p>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <div className='flex justify-end'>
                <Button
                  onClick={createAgent}
                  disabled={
                    isCreating ||
                    !newAgent.name.trim() ||
                    !newAgent.system_prompt.trim() ||
                    !newAgent.voice_id
                  }
                  className='flex items-center gap-2'
                >
                  {isCreating ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className='h-4 w-4' />
                      Create Agent
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Manage Agents Tab */}
        <TabsContent value='manage' className='mt-6'>
          <Card className='p-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold'>Your Agents</h3>
                <Button
                  onClick={loadAgents}
                  variant='outline'
                  size='sm'
                  disabled={loadingAgents}
                >
                  {loadingAgents ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>

              {agentsError ? (
                <div className='flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md'>
                  <AlertCircle className='h-4 w-4 text-red-500' />
                  <span className='text-red-700 text-sm'>{agentsError}</span>
                  <Button
                    onClick={loadAgents}
                    variant='outline'
                    size='sm'
                    className='ml-auto'
                  >
                    Retry
                  </Button>
                </div>
              ) : agents.length === 0 ? (
                <div className='text-center py-12 text-gray-500'>
                  <Bot className='h-12 w-12 mx-auto mb-4 text-gray-400' />
                  <p>No agents created yet.</p>
                  <p className='text-sm'>
                    Create your first agent in the "Create Agent" tab.
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {agents.map((agent) => (
                    <Card key={agent.agent_id} className='p-4'>
                      <div className='space-y-3'>
                        {/* Agent Header */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <Bot className='h-5 w-5 text-blue-500' />
                            <div>
                              <h4 className='font-medium'>{agent.name}</h4>
                              <p className='text-sm text-gray-600'>
                                Voice: {agent.voice_name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => copyAgentId(agent.agent_id)}
                            >
                              <Copy className='h-4 w-4' />
                              Copy ID
                            </Button>
                            <Button
                              variant='destructive'
                              size='sm'
                              onClick={() =>
                                deleteAgent(agent.agent_id, agent.name)
                              }
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>

                        {/* Agent Details */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                          <div>
                            <Label className='text-xs font-medium text-gray-600'>
                              Agent ID
                            </Label>
                            <p className='font-mono text-xs break-all  p-2 rounded'>
                              {agent.agent_id}
                            </p>
                          </div>
                          <div>
                            <Label className='text-xs font-medium text-gray-600'>
                              Language
                            </Label>
                            <p>{agent.conversation_config?.language || "en"}</p>
                          </div>
                        </div>

                        {/* First Message */}
                        {agent.conversation_config?.first_message && (
                          <div>
                            <Label className='text-xs font-medium text-gray-600 flex items-center gap-1'>
                              <MessageSquare className='h-3 w-3' />
                              First Message
                            </Label>
                            <p className='text-sm bg-gray-50 p-2 rounded'>
                              {agent.conversation_config.first_message}
                            </p>
                          </div>
                        )}

                        {/* System Prompt */}
                        <div>
                          <div className='flex items-center justify-between mb-2'>
                            <Label className='text-xs font-medium text-gray-600 flex items-center gap-1'>
                              <User className='h-3 w-3' />
                              System Prompt
                            </Label>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                toggleSystemPromptVisibility(agent.agent_id)
                              }
                            >
                              {showSystemPrompts[agent.agent_id] ? (
                                <EyeOff className='h-4 w-4' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                          </div>
                          <div className='text-sm  p-3 rounded'>
                            {showSystemPrompts[agent.agent_id] ? (
                              <p className='whitespace-pre-wrap'>
                                {agent.system_prompt}
                              </p>
                            ) : (
                              <p className='text-gray-500 italic'>
                                Click the eye icon to view system prompt
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Additional Instructions */}
                        {agent.conversation_config?.agent_prompt && (
                          <div>
                            <Label className='text-xs font-medium text-gray-600'>
                              Additional Instructions
                            </Label>
                            <p className='text-sm bg-gray-50 p-2 rounded'>
                              {agent.conversation_config.agent_prompt}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
