import { useEffect, useRef, useState } from "react";
import { Button } from "../shared/components/ui/button";
import { Play, Pause, Repeat, RotateCcw, Gauge } from "lucide-react";

interface Props {
  src: string;
  title?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, title }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.loop = loop;
  }, [loop]);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  }

  function restart() {
    const a = ref.current;
    if (!a) return;
    a.currentTime = 0;
    a.play();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
  }

  return (
    <div className="rounded-xl border bg-card p-4 mt-3 space-y-3">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setT((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={restart}
          aria-label="Restart"
          title="Эхнээс эхлүүлэх"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={loop ? "default" : "outline"}
          onClick={() => setLoop((v) => !v)}
          aria-label="Loop"
          title="Давтах"
        >
          <Repeat className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground tabular-nums min-w-[80px]">
          {fmt(t)} / {fmt(dur)}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
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
      <input
        type="range"
        min={0}
        max={dur || 0}
        step={0.1}
        value={t}
        onChange={seek}
        className="w-full accent-primary"
        aria-label="Seek"
      />
      {title && <p className="text-xs text-muted-foreground">{title}</p>}
    </div>
  );
}
