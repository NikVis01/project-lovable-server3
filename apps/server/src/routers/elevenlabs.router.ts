import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma/index.js";

const elevenlabsRouter: Router = Router();

// Input validation schema
const AgentRequestSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  userId: z.string().optional(),
});

// Endpoint to get signed URL for WebSocket connection
elevenlabsRouter.get("/signed-url", async (req: Request, res: Response) => {
  try {
    const { agentId, userId } = AgentRequestSchema.parse(req.query);

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ElevenLabs API key not configured",
      });
    }

    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
    );
    url.searchParams.set("agent_id", agentId);
    if (userId) {
      url.searchParams.set("user_id", userId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API error:", response.status, errorData);
      return res.status(500).json({
        error: "Failed to get signed URL from ElevenLabs",
      });
    }

    const data = await response.json();
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error getting signed URL:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request parameters",
        details: error.issues,
      });
    }

    res.status(500).json({
      error: "Failed to get signed URL",
    });
  }
});

// Endpoint to get conversation token for WebRTC connection
elevenlabsRouter.get(
  "/conversation-token",
  async (req: Request, res: Response) => {
    try {
      const { agentId, userId } = AgentRequestSchema.parse(req.query);

      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(500).json({
          error: "ElevenLabs API key not configured",
        });
      }

      const url = new URL(
        "https://api.elevenlabs.io/v1/convai/conversation/token"
      );
      url.searchParams.set("agent_id", agentId);
      if (userId) {
        url.searchParams.set("user_id", userId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("ElevenLabs API error:", response.status, errorData);
        return res.status(500).json({
          error: "Failed to get conversation token from ElevenLabs",
        });
      }

      const data = await response.json();
      res.json({ conversationToken: data.token });
    } catch (error) {
      console.error("Error getting conversation token:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request parameters",
          details: error.issues,
        });
      }

      res.status(500).json({
        error: "Failed to get conversation token",
      });
    }
  }
);

// Endpoint to get available voices
elevenlabsRouter.get("/voices", async (req: Request, res: Response) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ElevenLabs API key not configured",
      });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API error:", response.status, errorData);
      return res.status(500).json({
        error: "Failed to fetch voices from ElevenLabs",
      });
    }

    const data = await response.json();
    res.json({ voices: data.voices || [] });
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({
      error: "Failed to fetch voices",
    });
  }
});

// Endpoint to generate voice preview
elevenlabsRouter.post("/voice-preview", async (req: Request, res: Response) => {
  try {
    const { voice_id, text } = req.body;

    if (!voice_id || !text) {
      return res.status(400).json({
        error: "voice_id and text are required",
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ElevenLabs API key not configured",
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API error:", response.status, errorData);
      return res.status(500).json({
        error: "Failed to generate voice preview",
      });
    }

    const audioBuffer = await response.arrayBuffer();

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength.toString(),
    });

    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("Error generating voice preview:", error);
    res.status(500).json({
      error: "Failed to generate voice preview",
    });
  }
});

// Endpoint to list agents
elevenlabsRouter.get("/agents", async (req: Request, res: Response) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ElevenLabs API key not configured",
      });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/convai/agents", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API error:", response.status, errorData);
      return res.status(500).json({
        error: "Failed to fetch agents from ElevenLabs",
      });
    }

    const data = await response.json();
    res.json({ agents: data.agents || [] });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({
      error: "Failed to fetch agents",
    });
  }
});

// Endpoint to create an agent
elevenlabsRouter.post("/agents", async (req: Request, res: Response) => {
  try {
    const { name, system_prompt, voice_id, conversation_config } = req.body;

    if (!name || !system_prompt || !voice_id) {
      return res.status(400).json({
        error: "name, system_prompt, and voice_id are required",
      });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ElevenLabs API key not configured",
      });
    }

    // Build payload matching current REST schema, preserving incoming overrides
    const incoming =
      conversation_config && typeof conversation_config === "object"
        ? conversation_config
        : {};

    const agentData = {
      name,
      conversation_config: {
        ...(incoming as Record<string, unknown>),
        agent: {
          ...(incoming as any).agent,
          first_message:
            (incoming as any)?.first_message ??
            (incoming as any)?.agent?.first_message ??
            "Hello! How can I help you today?",
          language:
            (incoming as any)?.language ??
            (incoming as any)?.agent?.language ??
            "en",
          prompt: {
            ...(incoming as any)?.agent?.prompt,
            prompt: system_prompt,
          },
        },
        tts: {
          ...(incoming as any)?.tts,
          voice_id,
        },
      },
    };

    // Per ElevenLabs REST docs, agent creation uses /v1/convai/agents/create
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/create",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentData),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API error:", response.status, errorData);
      return res.status(500).json({
        error: "Failed to create agent",
      });
    }

    const data = await response.json();

    // Persist locally (best-effort)
    try {
      const createdAgentId: string | undefined =
        (data as any)?.agent_id || (data as any)?.agentId || (data as any)?.id;
      if (createdAgentId) {
        const derivedVoiceId: string | undefined =
          (incoming as any)?.tts?.voice_id || voice_id;
        await prisma.convAIAgent.upsert({
          where: { agentId: createdAgentId },
          update: {
            name,
            voiceId: derivedVoiceId,
            config: (incoming as any) ?? undefined,
          },
          create: {
            agentId: createdAgentId,
            userId: (req.body?.userId as string | undefined) ?? null,
            name,
            voiceId: derivedVoiceId,
            config: (incoming as any) ?? undefined,
          },
        });
      }
    } catch (dbErr) {
      console.warn("Failed to persist ConvAIAgent locally:", dbErr);
    }

    res.json(data);
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({
      error: "Failed to create agent",
    });
  }
});

// Endpoint to delete an agent
elevenlabsRouter.delete(
  "/agents/:agentId",
  async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;

      if (!process.env.ELEVENLABS_API_KEY) {
        return res.status(500).json({
          error: "ElevenLabs API key not configured",
        });
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          method: "DELETE",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("ElevenLabs API error:", response.status, errorData);
        return res.status(500).json({
          error: "Failed to delete agent",
        });
      }

      // Best-effort local cleanup
      try {
        await prisma.convAIAgent.delete({ where: { agentId } });
      } catch (dbErr) {
        // ignore if not found
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({
        error: "Failed to delete agent",
      });
    }
  }
);

export { elevenlabsRouter };
