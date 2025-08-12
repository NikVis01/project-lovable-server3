"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Mic, Monitor, Square, Play, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  timestamp: string;
  sessionId?: string;
}

export function UnifiedTranscriptionRecorder() {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "idle" | "selecting-tab" | "recording"
  >("idle");

  // Input (microphone) transcription states
  const [inputTranscript, setInputTranscript] = useState("");
  const [finalInputTranscripts, setFinalInputTranscripts] = useState<string[]>(
    []
  );
  const [currentInputInterim, setCurrentInputInterim] = useState("");

  // Output (system audio) transcription states
  const [outputTranscript, setOutputTranscript] = useState("");
  const [finalOutputTranscripts, setFinalOutputTranscripts] = useState<
    string[]
  >([]);
  const [currentOutputInterim, setCurrentOutputInterim] = useState("");

  // Audio playback states
  const [inputAudioUrl, setInputAudioUrl] = useState<string | null>(null);
  const [outputAudioUrl, setOutputAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Tab switching state
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Browser support
  const [microphoneSupported, setMicrophoneSupported] = useState(true);
  const [systemAudioSupported, setSystemAudioSupported] = useState(true);

  // Refs for microphone recording
  const micMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSocketRef = useRef<Socket | null>(null);
  const micAudioChunksRef = useRef<Blob[]>([]);

  // Refs for system audio recording
  const systemMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const systemDisplayStreamRef = useRef<MediaStream | null>(null);
  const systemSocketRef = useRef<Socket | null>(null);
  const systemAudioChunksRef = useRef<Blob[]>([]);

  // Session tracking
  const currentSessionIdRef = useRef<string | null>(null);
  const clientIdRef = useRef<string>(
    `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Helper function to switch tabs with debouncing
  const switchTabWithDelay = (newTab: "input" | "output") => {
    // Only switch if we're currently on a different tab and recording
    if (activeTab !== newTab && isRecording) {
      // Clear any existing timeout
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
      }

      // Set a new timeout to switch tabs - only if there's significant content
      tabSwitchTimeoutRef.current = setTimeout(() => {
        setActiveTab(newTab);
      }, 1000); // 1 second delay to avoid rapid switching and ensure significant content
    }
  };

  // Load session audio URLs
  const loadSessionAudio = async (sessionId: string) => {
    try {
      setIsLoadingAudio(true);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
        }/api/transcripts/${sessionId}`
      );

      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.audioInputUrl) {
          setInputAudioUrl(sessionData.audioInputUrl);
        }
        if (sessionData.audioOutputUrl) {
          setOutputAudioUrl(sessionData.audioOutputUrl);
        }
      }
    } catch (error) {
      console.error("Error loading session audio:", error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      // Check microphone support
      const micSupported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      );
      setMicrophoneSupported(micSupported);

      // Check system audio support
      const systemSupported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getDisplayMedia === "function" &&
        window.isSecureContext
      );
      setSystemAudioSupported(systemSupported);

      if (!micSupported || !systemSupported) {
        console.warn("Recording capabilities:", {
          microphone: micSupported,
          systemAudio: systemSupported,
          mediaDevices: !!navigator.mediaDevices,
          getUserMedia: !!navigator.mediaDevices?.getUserMedia,
          getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
          secureContext: window.isSecureContext,
        });
      }
    };

    checkBrowserSupport();
  }, []);

  // Initialize socket connections
  useEffect(() => {
    const serverUrl =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      "https://project-lovable-server3.onrender.com";

    // Initialize microphone socket with better production settings
    micSocketRef.current = io(serverUrl, {
      transports: ["polling", "websocket"], // Allow fallback to polling
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Initialize system audio socket with better production settings
    systemSocketRef.current = io(serverUrl, {
      transports: ["polling", "websocket"], // Allow fallback to polling
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const micSocket = micSocketRef.current;
    const systemSocket = systemSocketRef.current;

    // Microphone socket events
    micSocket.on("connect", () => {
      console.log("Connected to server for microphone");
      setIsConnected(true);
      toast.success("Connected to transcription server");
    });

    micSocket.on("disconnect", (reason) => {
      console.log("Disconnected from microphone server:", reason);
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    micSocket.on("connect_error", (error) => {
      console.error("Microphone socket connection error:", error);
      setIsConnected(false);
      toast.error(`Connection failed: ${error.message}`);
    });

    micSocket.on("reconnect", (attemptNumber) => {
      console.log(
        "Reconnected to microphone server after",
        attemptNumber,
        "attempts"
      );
      setIsConnected(true);
      toast.success("Reconnected to server");
    });

    micSocket.on("reconnect_error", (error) => {
      console.error("Reconnection failed:", error);
      toast.error("Reconnection failed");
    });

    micSocket.on("transcription-started", (data: { sessionId: string }) => {
      console.log(
        "Microphone transcription started with session:",
        data.sessionId
      );
      currentSessionIdRef.current = data.sessionId;
      // Load existing audio URLs if any
      loadSessionAudio(data.sessionId);
    });

    micSocket.on("transcription-result", (data: TranscriptionResult) => {
      console.log("Microphone transcription result:", data);

      // Auto-switch to input tab when microphone transcription comes in (only for significant content)
      if (data.transcript && data.transcript.trim().length > 10) {
        switchTabWithDelay("input");
      }

      if (data.isFinal) {
        setFinalInputTranscripts((prev) => [...prev, data.transcript]);
        setCurrentInputInterim("");
      } else {
        setCurrentInputInterim(data.transcript);
      }
    });

    micSocket.on("transcription-error", (data: { error: string }) => {
      console.error("Microphone transcription error:", data.error);
      toast.error(`Microphone transcription error: ${data.error}`);
      stopRecording();
    });

    // System audio socket events
    systemSocket.on("connect", () => {
      console.log("Connected to server for system audio");
    });

    systemSocket.on("connect_error", (error) => {
      console.error("System audio socket connection error:", error);
    });

    systemSocket.on("disconnect", (reason) => {
      console.log("System audio socket disconnected:", reason);
    });

    systemSocket.on("transcription-result", (data: TranscriptionResult) => {
      console.log("System audio transcription result:", data);

      // Auto-switch to output tab when system audio transcription comes in (only for significant content)
      if (data.transcript && data.transcript.trim().length > 10) {
        switchTabWithDelay("output");
      }

      if (data.isFinal) {
        setFinalOutputTranscripts((prev) => [...prev, data.transcript]);
        setCurrentOutputInterim("");
      } else {
        setCurrentOutputInterim(data.transcript);
      }
    });

    systemSocket.on("transcription-error", (data: { error: string }) => {
      console.error("System audio transcription error:", data.error);
      toast.error(`System audio transcription error: ${data.error}`);
      stopRecording();
    });

    return () => {
      micSocket.disconnect();
      systemSocket.disconnect();

      // Clear any pending tab switch timeout
      if (tabSwitchTimeoutRef.current) {
        clearTimeout(tabSwitchTimeoutRef.current);
      }
    };
  }, []);

  // Update combined transcripts
  useEffect(() => {
    const combinedInputTranscript = [
      ...finalInputTranscripts,
      currentInputInterim,
    ]
      .join(" ")
      .trim();
    setInputTranscript(combinedInputTranscript);
  }, [finalInputTranscripts, currentInputInterim]);

  useEffect(() => {
    const combinedOutputTranscript = [
      ...finalOutputTranscripts,
      currentOutputInterim,
    ]
      .join(" ")
      .trim();
    setOutputTranscript(combinedOutputTranscript);
  }, [finalOutputTranscripts, currentOutputInterim]);

  const startUnifiedRecording = async () => {
    try {
      setCurrentStep("selecting-tab");
      toast.info("Please select a browser tab to capture system audio...");

      // Step 1: Start system audio capture first (requires user interaction)
      await startSystemAudioCapture();

      // Step 2: Start microphone capture
      await startMicrophoneCapture();

      setIsRecording(true);
      setCurrentStep("recording");
      toast.success("Recording both microphone and system audio!");
    } catch (error) {
      console.error("Error starting unified recording:", error);
      setCurrentStep("idle");
      toast.error(
        `Failed to start recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      // Clean up any partial setups
      stopRecording();
    }
  };

  const startSystemAudioCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("System audio capture not supported in this browser");
    }

    if (!window.isSecureContext) {
      throw new Error("System audio capture requires HTTPS or localhost");
    }

    // Request system audio capture
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1 },
        height: { ideal: 1 },
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 16000,
        channelCount: 1,
      } as MediaTrackConstraints,
    });

    systemDisplayStreamRef.current = displayStream;

    // Extract audio tracks
    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error(
        "No audio tracks found. Make sure to enable 'Share system audio' in the screen share dialog."
      );
    }

    // Create audio-only stream
    const audioStream = new MediaStream(audioTracks);
    systemStreamRef.current = audioStream;

    // Set up MediaRecorder
    const options: MediaRecorderOptions = {
      mimeType: "audio/webm;codecs=opus",
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options.mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "audio/wav";
      }
    }

    systemMediaRecorderRef.current = new MediaRecorder(audioStream, options);

    systemMediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Store chunk for full recording
        systemAudioChunksRef.current.push(event.data);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(",")[1];

          if (systemSocketRef.current && isConnected) {
            systemSocketRef.current.emit("audio-data", base64Data);
          }
        };
        reader.readAsDataURL(event.data);
      }
    };

    systemMediaRecorderRef.current.onstop = () => {
      console.log("System audio recording stopped");
    };

    systemMediaRecorderRef.current.start(250);

    // Start transcription for system audio
    if (systemSocketRef.current && isConnected) {
      systemSocketRef.current.emit("start-transcription", {
        languageCode: "en-US",
        sampleRateHertz: 16000,
        sourceType: "output",
        clientId: clientIdRef.current,
      });
    }

    // Monitor for stream ending
    displayStream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        console.log("Screen share ended by user");
        stopRecording();
      });
    });

    audioTracks.forEach((track) => {
      track.addEventListener("ended", () => {
        console.log("Audio share ended by user");
        stopRecording();
      });
    });
  };

  const startMicrophoneCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    });

    micStreamRef.current = stream;

    const options: MediaRecorderOptions = {
      mimeType: "audio/webm;codecs=opus",
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      options.mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "audio/wav";
      }
    }

    micMediaRecorderRef.current = new MediaRecorder(stream, options);

    micMediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Store chunk for full recording
        micAudioChunksRef.current.push(event.data);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const base64Data = base64Audio.split(",")[1];

          if (micSocketRef.current && isConnected) {
            micSocketRef.current.emit("audio-data", base64Data);
          }
        };
        reader.readAsDataURL(event.data);
      }
    };

    micMediaRecorderRef.current.start(250);

    // Start transcription for microphone
    if (micSocketRef.current && isConnected) {
      micSocketRef.current.emit("start-transcription", {
        languageCode: "en-US",
        sampleRateHertz: 16000,
        sourceType: "input",
        clientId: clientIdRef.current,
      });
    }
  };

  // Function to upload recordings to server
  const uploadRecordings = async () => {
    if (!currentSessionIdRef.current) {
      console.warn("No session ID available for uploading recordings");
      return;
    }

    try {
      // Upload microphone recording
      if (micAudioChunksRef.current.length > 0) {
        const micBlob = new Blob(micAudioChunksRef.current, {
          type: "audio/webm",
        });
        const micFormData = new FormData();
        micFormData.append("audio", micBlob, "microphone_recording.webm");
        micFormData.append("sessionId", currentSessionIdRef.current);
        micFormData.append("type", "input");

        fetch(
          `${
            process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
          }/api/upload-recording`,
          {
            method: "POST",
            body: micFormData,
          }
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("Microphone recording uploaded:", data.url);
            setInputAudioUrl(data.url);
            toast.success("Sales recording saved successfully!");
          })
          .catch((error) => {
            console.error("Error uploading microphone recording:", error);
            toast.error("Failed to save sales recording");
          });
      }

      // Upload system audio recording
      if (systemAudioChunksRef.current.length > 0) {
        const systemBlob = new Blob(systemAudioChunksRef.current, {
          type: "audio/webm",
        });
        const systemFormData = new FormData();
        systemFormData.append(
          "audio",
          systemBlob,
          "system_audio_recording.webm"
        );
        systemFormData.append("sessionId", currentSessionIdRef.current);
        systemFormData.append("type", "output");

        fetch(
          `${
            process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
          }/api/upload-recording`,
          {
            method: "POST",
            body: systemFormData,
          }
        )
          .then((response) => response.json())
          .then((data) => {
            console.log("System audio recording uploaded:", data.url);
            setOutputAudioUrl(data.url);
            toast.success("Client recording saved successfully!");
          })
          .catch((error) => {
            console.error("Error uploading system audio recording:", error);
            toast.error("Failed to save client recording");
          });
      }
    } catch (error) {
      console.error("Error uploading recordings:", error);
    }
  };

  const stopRecording = () => {
    // Upload recordings before stopping
    uploadRecordings();

    // Stop microphone recording
    if (
      micMediaRecorderRef.current &&
      micMediaRecorderRef.current.state === "recording"
    ) {
      micMediaRecorderRef.current.stop();
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (micSocketRef.current && isConnected) {
      micSocketRef.current.emit("stop-transcription");
    }

    // Stop system audio recording
    if (
      systemMediaRecorderRef.current &&
      systemMediaRecorderRef.current.state === "recording"
    ) {
      systemMediaRecorderRef.current.stop();
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach((track) => track.stop());
      systemStreamRef.current = null;
    }
    if (systemDisplayStreamRef.current) {
      systemDisplayStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
      systemDisplayStreamRef.current = null;
    }
    if (systemSocketRef.current && isConnected) {
      systemSocketRef.current.emit("stop-transcription");
    }

    // Clear audio chunks
    micAudioChunksRef.current = [];
    systemAudioChunksRef.current = [];
    currentSessionIdRef.current = null;

    setIsRecording(false);
    setCurrentStep("idle");

    // Reset to input tab when recording stops
    setActiveTab("input");
  };

  const clearTranscripts = () => {
    setInputTranscript("");
    setOutputTranscript("");
    setFinalInputTranscripts([]);
    setFinalOutputTranscripts([]);
    setCurrentInputInterim("");
    setCurrentOutputInterim("");
    setInputAudioUrl(null);
    setOutputAudioUrl(null);

    // Reset to input tab when clearing
    setActiveTab("input");
  };

  const copyToClipboard = async (text: string, type: string) => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(`${type} transcript copied to clipboard`);
      } catch (error) {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case "selecting-tab":
        return "Select a browser tab to capture system audio...";
      case "recording":
        return "Recording both microphone and system audio";
      default:
        return isConnected ? "Ready to record" : "Connecting...";
    }
  };

  const canStartRecording =
    isConnected && microphoneSupported && systemAudioSupported && !isRecording;

  return (
    <div className='w-full space-y-6'>
      {/* Control Section */}
      <Card className='p-6'>
        <div className='space-y-4'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold mb-2'>
              Sales Call Transcription
            </h2>
            <p className='text-muted-foreground'>
              Record both sales representative (microphone) and client (system
              audio) simultaneously
            </p>
          </div>

          {/* Main Record Button */}
          <div className='flex justify-center'>
            <Button
              onClick={isRecording ? stopRecording : startUnifiedRecording}
              disabled={!canStartRecording && !isRecording}
              variant={isRecording ? "destructive" : "default"}
              size='lg'
              className='flex items-center gap-2 px-8 py-4 text-lg'
            >
              {isRecording ? (
                <>
                  <Square className='h-6 w-6' />
                  Stop Recording
                </>
              ) : (
                <>
                  <Play className='h-6 w-6' />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {/* Status */}
          <div className='flex items-center justify-center gap-4 text-sm'>
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className={isConnected ? "text-green-600" : "text-red-600"}>
              {getStepMessage()}
            </span>
            {isRecording && (
              <>
                <div className='h-3 w-3 rounded-full bg-red-500 animate-pulse' />
                <span className='text-red-600 font-medium'>RECORDING</span>
              </>
            )}
          </div>

          {/* Compatibility Status */}
          <div className='flex justify-center gap-8 text-sm'>
            <div className='flex items-center gap-2'>
              <Mic className='h-4 w-4' />
              <span
                className={
                  microphoneSupported ? "text-green-600" : "text-red-600"
                }
              >
                Sales Rep: {microphoneSupported ? "✅" : "❌"}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Monitor className='h-4 w-4' />
              <span
                className={
                  systemAudioSupported ? "text-green-600" : "text-red-600"
                }
              >
                Client Audio: {systemAudioSupported ? "✅" : "❌"}
              </span>
            </div>
          </div>

          {/* Clear Button */}
          {(inputTranscript || outputTranscript) && (
            <div className='flex justify-center'>
              <Button onClick={clearTranscripts} variant='outline' size='sm'>
                <Trash2 className='h-4 w-4 mr-2' />
                Clear All Transcripts
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Transcription Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "input" | "output")}
        className='w-full'
      >
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger
            value='input'
            className='flex items-center gap-2 relative'
          >
            <Mic
              className={`h-4 w-4 ${
                currentInputInterim && isRecording
                  ? "text-blue-500 animate-pulse"
                  : ""
              }`}
            />
            Sales
            {currentInputInterim && isRecording && (
              <div className='absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-ping'></div>
            )}
            {finalInputTranscripts.length > 0 && (
              <span className='ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full'>
                {finalInputTranscripts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value='output'
            className='flex items-center gap-2 relative'
          >
            <Monitor
              className={`h-4 w-4 ${
                currentOutputInterim && isRecording
                  ? "text-orange-500 animate-pulse"
                  : ""
              }`}
            />
            Client
            {currentOutputInterim && isRecording && (
              <div className='absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full animate-ping'></div>
            )}
            {finalOutputTranscripts.length > 0 && (
              <span className='ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full'>
                {finalOutputTranscripts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='input' className='mt-4'>
          <Card className='min-h-[300px] p-4'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold flex items-center gap-2'>
                  <Mic className='h-5 w-5 text-blue-500' />
                  Sales Transcription
                </h3>
                <div className='flex items-center gap-2'>
                  {inputAudioUrl && (
                    <audio controls className='h-8' preload='none'>
                      <source src={inputAudioUrl} type='audio/webm' />
                      <source src={inputAudioUrl} type='audio/wav' />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  {inputTranscript && (
                    <Button
                      onClick={() => copyToClipboard(inputTranscript, "Sales")}
                      variant='outline'
                      size='sm'
                    >
                      <Copy className='h-4 w-4 mr-2' />
                      Copy
                    </Button>
                  )}
                </div>
              </div>

              {inputTranscript ? (
                <div className='space-y-2'>
                  {finalInputTranscripts.map((finalText, index) => (
                    <p
                      key={index}
                      className='text-gray-900 bg-blue-50 p-3 rounded border'
                    >
                      {finalText}
                    </p>
                  ))}

                  {currentInputInterim && (
                    <p className='text-blue-700 italic bg-blue-100 p-3 rounded border-dashed border'>
                      {currentInputInterim}
                    </p>
                  )}
                </div>
              ) : (
                <p className='text-gray-500 text-center py-12'>
                  {isConnected
                    ? "Start recording to see sales transcription here..."
                    : "Connecting to transcription server..."}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='output' className='mt-4'>
          <Card className='min-h-[300px] p-4'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold flex items-center gap-2'>
                  <Monitor className='h-5 w-5 text-orange-500' />
                  Client Transcription
                </h3>
                <div className='flex items-center gap-2'>
                  {outputAudioUrl && (
                    <audio controls className='h-8' preload='none'>
                      <source src={outputAudioUrl} type='audio/webm' />
                      <source src={outputAudioUrl} type='audio/wav' />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  {outputTranscript && (
                    <Button
                      onClick={() =>
                        copyToClipboard(outputTranscript, "Client")
                      }
                      variant='outline'
                      size='sm'
                    >
                      <Copy className='h-4 w-4 mr-2' />
                      Copy
                    </Button>
                  )}
                </div>
              </div>

              {outputTranscript ? (
                <div className='space-y-2'>
                  {finalOutputTranscripts.map((finalText, index) => (
                    <p
                      key={index}
                      className='text-gray-900 bg-orange-50 p-3 rounded border'
                    >
                      {finalText}
                    </p>
                  ))}

                  {currentOutputInterim && (
                    <p className='text-orange-700 italic bg-orange-100 p-3 rounded border-dashed border'>
                      {currentOutputInterim}
                    </p>
                  )}
                </div>
              ) : (
                <p className='text-gray-500 text-center py-12'>
                  {isConnected
                    ? "Start recording to see client transcription here..."
                    : "Connecting to transcription server..."}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card className='p-4 bg-blue-50 border-blue-200'>
        <h4 className='font-medium mb-2 text-blue-800'>📝 How to Use:</h4>
        <ul className='text-sm text-blue-700 space-y-1'>
          <li>
            • Click "Start Recording" to begin simultaneous sales representative
            and client audio capture
          </li>
          <li>
            • You'll first be prompted to select a browser tab for client audio
            capture
          </li>
          <li>
            • Make sure to enable "Share tab audio" or "Share system audio" in
            the dialog
          </li>
          <li>
            • Both sales representative and client audio will be transcribed in
            real-time
          </li>
          <li>
            • Use the tabs above to switch between viewing Sales and Client
            transcriptions
          </li>
          <li>• Both transcriptions are automatically saved to the database</li>
          <li>
            • Click "Stop Recording" to end both recordings simultaneously
          </li>
        </ul>
      </Card>

      {/* Browser Compatibility Warning */}
      {(!microphoneSupported || !systemAudioSupported) && (
        <Card className='p-4 bg-yellow-50 border-yellow-200'>
          <h4 className='font-medium mb-2 text-yellow-800'>
            ⚠️ Compatibility Issues
          </h4>
          <div className='text-sm text-yellow-700 space-y-2'>
            {!microphoneSupported && (
              <p>
                • Microphone access is not supported in your current browser
              </p>
            )}
            {!systemAudioSupported && (
              <p>
                • System audio capture is not supported in your current
                environment
              </p>
            )}
            <p>
              <strong>Requirements:</strong>
            </p>
            <ul className='ml-4 space-y-1'>
              <li>• Modern browser (Chrome 70+, Edge 79+, or Firefox 92+)</li>
              <li>• HTTPS connection (or localhost for development)</li>
              <li>• Microphone and system audio permissions</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
