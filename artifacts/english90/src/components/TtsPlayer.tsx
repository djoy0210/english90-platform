import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Repeat, RotateCcw, Gauge, Square } from "lucide-react";

interface Props {
  text: string;
  title?: string;
  lang?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

export function TtsPlayer({ text, title, lang = "en-US" }: Props) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(0.9);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stoppedRef = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopRef = useRef(loop);
  const speedRef = useRef(speed);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function speak() {
    if (!supported) return;
    if (!text || !text.trim()) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stoppedRef.current = false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = speedRef.current;
    u.pitch = 1;
    u.onend = () => {
      if (!mountedRef.current) return;
      setPlaying(false);
      setPaused(false);
      if (loopRef.current && !stoppedRef.current) {
        timerRef.current = setTimeout(() => {
          if (mountedRef.current && !stoppedRef.current) speak();
        }, 300);
      }
    };
    u.onerror = () => {
      if (!mountedRef.current) return;
      setPlaying(false);
      setPaused(false);
    };
    u.onpause = () => mountedRef.current && setPaused(true);
    u.onresume = () => mountedRef.current && setPaused(false);
    utterRef.current = u;
    setPlaying(true);
    setPaused(false);
    window.speechSynthesis.speak(u);
  }

  function toggle() {
    if (!supported) return;
    const ss = window.speechSynthesis;
    if (!playing) {
      speak();
    } else if (ss.speaking && !ss.paused) {
      ss.pause();
      setPaused(true);
    } else if (ss.paused) {
      ss.resume();
      setPaused(false);
    }
  }

  function stop() {
    if (!supported) return;
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  }

  function restart() {
    if (timerRef.current) clearTimeout(timerRef.current);
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) speak();
    }, 100);
  }

  if (!supported) {
    return (
      <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-3 mt-3 text-xs text-amber-800 dark:text-amber-200">
        Browser-ийн дуу унших боломжгүй. Audio дэмжих өөр browser ашиглана уу.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 mt-3 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={toggle}
          aria-label={playing && !paused ? "Pause" : "Play"}
          title={playing && !paused ? "Зогсоох" : "Тоглуулах"}
        >
          {playing && !paused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={restart}
          aria-label="Restart"
          title="Эхнээс эхлүүлэх"
          disabled={!playing}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={stop}
          aria-label="Stop"
          title="Зогсоох"
          disabled={!playing}
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={loop ? "default" : "outline"}
          onClick={() => setLoop((v) => !v)}
          aria-label="Repeat"
          title={loop ? "Давтаж байна" : "Давтах"}
        >
          <Repeat className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          {playing ? (paused ? "⏸ Зогссон" : "🔊 Тоглож байна") : "⏹ Бэлэн"}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSpeed(s);
                if (playing) {
                  // restart with new speed
                  setTimeout(() => restart(), 50);
                }
              }}
              className={`text-xs px-2 py-1 rounded-md border transition ${
                speed === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      {title && <p className="text-xs text-muted-foreground">{title}</p>}
    </div>
  );
}
