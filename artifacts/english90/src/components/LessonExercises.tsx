import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Eye, EyeOff } from "lucide-react";

function norm(s: string) {
  return String(s ?? "").toLowerCase().replace(/[.,!?;:'"]/g, "").trim();
}

function parseAnswerKey(
  answerKey: string[] | undefined,
  count: number,
  preferLabel?: RegExp,
): string[] {
  if (!Array.isArray(answerKey)) return Array(count).fill("");
  const labeled: string[] = [];
  const unlabeled: string[] = [];
  for (const raw of answerKey) {
    const s = String(raw);
    const labelMatch = s.match(/^([^:]+):\s*(.*)$/);
    if (labelMatch) {
      if (preferLabel && preferLabel.test(labelMatch[1])) labeled.push(labelMatch[2]);
    } else {
      unlabeled.push(s);
    }
  }
  const sources = labeled.length > 0 ? labeled : unlabeled.length > 0 ? unlabeled : [];
  const map: Record<string, string> = {};
  for (const line of sources) {
    const parts = line.split(/[,;·•|\n]|\s+\/\s+/);
    for (const part of parts) {
      const m = part.trim().match(/^(\d+)\s*[-=:.)]\s*(.+)$/);
      if (m && map[m[1]] === undefined) map[m[1]] = m[2].trim();
    }
  }
  return Array.from({ length: count }, (_, i) => map[String(i + 1)] ?? "");
}

interface FillInProps {
  items: string[];
  answerKey?: string[];
  title: string;
  labelMatch?: RegExp;
}

export function FillInBlanks({ items, answerKey, title, labelMatch }: FillInProps) {
  const answers = useMemo(
    () => parseAnswerKey(answerKey, items.length, labelMatch ?? /fill|blank|grammar|practice|дасгал|дүрэм/i),
    [answerKey, items.length, labelMatch],
  );
  const [values, setValues] = useState<string[]>(() => items.map(() => ""));
  const [checked, setChecked] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const correctCount = values.reduce(
    (n, v, i) => (answers[i] && norm(v) === norm(answers[i]) ? n + 1 : n),
    0,
  );
  const total = answers.filter(Boolean).length;

  function reset() {
    setValues(items.map(() => ""));
    setChecked(false);
    setShowAnswers(false);
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {checked && total > 0 && (
          <span className="text-sm font-medium">
            {correctCount}/{total}
          </span>
        )}
      </div>
      <ol className="space-y-2 list-decimal pl-5">
        {items.map((item, idx) => {
          const ans = answers[idx];
          const val = values[idx];
          const isCorrect = ans && norm(val) === norm(ans);
          const parts = item.split(/_{2,}/);
          return (
            <li key={idx} className="flex items-center flex-wrap gap-1">
              <span>{parts[0]}</span>
              <input
                type="text"
                value={val}
                onChange={(e) => {
                  const next = [...values];
                  next[idx] = e.target.value;
                  setValues(next);
                }}
                disabled={checked}
                className={`border rounded-md px-2 py-1 text-sm w-24 mx-1 focus:outline-none focus:ring-2 focus:ring-primary ${
                  checked
                    ? isCorrect
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-red-500 bg-red-50 text-red-800"
                    : "border-input"
                }`}
                placeholder="?"
              />
              <span>{parts[1] ?? ""}</span>
              {checked && ans && (
                <span className="ml-2 text-xs">
                  {isCorrect ? (
                    <CheckCircle2 className="inline w-4 h-4 text-green-600" />
                  ) : (
                    <span className="text-red-600 inline-flex items-center gap-1">
                      <XCircle className="inline w-4 h-4" /> {ans}
                    </span>
                  )}
                </span>
              )}
              {!checked && showAnswers && ans && (
                <span className="ml-2 text-xs text-muted-foreground italic">→ {ans}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2 mt-4">
        {!checked ? (
          <Button type="button" size="sm" onClick={() => setChecked(true)} disabled={total === 0}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Шалгах
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Дахин оролдох
          </Button>
        )}
        {!checked && total > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowAnswers((v) => !v)}
          >
            {showAnswers ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showAnswers ? "Хариулт нуух" : "Хариулт харах"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface MatchPair {
  left: string;
  right: string;
}

export function MatchingGame({ pairs, title }: { pairs: MatchPair[]; title: string }) {
  const [shuffledRight] = useState(() => {
    const a = pairs.map((p, i) => ({ right: p.right, original: i }));
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  });
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});

  function handleLeft(i: number) {
    if (matches[i] !== undefined) return;
    setSelectedLeft(i);
    if (selectedRight !== null) {
      setMatches({ ...matches, [i]: selectedRight });
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  }
  function handleRight(j: number) {
    if (Object.values(matches).includes(j)) return;
    setSelectedRight(j);
    if (selectedLeft !== null) {
      setMatches({ ...matches, [selectedLeft]: j });
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  }
  function reset() {
    setMatches({});
    setSelectedLeft(null);
    setSelectedRight(null);
  }

  const allDone = Object.keys(matches).length === pairs.length;
  const correctCount = Object.entries(matches).reduce(
    (n, [l, r]) => (shuffledRight[r as number].original === Number(l) ? n + 1 : n),
    0,
  );

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {allDone && (
          <span className="text-sm font-medium">
            {correctCount}/{pairs.length}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Зүүн талын үг → Баруун талын утгыг сонгож тохируулна
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p, i) => {
            const matched = matches[i] !== undefined;
            const correct = matched && shuffledRight[matches[i]].original === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleLeft(i)}
                className={`w-full text-left text-sm rounded-md border px-3 py-2 transition ${
                  matched
                    ? correct
                      ? "bg-green-50 border-green-500 text-green-800"
                      : "bg-red-50 border-red-500 text-red-800"
                    : selectedLeft === i
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                }`}
              >
                {p.left}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((r, j) => {
            const usedBy = Object.entries(matches).find(([, v]) => v === j);
            const used = !!usedBy;
            const correct = used && shuffledRight[j].original === Number(usedBy![0]);
            return (
              <button
                key={j}
                type="button"
                onClick={() => handleRight(j)}
                className={`w-full text-left text-sm rounded-md border px-3 py-2 transition ${
                  used
                    ? correct
                      ? "bg-green-50 border-green-500 text-green-800"
                      : "bg-red-50 border-red-500 text-red-800"
                    : selectedRight === j
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                }`}
              >
                {r.right}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Дахин эхлэх
        </Button>
      </div>
    </div>
  );
}

interface McqQ {
  question: string;
  options: string[];
  answer: string;
}

export function ListeningMcq({ questions, title }: { questions: McqQ[]; title: string }) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  function reset() {
    setPicks({});
    setChecked(false);
  }

  function answerIndex(ans: string): number {
    if (!ans) return -1;
    const a = String(ans).toLowerCase().trim();
    if (/^[a-d]$/.test(a)) return a.charCodeAt(0) - 97;
    const n = parseInt(a, 10);
    if (!isNaN(n)) return n - 1;
    return -1;
  }

  const correctCount = questions.reduce(
    (n, q, i) => (picks[i] === answerIndex(q.answer) ? n + 1 : n),
    0,
  );

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {checked && (
          <span className="text-sm font-medium">
            {correctCount}/{questions.length}
          </span>
        )}
      </div>
      <ol className="space-y-4 list-decimal pl-5">
        {questions.map((q, i) => {
          const correctIdx = answerIndex(q.answer);
          const myPick = picks[i];
          return (
            <li key={i} className="space-y-2">
              <p className="font-medium">{q.question}</p>
              <div className="space-y-1">
                {(q.options || []).map((opt, j) => {
                  const isCorrect = checked && j === correctIdx;
                  const isWrongPick = checked && myPick === j && j !== correctIdx;
                  return (
                    <label
                      key={j}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition ${
                        isCorrect
                          ? "border-green-500 bg-green-50"
                          : isWrongPick
                            ? "border-red-500 bg-red-50"
                            : myPick === j
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`mcq-${i}`}
                        checked={myPick === j}
                        onChange={() => !checked && setPicks({ ...picks, [i]: j })}
                        disabled={checked}
                      />
                      <span className="font-mono text-xs">{String.fromCharCode(97 + j)})</span>
                      <span>{opt}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                      {isWrongPick && <XCircle className="w-4 h-4 text-red-600 ml-auto" />}
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2 mt-4">
        {!checked ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setChecked(true)}
            disabled={Object.keys(picks).length === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Шалгах
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Дахин оролдох
          </Button>
        )}
      </div>
    </div>
  );
}
