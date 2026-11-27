"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AnswerResult, QuestionView } from "@/lib/fidel/view";
import { answerTest, startTest } from "./actions";
import { LearnCards, type Card } from "./learn-cards";
import { Quiz, type QuizStart } from "./quiz";

export type PracticeQuestion = { view: QuestionView; answerIndex: number };
type Step = "learn" | "practice" | "test";
const STEPS: { id: Step; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practice" },
  { id: "test", label: "Test" },
];

// Intro (video and transcript) arrives with the admin; until then lessons start at Learn.
export function LessonPlayer(props: {
  lessonId: string;
  cards: Card[];
  practice: PracticeQuestion[];
  preview: boolean;
  alreadyComplete: boolean;
  nextLessonId: string | null;
}) {
  const [step, setStep] = useState<Step>("learn");
  const [run, setRun] = useState(0); // remounts a quiz to start it again

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-2" aria-label="Lesson steps">
        {STEPS.map((s) => (
          <Button key={s.id} variant={step === s.id ? "default" : "outline"} onClick={() => setStep(s.id)} aria-current={step === s.id ? "step" : undefined}>
            {s.label}
          </Button>
        ))}
      </nav>

      {step === "learn" && (
        <div className="flex flex-col gap-4">
          <LearnCards cards={props.cards} />
          <div>
            <Button onClick={() => setStep("practice")}>Practice these</Button>
          </div>
        </div>
      )}

      {step === "practice" && (
        <Quiz
          key={`practice-${run}`}
          start={() => Promise.resolve(practiceRun(props.practice))}
          finishedLabel="Practice again"
          onRestart={() => setRun((r) => r + 1)}
          extra={<Button variant="outline" onClick={() => setStep("test")}>Take the test</Button>}
        />
      )}

      {step === "test" &&
        (props.preview ? (
          <p className="text-muted-foreground">Tests aren&apos;t available in preview, since they record a score. Use Practice to try the questions.</p>
        ) : (
          <Quiz
            key={`test-${run}`}
            start={() => testRun(props.lessonId)}
            intro={
              <p className="max-w-reading text-muted-foreground">
                {props.alreadyComplete ? "You've passed this lesson. Take the test again any time." : "Score 70% or more to unlock the next lesson."}{" "}
                Only your first answer to each question counts.
              </p>
            }
            finishedLabel="Take the test again"
            onRestart={() => setRun((r) => r + 1)}
            extra={
              props.nextLessonId ? (
                <Link href={`/lessons/${props.nextLessonId}`} className={buttonVariants({ variant: "outline" })}>
                  Next lesson
                </Link>
              ) : (
                <Link href="/lessons" className={buttonVariants({ variant: "outline" })}>
                  All lessons
                </Link>
              )
            }
          />
        ))}
    </div>
  );
}

/** Practice mirrors the engine's rule in the browser: a missed question comes back once at the end. */
function practiceRun(questions: PracticeQuestion[]): QuizStart {
  const queue = questions.map((q) => ({ ...q, retry: false }));
  let right = 0;
  let firstTries = 0;
  return {
    question: queue[0].view,
    remaining: queue.length,
    answer: async (optionIndex): Promise<AnswerResult> => {
      const q = queue.shift()!;
      const correct = optionIndex === q.answerIndex;
      if (!q.retry) {
        firstTries++;
        if (correct) right++;
      }
      if (!correct && !q.retry) queue.push({ ...q, retry: true });
      const base = { correct, correctIndex: q.answerIndex };
      if (queue.length) return { ...base, next: { question: queue[0].view, remaining: queue.length } };
      return { ...base, done: { score: right / firstTries, passed: true, nextLessonId: null } };
    },
  };
}

async function testRun(lessonId: string): Promise<QuizStart> {
  const started = await startTest(lessonId);
  if (!started.ok) throw new Error(started.error);
  let step = 0;
  return {
    question: started.question,
    remaining: started.remaining,
    graded: true,
    answer: async (optionIndex) => {
      const result = await answerTest(started.sessionId, step, optionIndex);
      if ("error" in result) throw new Error(result.error);
      step++;
      return result;
    },
  };
}
