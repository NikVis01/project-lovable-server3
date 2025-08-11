"use client";

import { SpeechTranscription } from "@/components/speech-transcription";
import { SystemAudioRecorder } from "@/components/system-audio-recorder";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  return (
    <div className='container mx-auto max-w-4xl px-4 py-2'>
      <pre className='overflow-x-auto font-mono text-sm mb-8'>{TITLE_TEXT}</pre>
      <div className='grid gap-6'>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-4 font-medium'>Microphone Input Transcription</h2>
          <SpeechTranscription />
        </section>

        <section className='rounded-lg border p-4 border-orange-200 bg-orange-50'>
          <h2 className='mb-4 font-medium text-orange-800'>
            System Audio Output Transcription
          </h2>
          <SystemAudioRecorder />
        </section>
      </div>
    </div>
  );
}
