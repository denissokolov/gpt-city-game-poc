import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

const STATUS_MESSAGES = [
  "Tuning into the city frequency…",
  "Checking who stepped out for coffee…",
  "Asking the locals where everyone is…",
  "Lining up the NPCs by time of day…",
  "Polishing the scene for your arrival…",
];

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/5",
        className,
      )}
    >
      <motion.div
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["0%", "400%"] }}
        transition={{
          duration: 1.8,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
}

export function LocationLoading({
  // Long enough to match a slow server response; the bar decelerates so a
  // fast response still feels snappy.
  estimatedMs = 15_000,
}: {
  estimatedMs?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = requestAnimationFrame(function tick(now) {
      const elapsed = now - started;
      // Ease-out: 1 - (1 - t)^2, capped at 95% so the bar never claims done
      // before the query actually resolves.
      const t = Math.min(elapsed / estimatedMs, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setProgress(Math.min(eased * 0.95, 0.95));
      if (t < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [estimatedMs]);

  useEffect(() => {
    const interval = Math.max(1800, estimatedMs / STATUS_MESSAGES.length);
    const id = setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length),
      interval,
    );
    return () => clearInterval(id);
  }, [estimatedMs]);

  return (
    <div className="space-y-5">
      <div className="card relative overflow-hidden p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-city-accent/60 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
            />
            <motion.span
              className="absolute inset-1 rounded-full border border-city-accent/30 border-b-transparent"
              animate={{ rotate: -360 }}
              transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
            />
            <div className="absolute inset-0 grid place-items-center text-base">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                aria-hidden
              >
                🏙️
              </motion.span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
              Loading the scene
            </p>
            <div className="relative mt-1 h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={statusIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="font-display text-base sm:text-lg font-semibold truncate"
                >
                  {STATUS_MESSAGES[statusIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <p className="shrink-0 font-display text-lg font-semibold tabular-nums text-city-muted">
            {Math.round(progress * 100)}%
          </p>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-city-accent via-amber-300 to-city-accent bg-[length:200%_100%]"
            style={{ width: `${progress * 100}%` }}
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{
              duration: 2.4,
              ease: "linear",
              repeat: Infinity,
            }}
          />
        </div>
      </div>

      <div className="card p-5 sm:p-6 space-y-3">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-7 w-2/3" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
      </div>

      {[0, 1].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
          className="card p-5 sm:p-6 space-y-4"
        >
          <Shimmer className="h-5 w-40" />
          <Shimmer className="h-3 w-3/4" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
              >
                <Shimmer className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-3 w-24" />
                  <Shimmer className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
