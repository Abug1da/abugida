import type { Content } from "./content";
import type { Question } from "./engine";

/* What the browser sees of a question: display text only. Options are answered by index, so a
   Test never exposes which character ID is correct. Pure, shared by server and client code. */

export interface QuestionView {
  instruction: string;
  prompt: string;
  promptIsFidel: boolean;
  options: string[];
  optionsAreFidel: boolean;
}

/** Romanizations for every character a session's questions mention, so a Test keeps showing what
    it showed at the start even if someone edits a romanization mid-Test. */
export function romanizationsFor(questions: Question[], content: Content): Record<string, string> {
  const ids = new Set(questions.flatMap((q) => [q.subjectId, ...q.options]));
  return Object.fromEntries([...ids].map((id) => [id, content.characters[id].romanization]));
}

export function toView(q: Question, romanizations: Record<string, string>): QuestionView {
  const ch = (id: string) => ({ romanization: romanizations[id] });
  if (q.type === "recognize")
    return {
      instruction: "What sound does this make?",
      prompt: q.subjectId,
      promptIsFidel: true,
      options: q.options.map((id) => ch(id).romanization),
      optionsAreFidel: false,
    };
  if (q.type === "produce")
    return {
      instruction: "Which fidel makes this sound?",
      prompt: ch(q.subjectId).romanization,
      promptIsFidel: false,
      options: q.options,
      optionsAreFidel: true,
    };
  return {
    instruction: "Which row of the fidel is this from?",
    prompt: q.subjectId,
    promptIsFidel: true,
    options: q.options,
    optionsAreFidel: true,
  };
}

export type AnswerResult = {
  correct: boolean;
  correctIndex: number;
  next?: { question: QuestionView; remaining: number };
  done?: { score: number; passed: boolean; nextLessonId: string | null };
};
