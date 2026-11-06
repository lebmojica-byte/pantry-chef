"use client";

import {
  BookmarkSimple,
  ChefHat,
  CookingPot,
  Jar,
  Minus,
  Pepper,
  Plant,
  Plus,
  SignOut,
  Snowflake,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Recipe } from "@/lib/options";
import { COURSES, DIETS, LOCATIONS, type Location, type PantryItem, type Settings, type KeptRecipe } from "@/lib/options";
import { createClient } from "@/lib/supabase/client";
import Recipes, { type ListId, type Loading } from "./Recipes";

const supabase = createClient();

const SHELF: Record<Location, { Icon: Icon; soft: string; ink: string }> = {
  fridge: { Icon: Snowflake, soft: "bg-fridge-soft", ink: "text-fridge-ink" },
  pantry: { Icon: Jar, soft: "bg-pantry-soft", ink: "text-pantry-ink" },
  spice: { Icon: Pepper, soft: "bg-tomato-soft", ink: "text-tomato-ink" },
  herb: { Icon: Plant, soft: "bg-herb-soft", ink: "text-herb-ink" },
};

const SPRING = { type: "spring", bounce: 0.3, duration: 0.45 } as const;
const keyOf = (location: string, name: string) => `${location}:${name.trim().toLowerCase()}`;

export default function Kitchen(props: {
  email: string;
  initialItems: PantryItem[];
  initialSettings: Settings;
  initialTried: KeptRecipe[];
  initialSaved: KeptRecipe[];
}) {
  const [items, setItems] = useState(props.initialItems);
  const [settings, setSettings] = useState(props.initialSettings);
  const [shelf, setShelf] = useState<Location>("fridge");
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const [tried, setTried] = useState(props.initialTried);
  const [saved, setSaved] = useState(props.initialSaved);
  const [listOpen, setListOpen] = useState<Record<ListId, boolean>>({ saved: false, tried: false });
  const [instantOpen, setInstantOpen] = useState(false);
  // Every title shown this session, so "Find new" and "3 more" never repeat one.
  const [seen, setSeen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const signingOut = useRef(false);

  // The page keeps its data in memory, so without this an expired or revoked session would leave
  // the kitchen on screen while every save fails with "permission denied".
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !signingOut.current) router.replace("/login?expired=1");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function addItems(location: Location, text: string) {
    const have = new Set(items.map((i) => keyOf(i.location, i.name)));
    const names = [...new Set(text.split(",").map((s) => s.trim().slice(0, 60)).filter(Boolean))].filter(
      (n) => !have.has(keyOf(location, n)),
    );
    if (!names.length) return;
    // Optimistic: show the chips at once, swap in real ids when the insert returns.
    const temp = names.map((name) => ({ id: `tmp-${keyOf(location, name)}`, name, location }));
    setItems((prev) => [...prev, ...temp]);
    const { data, error } = await supabase
      .from("pantry_items")
      .insert(names.map((name) => ({ name, location })))
      .select("id, name, location");
    if (error) {
      setItems((prev) => prev.filter((i) => !i.id.startsWith("tmp-")));
      return setError(`Couldn't save that: ${error.message}`);
    }
    const saved = new Map((data as PantryItem[]).map((d) => [keyOf(d.location, d.name), d]));
    setItems((prev) => prev.map((i) => saved.get(keyOf(i.location, i.name)) ?? i));
  }

  async function removeItem(item: PantryItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (item.id.startsWith("tmp-")) return;
    const { error } = await supabase.from("pantry_items").delete().eq("id", item.id);
    if (error) {
      setItems((prev) => [...prev, item]);
      setError(`Couldn't remove ${item.name}: ${error.message}`);
    }
  }

  async function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: u.user?.id, ...next, updated_at: new Date().toISOString() });
    if (error) setError(`Couldn't save your settings: ${error.message}`);
  }

  async function getRecipes(mode: "fresh" | "more") {
    setLoading(mode);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("recipes", {
        method: "POST",
        body: { exclude: seen.slice(-30) },
      });
      if (error) {
        // FunctionsHttpError carries the function's JSON body ({ error }) in error.context.
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error || "Something went wrong. Please try again.");
      }
      const fresh = data.recipes as Recipe[];
      setSeen((prev) => [...prev, ...fresh.map((r) => r.title)]);
      if (mode === "more") {
        setRecipes((prev) => {
          const have = new Set((prev ?? []).map((r) => r.title.toLowerCase()));
          return [...(prev ?? []), ...fresh.filter((r) => !have.has(r.title.toLowerCase()))];
        });
        if (!fresh.length) setError("No new ideas this time. Try another type of dish.");
      } else {
        setRecipes(fresh);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function markTried(recipe: Recipe) {
    // Optimistic: hide it now, show it in Tried; roll back if the save fails.
    const temp: KeptRecipe = { id: `tmp-${recipe.title}`, title: recipe.title, recipe, at: new Date().toISOString() };
    setRecipes((prev) => prev?.filter((r) => r !== recipe) ?? prev);
    setTried((prev) => [temp, ...prev.filter((t) => t.title.toLowerCase() !== recipe.title.toLowerCase())]);
    const { data, error } = await supabase
      .from("tried_recipes")
      .insert({ title: recipe.title, recipe })
      .select("id, title, recipe, at:tried_at");
    if (error && error.code !== "23505") {
      setTried((prev) => prev.filter((t) => t.id !== temp.id));
      setRecipes((prev) => (prev ? [recipe, ...prev] : [recipe]));
      return setError(`Couldn't save "${recipe.title}" as tried: ${error.message}`);
    }
    if (data?.[0]) setTried((prev) => prev.map((t) => (t.id === temp.id ? (data[0] as KeptRecipe) : t)));
  }

  async function saveRecipe(recipe: Recipe) {
    // Optimistic: the card turns "Saved" at once; roll back if the save fails.
    if (saved.some((s) => s.title.toLowerCase() === recipe.title.toLowerCase())) return;
    const temp: KeptRecipe = { id: `tmp-${recipe.title}`, title: recipe.title, recipe, at: new Date().toISOString() };
    setSaved((prev) => [temp, ...prev]);
    const { data, error } = await supabase
      .from("saved_recipes")
      .insert({ title: recipe.title, recipe })
      .select("id, title, recipe, at:saved_at");
    if (error && error.code !== "23505") {
      setSaved((prev) => prev.filter((s) => s.id !== temp.id));
      return setError(`Couldn't save "${recipe.title}": ${error.message}`);
    }
    if (data?.[0]) setSaved((prev) => prev.map((s) => (s.id === temp.id ? (data[0] as KeptRecipe) : s)));
  }

  async function unsave(k: KeptRecipe) {
    setSaved((prev) => prev.filter((s) => s.id !== k.id));
    if (k.id.startsWith("tmp-")) return;
    const { error } = await supabase.from("saved_recipes").delete().eq("id", k.id);
    if (error) {
      setSaved((prev) => [k, ...prev]);
      setError(`Couldn't remove "${k.title}": ${error.message}`);
    }
  }

  function openMyRecipes() {
    // Open without the height animation and commit synchronously, so the page already has its
    // full height when we jump (a smooth scroll or an animated open made the jump land short).
    flushSync(() => {
      setInstantOpen(true);
      setListOpen((o) => ({ ...o, saved: true }));
    });
    document.getElementById("saved-section")?.scrollIntoView({ block: "start" });
  }

  async function untry(t: KeptRecipe) {
    setTried((prev) => prev.filter((x) => x.id !== t.id));
    if (t.id.startsWith("tmp-")) return;
    const { error } = await supabase.from("tried_recipes").delete().eq("id", t.id);
    if (error) {
      setTried((prev) => [t, ...prev]);
      setError(`Couldn't update "${t.title}": ${error.message}`);
    }
  }

  async function signOut() {
    signingOut.current = true;
    // "local": only this device. The default ("global") would end the login on every device too.
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  const savedCount = items.filter((i) => !i.id.startsWith("tmp-")).length;

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ChefHat size={28} weight="fill" className="text-tomato" aria-hidden />
            Pantry Chef
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={openMyRecipes}
              disabled={!saved.length}
              className="press flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-surface-2 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
              aria-label={`My recipes, ${saved.length} saved`}
            >
              <BookmarkSimple size={20} weight={saved.length ? "fill" : "regular"} className={saved.length ? "text-tomato" : ""} aria-hidden />
              My recipes
              <span className="tabular-nums text-muted">{saved.length}</span>
            </button>
            <span className="hidden text-sm text-muted lg:inline">{props.email}</span>
            <button
              onClick={signOut}
              className="press flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
            >
              <SignOut size={20} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-36 pt-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:pb-16 lg:pt-10">
        <section aria-labelledby="kitchen-h">
          <h1 id="kitchen-h" className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            What&apos;s in your kitchen?
          </h1>
          <p className="mt-2 text-lg text-muted">
            {savedCount ? `${savedCount} ${savedCount === 1 ? "thing" : "things"} on your shelves.` : "Tap a quick add or type your own."}
          </p>

          <ShelfTabs shelf={shelf} items={items} onPick={setShelf} />
          <ShelfPanel
            key={shelf}
            shelf={shelf}
            items={items.filter((i) => i.location === shelf)}
            onAdd={(t) => addItems(shelf, t)}
            onRemove={removeItem}
          />
        </section>

        <section aria-labelledby="cook-h" className="lg:pt-3">
          <h2 id="cook-h" className="text-2xl font-bold tracking-[-0.02em]">How do you want to eat?</h2>
          <Preferences settings={settings} onChange={updateSettings} />

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:static lg:z-auto lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
            <button
              onClick={() => getRecipes("fresh")}
              disabled={loading !== null || !items.length}
              className="key mx-auto flex min-h-14 w-full max-w-6xl items-center justify-center gap-2.5 text-lg font-bold"
            >
              <CookingPot size={26} weight="fill" className={loading === "fresh" ? "animate-bounce" : ""} aria-hidden />
              {loading === "fresh" ? "Cooking up ideas" : recipes ? "Find new recipes" : "Find recipes"}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="mt-5 flex items-start gap-3 rounded-xl bg-tomato-soft py-3 pl-4 pr-1.5 text-tomato-ink"
              >
                <p className="flex-1 pt-1.5 font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  aria-label="Dismiss message"
                  className="press grid size-10 shrink-0 place-items-center rounded-lg hover:bg-bg/60"
                >
                  <X size={18} weight="bold" aria-hidden />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Recipes
            recipes={recipes}
            loading={loading}
            hasItems={items.length > 0}
            saved={saved}
            tried={tried}
            open={listOpen}
            onToggle={(id) => {
              setInstantOpen(false);
              setListOpen((o) => ({ ...o, [id]: !o[id] }));
            }}
            instantOpen={instantOpen}
            onSave={saveRecipe}
            onUnsave={unsave}
            onTried={markTried}
            onUntry={untry}
            onMore={() => getRecipes("more")}
          />
        </section>
      </main>
    </div>
  );
}

function ShelfTabs(props: { shelf: Location; items: PantryItem[]; onPick: (l: Location) => void }) {
  const reduce = useReducedMotion();
  return (
    <div role="tablist" aria-label="Shelves" className="mt-7 grid grid-cols-4 gap-2">
      {LOCATIONS.map((loc) => {
        const { Icon, soft, ink } = SHELF[loc.id];
        const active = props.shelf === loc.id;
        const count = props.items.filter((i) => i.location === loc.id).length;
        return (
          <button
            key={loc.id}
            role="tab"
            id={`tab-${loc.id}`}
            aria-selected={active}
            aria-controls="shelf-panel"
            onClick={() => props.onPick(loc.id)}
            className={`press relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl px-1 ${
              active ? ink : "text-muted hover:text-ink"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="shelf-tab"
                className={`absolute inset-0 rounded-xl ${soft}`}
                transition={reduce ? { duration: 0 } : SPRING}
              />
            ) : (
              <span className="absolute inset-0 rounded-xl bg-surface" />
            )}
            <Icon size={28} weight={active ? "fill" : "regular"} className="relative" aria-hidden />
            <span className="relative text-sm font-semibold">{loc.label}</span>
            {count > 0 && (
              <motion.span
                key={count}
                initial={reduce ? false : { scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="absolute right-1.5 top-1.5 grid min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs font-bold tabular-nums text-bg"
                aria-label={`${count} items`}
              >
                {count}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ShelfPanel(props: {
  shelf: Location;
  items: PantryItem[];
  onAdd: (text: string) => Promise<void>;
  onRemove: (item: PantryItem) => void;
}) {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const loc = LOCATIONS.find((l) => l.id === props.shelf)!;
  const { soft, ink } = SHELF[props.shelf];
  const have = new Set(props.items.map((i) => i.name.trim().toLowerCase()));
  const quick = loc.suggestions.filter((s) => !have.has(s));
  const chipIn = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 };
  const chipOut = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, transition: { duration: 0.15 } };

  return (
    <motion.div
      id="shelf-panel"
      role="tabpanel"
      aria-labelledby={`tab-${props.shelf}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className={`mt-3 rounded-2xl p-4 sm:p-5 ${soft}`}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text;
          setText("");
          await props.onAdd(t);
        }}
      >
        <label htmlFor="add-item" className={`block text-sm font-bold ${ink}`}>
          Add to {loc.label.toLowerCase()}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="add-item"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={loc.placeholder}
            autoComplete="off"
            enterKeyHint="done"
            className="field min-w-0 flex-1 border-transparent"
          />
          <button className="key flex min-h-12 shrink-0 items-center gap-1.5 px-4 font-bold" aria-label={`Add to ${loc.label}`}>
            <Plus size={20} weight="bold" aria-hidden />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </form>

      <LayoutGroup id={`shelf-${props.shelf}`}>
        <div className="mt-5">
          <h3 className={`text-sm font-bold ${ink}`}>On the shelf</h3>
          {props.items.length === 0 ? (
            <p className={`mt-2 ${ink}`}>Empty for now. Tap a quick add below.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {props.items.map((item) => (
                  <motion.li
                    key={keyOf(item.location, item.name)}
                    layoutId={keyOf(item.location, item.name)}
                    initial={chipIn}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={chipOut}
                    transition={reduce ? { duration: 0.15 } : SPRING}
                    className="flex min-h-11 items-center gap-1 rounded-full bg-bg py-1 pl-4 pr-1 text-base font-semibold text-ink shadow-[0_2px_0_var(--line)]"
                  >
                    {item.name}
                    <button
                      onClick={() => props.onRemove(item)}
                      aria-label={`Remove ${item.name}`}
                      className="press grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <X size={16} weight="bold" aria-hidden />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {quick.length > 0 && (
          <div className="mt-5">
            <h3 className={`text-sm font-bold ${ink}`}>Quick add</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {quick.map((name) => (
                  <motion.li
                    key={keyOf(props.shelf, name)}
                    layoutId={keyOf(props.shelf, name)}
                    initial={chipIn}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={chipOut}
                    transition={reduce ? { duration: 0.15 } : SPRING}
                  >
                    <button
                      onClick={() => props.onAdd(name)}
                      className={`press flex min-h-11 items-center gap-1.5 rounded-full border-2 border-dashed border-current px-3.5 text-base font-semibold ${ink} hover:bg-bg/50`}
                    >
                      <Plus size={16} weight="bold" aria-hidden />
                      {name}
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </LayoutGroup>
    </motion.div>
  );
}

function Preferences({ settings, onChange }: { settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="mt-4 space-y-6 rounded-2xl bg-surface p-4 sm:p-5">
      <fieldset>
        <legend className="text-sm font-bold">Diet</legend>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-3xl bg-surface-2 p-1 sm:grid-cols-4 sm:gap-0 sm:rounded-full">
          {DIETS.map((d) => {
            const active = settings.diet === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ diet: d.id })}
                className="press relative min-h-11 rounded-full px-2 text-sm font-semibold sm:text-base"
              >
                {active && (
                  <motion.span
                    layoutId="diet-pill"
                    className="absolute inset-0 rounded-full bg-tomato shadow-[0_3px_0_var(--tomato-deep)]"
                    transition={reduce ? { duration: 0 } : SPRING}
                  />
                )}
                <span className={`relative ${active ? "text-white" : "text-muted"}`}>{d.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold">Type of dish</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {COURSES.map((c) => {
            const active = settings.course === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ course: c.id })}
                className={`press min-h-11 rounded-full border-2 px-4 text-base font-semibold ${
                  active
                    ? "border-tomato bg-tomato text-white"
                    : "border-line bg-bg text-ink hover:border-muted"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
        <div>
          <span id="servings-label" className="text-sm font-bold">Servings</span>
          <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="servings-label">
            <button
              type="button"
              onClick={() => onChange({ servings: Math.max(1, settings.servings - 1) })}
              disabled={settings.servings <= 1}
              aria-label="One serving less"
              className="key key-quiet grid size-12 place-items-center"
            >
              <Minus size={20} weight="bold" aria-hidden />
            </button>
            <output aria-live="polite" className="w-10 text-center text-3xl font-extrabold tabular-nums">
              {settings.servings}
            </output>
            <button
              type="button"
              onClick={() => onChange({ servings: Math.min(12, settings.servings + 1) })}
              disabled={settings.servings >= 12}
              aria-label="One serving more"
              className="key key-quiet grid size-12 place-items-center"
            >
              <Plus size={20} weight="bold" aria-hidden />
            </button>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.only_my_ingredients}
          onClick={() => onChange({ only_my_ingredients: !settings.only_my_ingredients })}
          className="press flex min-h-12 items-center gap-3 rounded-xl text-left"
        >
          <span
            className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
              settings.only_my_ingredients ? "justify-end bg-lime" : "justify-start bg-line"
            }`}
          >
            <motion.span
              layout
              transition={reduce ? { duration: 0 } : SPRING}
              className="size-6 rounded-full bg-white shadow-[0_2px_0_oklch(0.23_0.02_35/0.2)]"
            />
          </span>
          <span>
            <span className="block font-semibold">Only what I have</span>
            <span className="block text-sm text-muted">No shopping trip needed</span>
          </span>
        </button>
      </div>
    </div>
  );
}
