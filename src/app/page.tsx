import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Placeholder copy and content. The seven forms of ለ show how the script works: one consonant,
// seven vowel sounds.
const orders = [
  { fidel: "ለ", sound: "lä" },
  { fidel: "ሉ", sound: "lu" },
  { fidel: "ሊ", sound: "li" },
  { fidel: "ላ", sound: "la" },
  { fidel: "ሌ", sound: "le" },
  { fidel: "ል", sound: "lə" },
  { fidel: "ሎ", sound: "lo" },
];

const steps = [
  {
    title: "Learn the fidel",
    body: "Start with the script. Short lessons introduce a few letters at a time, grouped by sound.",
  },
  {
    title: "Practice",
    body: "Read, listen and answer quick questions until each letter is familiar.",
  },
  {
    title: "Track your progress",
    body: "Your account remembers what you have finished, so you can pick up where you left off.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-section px-gutter py-section">
      <section className="flex flex-col gap-6">
        <p lang="am" className="font-fidel text-6xl leading-tight text-primary sm:text-7xl">
          ሀ ለ ሐ መ
        </p>
        <h1 className="max-w-reading text-4xl font-semibold tracking-tight sm:text-5xl">
          Learn to read and speak Amharic.
        </h1>
        <p className="max-w-reading text-lg leading-relaxed text-muted-foreground">
          Abugida is a free website for learning Amharic, made for people growing up away from Ethiopia. It starts
          with the fidel, the script Amharic is written in.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
            Start learning
          </Link>
          <span className="text-sm text-muted-foreground">Free, with no ads.</span>
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="sr-only">
          How it works
        </h2>
        <ul className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title} className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fidel-sample" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="fidel-sample" className="text-2xl font-semibold tracking-tight">
            One letter, seven sounds
          </h2>
          <p className="max-w-reading leading-relaxed text-muted-foreground">
            Each fidel letter is a consonant and a vowel together. Change the shape a little and the vowel changes.
          </p>
        </div>
        <ul className="grid grid-cols-7 border-y py-6 text-center">
          {orders.map((order) => (
            <li key={order.fidel} className="flex flex-col items-center gap-2">
              <span lang="am" className="font-fidel text-3xl sm:text-5xl md:text-6xl">
                {order.fidel}
              </span>
              <span className="text-sm text-muted-foreground">{order.sound}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
