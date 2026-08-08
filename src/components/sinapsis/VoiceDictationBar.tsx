"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Reconocimiento de voz real del navegador (Web Speech API) — no hay
// simulación de audio ni animación de "escuchando" sin que de verdad haya
// un SpeechRecognition activo. Todavía NO interpreta el texto para
// actualizar datos: eso requiere un dominio de IA propio, fuera de esta
// entrega. Aquí solo transcribe y hace viajar el pulso visual mientras
// hay reconocimiento en curso.

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceDictationBarProps {
  /** Se dispara cuando termina el dictado y hubo texto — arranca el pulso
   *  bar → núcleo → tarjeta. */
  onDictationComplete?: (transcript: string) => void;
}

export function VoiceDictationBar({ onDictationComplete }: VoiceDictationBarProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      transcriptRef.current = text.trim();
      setTranscript(transcriptRef.current);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (transcriptRef.current) onDictationComplete?.(transcriptRef.current);
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
    transcriptRef.current = "";
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const phase = supported === false ? "NO DISPONIBLE" : listening ? "ESCUCHANDO" : "LISTO";

  return (
    <div className="relative z-10 px-10 pb-7 pt-1">
      <div
        className="mx-auto flex max-w-[640px] items-center gap-4 rounded-2xl border border-[#3FE9B4]/20 bg-[#08100e]/92 px-[22px] py-[15px]"
        style={{ boxShadow: "0 30px 70px -28px rgba(0,0,0,1), 0 0 40px rgba(63,233,180,.08)" }}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={supported === false}
          title={supported === false ? "Tu navegador no soporta dictado por voz" : listening ? "Detener" : "Dictar"}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
            supported === false
              ? "cursor-not-allowed bg-white/5 text-white/25"
              : listening
                ? "bg-[#0B2A21] text-[#3FE9B4]"
                : "sinapsis-mic-idle bg-[#0B2A21] text-[#3FE9B4]",
          )}
          style={
            supported !== false && listening
              ? { boxShadow: "0 0 0 5px rgba(63,233,180,.14),0 0 28px rgba(63,233,180,.45)" }
              : undefined
          }
        >
          {supported === false ? <MicOff className="size-[15px]" strokeWidth={1.7} /> : <Mic className="size-[15px]" strokeWidth={1.7} />}
        </button>

        <p className="flex min-w-0 flex-1 items-center truncate text-[14px] italic text-white/85" style={{ fontFamily: "var(--sn-serif)" }}>
          <span className="truncate">
            {supported === false
              ? "Dictado por voz no disponible en este navegador."
              : listening
                ? transcript || "Escuchando…"
                : "Dicta una nota o instrucción."}
          </span>
          {listening && (
            <span className="sinapsis-caret ml-0.5 inline-block h-[14px] w-[1.5px] shrink-0 bg-[#3FE9B4]" aria-hidden />
          )}
        </p>

        {supported !== false && (
          <span className="flex shrink-0 items-end gap-[3px]" aria-hidden>
            <span className="sinapsis-wave-bar" style={{ animationDelay: "0s" }} />
            <span className="sinapsis-wave-bar" style={{ animationDelay: "0.25s" }} />
            <span className="sinapsis-wave-bar" style={{ animationDelay: "0.5s" }} />
          </span>
        )}

        <span
          className="shrink-0 text-[9px] tracking-[0.22em] transition-colors"
          style={{ fontFamily: "var(--sn-mono)", color: listening ? "#3FE9B4" : "rgba(234,242,237,.4)" }}
        >
          {phase}
        </span>
      </div>
    </div>
  );
}
