"use client";

import { Basket, CaretDown, Check, CookingPot, Timer, Users } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { Recipe } from "@/lib/options";

const WAIT_LINES = ["Checking the fridge", "Sniffing the herbs", "Weighing the pasta", "Plating three ideas"];
const EASE = [0.23, 1, 0.32, 1] as const;

export default function Recipes(props: { recipes: Recipe[] | null; loading: boolean; hasItems: boolean }) {
  return (
    <div className="mt-8" aria-live="polite" aria-busy={props.loading}>
      {props.loading ? (
        <Waiting />
      ) : props.recipes ? (
        <ul className="space-y-4">
          {props.recipes.map((r, i) => (
            <RecipeCard key={`${r.title}-${i}`} recipe={r} index={i} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-lime text-lime-ink">
            <CookingPot size={34} weight="fill" aria-hidden />
          </span>
          <h3 className="mt-4 text-xl font-bold">Your recipes land here</h3>
          <p className="mt-1 max-w-xs text-muted">
            {props.hasItems
              ? "Pick a diet and a type of dish, then tap Find recipes."
              : "Put a few things on your shelves first, then tap Find recipes."}
          </p>
        </div>
      )}
    </div>
  );
}

function Waiting() {
  const reduce = useReducedMotion();
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % WAIT_LINES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div className="h-7 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: EASE }}
            className="text-lg font-semibold text-tomato-ink"
          >
            {WAIT_LINES[line]}…
          </motion.p>
        </AnimatePresence>
      </div>
      <ul className="mt-4 space-y-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-2xl bg-surface p-5 sm:p-6">
            <div className="shimmer h-7 w-3/5 rounded-lg" />
            <div className="mt-3 flex gap-2">
              <div className="shimmer h-8 w-20 rounded-full" />
              <div className="shimmer h-8 w-24 rounded-full" />
            </div>
            <div className="shimmer mt-4 h-4 w-full rounded" />
            <div className="shimmer mt-2 h-4 w-4/5 rounded" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeCard({ recipe: r, index }: { recipe: Recipe; index: number }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(index === 0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const toBuy = r.ingredients.filter((i) => !i.have);
  const have = r.ingredients.filter((i) => i.have);
  const panelId = `recipe-${index}`;

  function toggleStep(k: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: index * 0.07 }}
      className="overflow-hidden rounded-2xl bg-surface"
    >
      <h3>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 p-5 text-left sm:p-6"
        >
          <span className="flex-1">
            <span className="block text-2xl font-bold leading-tight tracking-[-0.02em]">{r.title}</span>
            <span className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
              <Pill className="bg-bg text-ink">
                <Timer size={16} weight="bold" aria-hidden /> {r.time_minutes} min
              </Pill>
              <Pill className="bg-bg text-ink">
                <Users size={16} weight="bold" aria-hidden /> {r.servings} {r.servings === 1 ? "serving" : "servings"}
              </Pill>
              {toBuy.length ? (
                <Pill className="bg-tomato-soft text-tomato-ink">
                  <Basket size={16} weight="bold" aria-hidden /> {toBuy.length} to buy
                </Pill>
              ) : (
                <Pill className="bg-lime text-lime-ink">
                  <Check size={16} weight="bold" aria-hidden /> All in your kitchen
                </Pill>
              )}
            </span>
            {r.description && <span className="mt-3 block text-muted">{r.description}</span>}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
            className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-bg text-ink"
          >
            <CaretDown size={20} weight="bold" aria-hidden />
            <span className="sr-only">{open ? "Hide recipe" : "Show recipe"}</span>
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: EASE } }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
          >
            <div className="grid gap-6 border-t-2 border-bg px-5 pb-6 pt-5 sm:px-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {have.length > 0 && (
                  <IngredientList title="From your kitchen" items={have} icon={<Check size={14} weight="bold" aria-hidden />} tone="bg-lime text-lime-ink" />
                )}
                {toBuy.length > 0 && (
                  <IngredientList title="To buy" items={toBuy} icon={<Basket size={14} weight="bold" aria-hidden />} tone="bg-tomato-soft text-tomato-ink" />
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-sm font-bold">Steps</h4>
                  <span className="text-sm font-semibold tabular-nums text-muted">
                    {done.size} of {r.steps.length} done
                  </span>
                </div>
                <ol className="mt-2 space-y-1.5">
                  {r.steps.map((s, k) => {
                    const isDone = done.has(k);
                    return (
                      <li key={k}>
                        <button
                          onClick={() => toggleStep(k)}
                          aria-pressed={isDone}
                          className="press flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-bg"
                        >
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors duration-200 ${
                              isDone ? "bg-lime text-lime-ink" : "bg-bg text-ink"
                            }`}
                          >
                            {isDone ? <Check size={16} weight="bold" aria-hidden /> : k + 1}
                          </span>
                          <span className={`pt-1 leading-relaxed transition-colors duration-200 ${isDone ? "text-muted line-through" : ""}`}>
                            {s}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 ${className}`}>{children}</span>;
}

function IngredientList(props: { title: string; items: Recipe["ingredients"]; icon: React.ReactNode; tone: string }) {
  return (
    <div>
      <h4 className="text-sm font-bold">{props.title}</h4>
      <ul className="mt-2 space-y-2">
        {props.items.map((i, k) => (
          <li key={k} className="flex items-start gap-2.5">
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${props.tone}`}>{props.icon}</span>
            <span>
              {i.item}
              {i.amount && <span className="text-muted"> · {i.amount}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
