"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  timestamp: number;
}

export function SpeechTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscripts, setFinalTranscripts] = useState<string[]>([]);
  const [currentInterim, setCurrentInterim] = useState("");
  const [outputText, setOutputText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize socket connection
  useEffect(() => {
    const serverUrl =
      process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

    socketRef.current = io(serverUrl, {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      toast.success("Connected to transcription server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      toast.error("Disconnected from server");
    });

    socket.on("transcription-started", () => {
      console.log("Transcription started");
      toast.success("Transcription started");
    });

    socket.on("transcription-result", (data: TranscriptionResult) => {
      console.log("Transcription result:", data);

      if (data.isFinal) {
        setFinalTranscripts((prev) => [...prev, data.transcript]);
        setCurrentInterim("");
      } else {
        setCurrentInterim(data.transcript);
      }
    });

    socket.on("transcription-error", (data: { error: string }) => {
      console.error("Transcription error:", data.error);
      toast.error(`Transcription error: ${data.error}`);
      stopRecording();
    });

    socket.on("transcription-ended", () => {
      console.log("Transcription ended");
      toast.info("Transcription ended");
      setIsRecording(false);
    });

    socket.on("transcription-stopped", () => {
      console.log("Transcription stopped");
      toast.info("Transcription stopped");
      setIsRecording(false);
    });

    socket.on("transcript-output-cleared", () => {
      console.log("Transcript output cleared");
      toast.success("Output transcript cleared");
    });

    socket.on("transcript-output-error", (data: { error: string }) => {
      console.error("Transcript output error:", data.error);
      toast.error(`Output error: ${data.error}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update combined transcript
  useEffect(() => {
    const combinedTranscript = [...finalTranscripts, currentInterim]
      .join(" ")
      .trim();
    setTranscript(combinedTranscript);
  }, [finalTranscripts, currentInterim]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder with appropriate codec
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

      mediaRecorderRef.current = new MediaRecorder(stream, options);

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

      // Start transcription on server
      if (socketRef.current && isConnected) {
        socketRef.current.emit("start-transcription", {
          languageCode: "en-US",
          sampleRateHertz: 16000,
        });
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(
        "Failed to start recording. Please check microphone permissions."
      );
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

    if (socketRef.current && isConnected) {
      socketRef.current.emit("stop-transcription");
    }

    setIsRecording(false);
  };

  const clearTranscript = () => {
    setTranscript("");
    setFinalTranscripts([]);
    setCurrentInterim("");
  };

  const copyToClipboard = async () => {
    if (transcript) {
      try {
        await navigator.clipboard.writeText(transcript);
        toast.success("Transcript copied to clipboard");
      } catch (error) {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  // Send transcript output when text is being spoken or displayed
  const sendTranscriptOutput = (text: string, isFinal: boolean = false) => {
    if (socketRef.current && isConnected && text.trim()) {
      socketRef.current.emit("transcript-output", {
        text: text.trim(),
        isFinal,
      });
    }
  };

  // Test function to simulate output transcript
  const testOutputTranscript = () => {
    const testText = "This is a test output message being sent to the server.";
    setOutputText(testText);
    sendTranscriptOutput(testText, true);
    toast.success("Test output transcript sent");
  };

  // Clear output transcript
  const clearOutputTranscript = () => {
    setOutputText("");
    if (socketRef.current && isConnected) {
      socketRef.current.emit("clear-transcript-output");
    }
  };

  return (
    <div className='w-full space-y-4'>
      {/* Control Buttons */}
      <div className='flex items-center justify-center gap-4'>
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isConnected}
          variant={isRecording ? "destructive" : "default"}
          size='lg'
          className='flex items-center gap-2'
        >
          {isRecording ? (
            <>
              <Square className='h-5 w-5' />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className='h-5 w-5' />
              Start Recording
            </>
          )}
        </Button>

        {transcript && (
          <>
            <Button onClick={clearTranscript} variant='outline'>
              Clear Input
            </Button>
            <Button onClick={copyToClipboard} variant='outline'>
              Copy Input
            </Button>
          </>
        )}

        {/* Output Transcript Controls */}
        <Button
          onClick={testOutputTranscript}
          variant='secondary'
          disabled={!isConnected}
        >
          Test Output
        </Button>
        {outputText && (
          <Button onClick={clearOutputTranscript} variant='outline'>
            Clear Output
          </Button>
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
        {isRecording && (
          <>
            <div className='h-2 w-2 rounded-full bg-red-500 animate-pulse ml-4' />
            <span className='text-red-600'>Recording</span>
          </>
        )}
      </div>

      {/* Input Transcription Display */}
      <Card className='min-h-[200px] p-4'>
        <div className='space-y-2'>
          <h3 className='text-lg font-semibold mb-4'>
            Speech Input (Microphone)
          </h3>

          {transcript ? (
            <div className='space-y-2'>
              {/* Final transcripts */}
              {finalTranscripts.map((finalText, index) => (
                <p key={index} className='text-foreground'>
                  {finalText}
                </p>
              ))}

              {/* Current interim result */}
              {currentInterim && (
                <p className='text-muted-foreground italic'>{currentInterim}</p>
              )}
            </div>
          ) : (
            <p className='text-muted-foreground text-center py-8'>
              {isConnected
                ? "Click 'Start Recording' to begin transcription..."
                : "Connecting to transcription server..."}
            </p>
          )}
        </div>
      </Card>

      {/* Output Transcription Display */}
      <Card className='min-h-[150px] p-4 bg-blue-50 border-blue-200'>
        <div className='space-y-2'>
          <h3 className='text-lg font-semibold mb-4 text-blue-800'>
            Text Output (Being Spoken/Displayed)
          </h3>

          {outputText ? (
            <div className='space-y-2'>
              <p className='text-blue-900 bg-white p-3 rounded border'>
                {outputText}
              </p>
            </div>
          ) : (
            <p className='text-blue-600 text-center py-8'>
              Click 'Test Output' to send example output transcript...
            </p>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className='p-4'>
        <h4 className='font-medium mb-2'>Instructions:</h4>
        <ul className='text-sm text-muted-foreground space-y-1'>
          <li>
            • <strong>Microphone Input:</strong> Click "Start Recording" to
            transcribe speech from your microphone
          </li>
          <li>
            • Speak clearly - gray text shows interim results, black text shows
            final results
          </li>
          <li>
            • <strong>Test Output:</strong> Click "Test Output" to simulate text
            being spoken/displayed to users
          </li>
          <li>
            • This captures what you are saying INTO the system (input
            transcription)
          </li>
          <li>
            • For system audio output, use the "System Audio Output
            Transcription" section below
          </li>
          <li>
            • Both input and output transcripts are stored separately in the
            database
          </li>
        </ul>
      </Card>
    </div>
  );
}
