"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Card = { fidel: string; romanization: string; audioUrl: string | null };

export function LearnCards({ cards }: { cards: Card[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {cards.map((c) => (
        <li key={c.fidel} className="flex flex-col items-center gap-2 rounded-xl border p-4">
          <span lang="am" className="font-fidel text-5xl">
            {c.fidel}
          </span>
          <span className="text-muted-foreground">{c.romanization || "—"}</span>
          {c.audioUrl && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Play ${c.fidel}`}
              onClick={() => void new Audio(c.audioUrl!).play().catch(() => {})}
            >
              <Volume2 /> Listen
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
