"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerResult, QuestionView } from "@/lib/fidel/view";

export type QuizStart = {
  question: QuestionView;
  remaining: number;
  graded?: boolean;
  answer: (optionIndex: number) => Promise<AnswerResult>;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "asking"; run: QuizStart; question: QuestionView; remaining: number; picked?: number; result?: AnswerResult; busy?: boolean }
  | { kind: "done"; score: number; passed: boolean; graded: boolean; nextLessonId: string | null };

export type QuizDone = { passed: boolean; nextLessonId: string | null };

/** Shared by Practice (answers checked in the browser) and the Test (answers checked by the server). */
export function Quiz(props: {
  start: () => Promise<QuizStart>;
  intro?: ReactNode;
  extra?: (done: QuizDone) => ReactNode;
  finishedLabel: string;
  onRestart: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  // Set synchronously on the first click, before React re-renders, so a double click can't send
  // two answers for one question. Cleared when moving to the next question.
  const answering = useRef(false);
  // Start exactly once per mount: for the Test, starting creates a server session, so a parent
  // re-render must never start another. (Restart remounts the quiz with a new key.)
  const start = useRef(props.start);

  useEffect(() => {
    let live = true;
    start.current()
      .then((run) => live && setState({ kind: "asking", run, question: run.question, remaining: run.remaining }))
      .catch((e: Error) => live && setState({ kind: "error", message: e.message }));
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === "loading") return <p className="text-muted-foreground">Loading…</p>;
  if (state.kind === "error")
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive">
          {state.message}
        </p>
        <Button variant="outline" onClick={props.onRestart}>
          Try again
        </Button>
      </div>
    );
  if (state.kind === "done")
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-2xl font-semibold">{Math.round(state.score * 100)}% on the first try</p>
        {state.graded && (
          <p className="text-muted-foreground">
            {state.passed
              ? `Passed.${state.nextLessonId ? " The next lesson is unlocked." : ""}`
              : "Not quite 70% yet. Practice a little and try again."}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={props.onRestart}>{props.finishedLabel}</Button>
          {props.extra?.({ passed: state.passed, nextLessonId: state.nextLessonId })}
        </div>
      </div>
    );

  const s = state;
  const choose = async (i: number) => {
    if (answering.current || s.result) return;
    answering.current = true;
    setState({ ...s, picked: i, busy: true });
    try {
      const result = await s.run.answer(i);
      setState({ ...s, picked: i, result, busy: false });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };
  const advance = () => {
    const r = s.result!;
    answering.current = false;
    if (r.done) setState({ kind: "done", ...r.done, graded: !!s.run.graded });
    else if (r.next) setState({ kind: "asking", run: s.run, question: r.next.question, remaining: r.next.remaining });
  };

  return (
    <div className="flex max-w-reading flex-col gap-5">
      {props.intro}
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">{s.question.instruction}</p>
        <span className="text-sm text-muted-foreground">{s.remaining} left</span>
      </div>
      <p lang={s.question.promptIsFidel ? "am" : undefined} className={cn("text-center", s.question.promptIsFidel ? "font-fidel text-7xl" : "text-4xl font-semibold")}>
        {s.question.prompt}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {s.question.options.map((label, i) => {
          const isRight = s.result && i === s.result.correctIndex;
          const isWrongPick = s.result && i === s.picked && !s.result.correct;
          return (
            <Button
              key={i}
              variant="outline"
              disabled={!!s.busy || !!s.result}
              onClick={() => choose(i)}
              lang={s.question.optionsAreFidel ? "am" : undefined}
              className={cn(
                "h-16 text-2xl",
                s.question.optionsAreFidel && "font-ethiopic text-3xl",
                isRight && "border-primary bg-primary/10",
                isWrongPick && "border-destructive bg-destructive/10",
              )}
            >
              {label}
            </Button>
          );
        })}
      </div>
      <div className="flex min-h-9 items-center justify-between gap-4" aria-live="polite">
        {s.result && (
          <>
            <span className={s.result.correct ? "text-primary" : "text-destructive"}>{s.result.correct ? "Correct" : "Not quite."}</span>
            <Button onClick={advance}>{s.result.done ? "See result" : "Next"}</Button>
          </>
        )}
      </div>
    </div>
  );
}
