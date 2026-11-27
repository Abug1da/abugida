import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24">
      <p className="font-ethiopic text-5xl">ሀ ለ ሐ መ ሠ</p>
      <h1 className="text-4xl font-semibold tracking-tight">Learn to read and speak Amharic, free.</h1>
      <p className="text-lg text-muted-foreground">
        Abugida teaches the fidel, everyday conversation and numbers, one short lesson at a time.
      </p>
      <div>
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Start learning
        </Link>
      </div>
    </main>
  );
}
