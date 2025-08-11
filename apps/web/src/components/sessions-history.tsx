"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Trash2,
  Play,
  Download,
  Calendar,
  Clock,
  Mic,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";

interface TranscriptSession {
  id: string;
  socketId: string;
  languageCode: string;
  transcriptInput: string | null;
  transcriptOutput: string | null;
  audioInputUrl: string | null;
  audioOutputUrl: string | null;
  status: "ACTIVE" | "ENDED" | "ERROR";
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
}

interface SessionsResponse {
  sessions: TranscriptSession[];
  total: number;
  limit: number;
  offset: number;
}

export function SessionsHistory() {
  const [sessions, setSessions] = useState<TranscriptSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
        }/api/sessions`
      );

      if (response.ok) {
        const data: SessionsResponse = await response.json();
        setSessions(data.sessions);
      } else {
        throw new Error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions history");
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setDeleting(sessionId);
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
        }/api/sessions/${sessionId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSessions((prev) =>
          prev.filter((session) => session.id !== sessionId)
        );
        toast.success("Session deleted successfully");
      } else {
        throw new Error("Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) return "In progress";

    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const duration = end.getTime() - start.getTime();

    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "ENDED":
        return "bg-blue-100 text-blue-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const downloadAudio = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <Card className='p-6'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
          <p className='mt-2 text-gray-600'>Loading sessions...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Sessions History</h2>
        <Button onClick={fetchSessions} variant='outline'>
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className='p-6'>
          <div className='text-center text-gray-500'>
            <Calendar className='h-12 w-12 mx-auto mb-4' />
            <p>No recording sessions found</p>
            <p className='text-sm'>
              Start a new recording to see sessions here
            </p>
          </div>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {sessions.map((session) => (
            <Card key={session.id} className='p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1 space-y-2'>
                  {/* Session header */}
                  <div className='flex items-center gap-2'>
                    <h3 className='font-semibold text-lg'>
                      Session {session.id.slice(-8)}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  {/* Session details */}
                  <div className='flex items-center gap-4 text-sm text-gray-600'>
                    <div className='flex items-center gap-1'>
                      <Calendar className='h-4 w-4' />
                      {formatDate(session.startedAt)}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Clock className='h-4 w-4' />
                      {formatDuration(session.startedAt, session.endedAt)}
                    </div>
                  </div>

                  {/* Audio recordings section */}
                  <div className='grid md:grid-cols-2 gap-4 mt-4'>
                    {/* Sales recording */}
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Mic className='h-4 w-4 text-blue-500' />
                        <span className='font-medium text-sm'>
                          Sales Recording
                        </span>
                      </div>
                      {session.audioInputUrl ? (
                        <div className='space-y-2'>
                          <audio controls className='w-full h-8' preload='none'>
                            <source
                              src={session.audioInputUrl}
                              type='audio/webm'
                            />
                            <source
                              src={session.audioInputUrl}
                              type='audio/wav'
                            />
                            Your browser does not support audio playback.
                          </audio>
                          <Button
                            onClick={() =>
                              downloadAudio(
                                session.audioInputUrl!,
                                `sales-${session.id.slice(-8)}.webm`
                              )
                            }
                            variant='outline'
                            size='sm'
                            className='w-full'
                          >
                            <Download className='h-3 w-3 mr-1' />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <p className='text-xs text-gray-500'>
                          No sales recording available
                        </p>
                      )}
                    </div>

                    {/* Client recording */}
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Monitor className='h-4 w-4 text-orange-500' />
                        <span className='font-medium text-sm'>
                          Client Recording
                        </span>
                      </div>
                      {session.audioOutputUrl ? (
                        <div className='space-y-2'>
                          <audio controls className='w-full h-8' preload='none'>
                            <source
                              src={session.audioOutputUrl}
                              type='audio/webm'
                            />
                            <source
                              src={session.audioOutputUrl}
                              type='audio/wav'
                            />
                            Your browser does not support audio playback.
                          </audio>
                          <Button
                            onClick={() =>
                              downloadAudio(
                                session.audioOutputUrl!,
                                `client-${session.id.slice(-8)}.webm`
                              )
                            }
                            variant='outline'
                            size='sm'
                            className='w-full'
                          >
                            <Download className='h-3 w-3 mr-1' />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <p className='text-xs text-gray-500'>
                          No client recording available
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transcripts preview */}
                  {(session.transcriptInput || session.transcriptOutput) && (
                    <div className='mt-4 pt-4 border-t'>
                      <h4 className='font-medium text-sm mb-2'>Transcripts</h4>
                      <div className='grid md:grid-cols-2 gap-4'>
                        {session.transcriptInput && (
                          <div>
                            <p className='text-xs text-blue-600 font-medium mb-1'>
                              Sales:
                            </p>
                            <p className='text-xs text-gray-700 bg-blue-50 p-2 rounded max-h-20 overflow-y-auto'>
                              {session.transcriptInput.slice(0, 200)}
                              {session.transcriptInput.length > 200 && "..."}
                            </p>
                          </div>
                        )}
                        {session.transcriptOutput && (
                          <div>
                            <p className='text-xs text-orange-600 font-medium mb-1'>
                              Client:
                            </p>
                            <p className='text-xs text-gray-700 bg-orange-50 p-2 rounded max-h-20 overflow-y-auto'>
                              {session.transcriptOutput.slice(0, 200)}
                              {session.transcriptOutput.length > 200 && "..."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='ml-4'>
                  <Button
                    onClick={() => deleteSession(session.id)}
                    variant='destructive'
                    size='sm'
                    disabled={deleting === session.id}
                  >
                    {deleting === session.id ? (
                      <div className='animate-spin rounded-full h-3 w-3 border-b-2 border-white' />
                    ) : (
                      <Trash2 className='h-3 w-3' />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
