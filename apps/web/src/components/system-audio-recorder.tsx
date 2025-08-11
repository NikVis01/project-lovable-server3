"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Monitor, MonitorSpeaker, Square } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  timestamp: string;
  sessionId?: string;
}

export function SystemAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [outputTranscript, setOutputTranscript] = useState("");
  const [finalOutputTranscripts, setFinalOutputTranscripts] = useState<
    string[]
  >([]);
  const [currentOutputInterim, setCurrentOutputInterim] = useState("");
  const [browserSupported, setBrowserSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check browser compatibility on mount
  useEffect(() => {
    const checkBrowserSupport = () => {
      const isSupported =
        navigator.mediaDevices &&
        navigator.mediaDevices.getDisplayMedia &&
        window.isSecureContext;

      setBrowserSupported(isSupported);

      if (!isSupported) {
        console.warn("System audio capture not supported:", {
          mediaDevices: !!navigator.mediaDevices,
          getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
          secureContext: window.isSecureContext,
          userAgent: navigator.userAgent,
        });
      }
    };

    checkBrowserSupport();
  }, []);

  // Initialize socket connection for output transcription
  useEffect(() => {
    const serverUrl =
      process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

    socketRef.current = io(serverUrl, {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server for system audio");
      setIsConnected(true);
      toast.success("Connected to system audio transcription server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    socket.on("transcription-started", () => {
      console.log("System audio transcription started");
      toast.success("System audio transcription started");
    });

    socket.on("transcription-result", (data: TranscriptionResult) => {
      console.log("System audio transcription result:", data);

      if (data.isFinal) {
        setFinalOutputTranscripts((prev) => [...prev, data.transcript]);
        setCurrentOutputInterim("");

        // Send the final transcript as output to the server
        sendTranscriptOutput(data.transcript, true);
      } else {
        setCurrentOutputInterim(data.transcript);

        // Send interim transcript as output to the server
        sendTranscriptOutput(data.transcript, false);
      }
    });

    socket.on("transcription-error", (data: { error: string }) => {
      console.error("System audio transcription error:", data.error);
      toast.error(`System audio transcription error: ${data.error}`);
      stopRecording();
    });

    socket.on("transcription-ended", () => {
      console.log("System audio transcription ended");
      toast.info("System audio transcription ended");
      setIsRecording(false);
    });

    socket.on("transcription-stopped", () => {
      console.log("System audio transcription stopped");
      toast.info("System audio transcription stopped");
      setIsRecording(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update combined transcript
  useEffect(() => {
    const combinedTranscript = [...finalOutputTranscripts, currentOutputInterim]
      .join(" ")
      .trim();
    setOutputTranscript(combinedTranscript);
  }, [finalOutputTranscripts, currentOutputInterim]);

  // Send transcript output to the server
  const sendTranscriptOutput = (text: string, isFinal: boolean = false) => {
    if (socketRef.current && isConnected && text.trim()) {
      socketRef.current.emit("transcript-output", {
        text: text.trim(),
        isFinal,
      });
    }
  };

  const startSystemAudioRecording = async () => {
    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error(
          "Screen capture (getDisplayMedia) is not supported in this browser. Please use Chrome, Edge, or Firefox."
        );
      }

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error(
          "Screen capture requires a secure context (HTTPS or localhost)."
        );
      }

      console.log("Requesting system audio capture...");

      // Request screen sharing with audio (system audio capture)
      // Note: We need to request video as well in many browsers, then ignore it
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
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

      displayStreamRef.current = displayStream;

      // Extract audio tracks
      const audioTracks = displayStream.getAudioTracks();

      if (audioTracks.length === 0) {
        throw new Error(
          "No audio tracks found in system capture. Make sure to enable 'Share system audio' in the screen share dialog."
        );
      }

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;

      // Create MediaRecorder for the audio stream
      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
      };

      // Fallback options if the preferred codec isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          options.mimeType = "audio/wav";
        }
      }

      mediaRecorderRef.current = new MediaRecorder(audioStream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // Convert blob to base64 and send to server
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            const base64Data = base64Audio.split(",")[1]; // Remove data:audio/webm;base64, prefix

            if (socketRef.current && isConnected) {
              socketRef.current.emit("audio-data", base64Data);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Clean up
        audioChunksRef.current = [];
      };

      // Start recording in chunks for real-time streaming
      mediaRecorderRef.current.start(250); // Send data every 250ms
      setIsRecording(true);

      // Start transcription on server (this will recognize system audio as output)
      if (socketRef.current && isConnected) {
        socketRef.current.emit("start-transcription", {
          languageCode: "en-US",
          sampleRateHertz: 16000,
          sourceType: "output", // Specify this is system audio output
        });
      }

      // Monitor for stream ending (user stops screen share)
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
    } catch (error) {
      console.error("Error starting system audio recording:", error);

      // Try alternative approach with different constraints
      if (error instanceof Error && error.name === "NotSupportedError") {
        try {
          console.log("Trying alternative approach - tab audio capture...");

          // Alternative: Request with minimal video and focus on audio
          const alternativeStream =
            await navigator.mediaDevices.getDisplayMedia({
              video: true, // Some browsers require video to be true
              audio: true, // Simplified audio request
            });

          displayStreamRef.current = alternativeStream;

          // Extract audio tracks
          const audioTracks = alternativeStream.getAudioTracks();

          if (audioTracks.length === 0) {
            throw new Error(
              "No audio tracks found. Your browser may not support system audio capture, or you need to select 'Share tab audio' in the dialog."
            );
          }

          // Create audio-only stream
          const audioStream = new MediaStream(audioTracks);
          streamRef.current = audioStream;

          // Continue with the same MediaRecorder setup...
          const options: MediaRecorderOptions = {
            mimeType: "audio/webm;codecs=opus",
          };

          if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
            options.mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
              options.mimeType = "audio/wav";
            }
          }

          mediaRecorderRef.current = new MediaRecorder(audioStream, options);

          // Same event handlers as before...
          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);

              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Audio = reader.result as string;
                const base64Data = base64Audio.split(",")[1];

                if (socketRef.current && isConnected) {
                  socketRef.current.emit("audio-data", base64Data);
                }
              };
              reader.readAsDataURL(event.data);
            }
          };

          mediaRecorderRef.current.onstop = () => {
            audioChunksRef.current = [];
          };

          mediaRecorderRef.current.start(250);
          setIsRecording(true);

          if (socketRef.current && isConnected) {
            socketRef.current.emit("start-transcription", {
              languageCode: "en-US",
              sampleRateHertz: 16000,
              sourceType: "output", // Specify this is system audio output
            });
          }

          // Monitor for stream ending
          alternativeStream.getAudioTracks().forEach((track) => {
            track.addEventListener("ended", () => {
              console.log("Audio share ended by user");
              stopRecording();
            });
          });

          toast.success("Started tab audio capture (alternative mode)");
        } catch (alternativeError) {
          console.error("Alternative approach also failed:", alternativeError);
          toast.error(
            `System audio capture not supported: ${
              alternativeError instanceof Error
                ? alternativeError.message
                : "Unknown error"
            }`
          );
        }
      } else {
        toast.error(
          `Failed to start system audio recording: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit("stop-transcription");
    }

    setIsRecording(false);
  };

  const clearTranscript = () => {
    setOutputTranscript("");
    setFinalOutputTranscripts([]);
    setCurrentOutputInterim("");
  };

  const copyToClipboard = async () => {
    if (outputTranscript) {
      try {
        await navigator.clipboard.writeText(outputTranscript);
        toast.success("System audio transcript copied to clipboard");
      } catch (error) {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  return (
    <div className='w-full space-y-4'>
      {/* Control Buttons */}
      <div className='flex items-center justify-center gap-4'>
        <Button
          onClick={isRecording ? stopRecording : startSystemAudioRecording}
          disabled={!isConnected || !browserSupported}
          variant={isRecording ? "destructive" : "default"}
          size='lg'
          className='flex items-center gap-2'
        >
          {isRecording ? (
            <>
              <Square className='h-5 w-5' />
              Stop System Audio
            </>
          ) : (
            <>
              <Monitor className='h-5 w-5' />
              Capture System Audio
            </>
          )}
        </Button>

        {outputTranscript && (
          <>
            <Button onClick={clearTranscript} variant='outline'>
              Clear
            </Button>
            <Button onClick={copyToClipboard} variant='outline'>
              Copy
            </Button>
          </>
        )}
      </div>

      {/* Connection Status */}
      <div className='flex items-center justify-center gap-2 text-sm'>
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className={isConnected ? "text-green-600" : "text-red-600"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        {!browserSupported && (
          <>
            <div className='h-2 w-2 rounded-full bg-yellow-500 ml-4' />
            <span className='text-yellow-600'>Browser not supported</span>
          </>
        )}
        {isRecording && (
          <>
            <div className='h-2 w-2 rounded-full bg-orange-500 animate-pulse ml-4' />
            <span className='text-orange-600'>Recording System Audio</span>
          </>
        )}
      </div>

      {/* Browser Compatibility Warning */}
      {!browserSupported && (
        <Card className='p-4 bg-yellow-50 border-yellow-200'>
          <h4 className='font-medium mb-2 text-yellow-800'>
            ⚠️ Browser Not Supported
          </h4>
          <div className='text-sm text-yellow-700 space-y-2'>
            <p>
              System audio capture is not supported in your current browser or
              environment.
            </p>
            <p>
              <strong>Requirements:</strong>
            </p>
            <ul className='ml-4 space-y-1'>
              <li>• Chrome 70+, Edge 79+, or Firefox 92+</li>
              <li>• HTTPS connection (or localhost for development)</li>
              <li>• Recent browser version with getDisplayMedia support</li>
            </ul>
            <p>
              <strong>Current status:</strong>
            </p>
            <ul className='ml-4 space-y-1 font-mono text-xs'>
              <li>• Media Devices: {navigator.mediaDevices ? "✅" : "❌"}</li>
              <li>
                • getDisplayMedia:{" "}
                {navigator.mediaDevices?.getDisplayMedia ? "✅" : "❌"}
              </li>
              <li>• Secure Context: {window.isSecureContext ? "✅" : "❌"}</li>
            </ul>
          </div>
        </Card>
      )}

      {/* System Audio Transcription Display */}
      <Card className='min-h-[200px] p-4 bg-orange-50 border-orange-200'>
        <div className='space-y-2'>
          <h3 className='text-lg font-semibold mb-4 text-orange-800 flex items-center gap-2'>
            <MonitorSpeaker className='h-5 w-5' />
            System Audio Output Transcription
          </h3>

          {outputTranscript ? (
            <div className='space-y-2'>
              {/* Final transcripts */}
              {finalOutputTranscripts.map((finalText, index) => (
                <p
                  key={index}
                  className='text-orange-900 bg-white p-2 rounded border'
                >
                  {finalText}
                </p>
              ))}

              {/* Current interim result */}
              {currentOutputInterim && (
                <p className='text-orange-700 italic bg-orange-100 p-2 rounded border-dashed border'>
                  {currentOutputInterim}
                </p>
              )}
            </div>
          ) : (
            <p className='text-orange-600 text-center py-8'>
              {isConnected
                ? "Click 'Capture System Audio' to transcribe audio playing on your system..."
                : "Connecting to transcription server..."}
            </p>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className='p-4 bg-orange-50 border-orange-200'>
        <h4 className='font-medium mb-2 text-orange-800'>
          System Audio Capture Instructions:
        </h4>
        <ul className='text-sm text-orange-700 space-y-1'>
          <li>
            • Click "Capture System Audio" to start recording system audio
            output
          </li>
          <li>
            • <strong>Chrome/Edge:</strong> In the screen share dialog, select
            "Share tab audio" or "Share system audio"
          </li>
          <li>
            • <strong>Firefox:</strong> Make sure to enable "Share audio" in the
            screen share dialog
          </li>
          <li>
            • This will transcribe any audio playing in your browser or on your
            computer
          </li>
          <li>
            • Works best with browser tab audio (YouTube, Netflix, podcasts,
            etc.)
          </li>
          <li>
            • The transcribed text is automatically sent as "output transcript"
            to the database
          </li>
          <li>
            • Both input (microphone) and output (system audio) are stored
            separately
          </li>
          <li>
            • <strong>Note:</strong> System audio capture support varies by
            browser and OS
          </li>
        </ul>
      </Card>
    </div>
  );
}
