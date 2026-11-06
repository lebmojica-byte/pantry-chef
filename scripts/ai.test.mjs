// Run: npm test   (node --experimental-strip-types loads the .ts file directly)
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrompt, cleanAvoid, generateRecipes, markHave, parseRecipes } from "../supabase/functions/recipes/ai.ts";

test("cleanAvoid dedupes, trims, caps and ignores junk", () => {
  assert.deepEqual(cleanAvoid(["  Pasta  ", "pasta", "Rice\nBowl", 42, "", null]), ["Pasta", "Rice Bowl"]);
  assert.deepEqual(cleanAvoid("not a list"), []);
  assert.equal(cleanAvoid(Array.from({ length: 100 }, (_, i) => `R${i}`), 30).length, 30);
});

test("buildPrompt has a high-protein rule", () => {
  const { user } = buildPrompt([{ name: "eggs", location: "fridge" }], {
    diet: "high_protein", course: "any", servings: 2, only_my_ingredients: false,
  });
  assert.match(user, /at least 30 g protein per serving/);
});

test("buildPrompt lists recipes to avoid only when there are some", () => {
  const prefs = { diet: "any", course: "any", servings: 2, only_my_ingredients: false };
  const items = [{ name: "rice", location: "pantry" }];
  assert.doesNotMatch(buildPrompt(items, prefs).user, /Do NOT suggest/);
  const { user } = buildPrompt(items, prefs, ["Garlic Chicken Pasta"]);
  assert.match(user, /Do NOT suggest any of these recipes again/);
  assert.match(user, /- Garlic Chicken Pasta/);
});

const good = JSON.stringify({
  recipes: [
    {
      title: "Basil omelette",
      description: "Quick.",
      time_minutes: "15",
      servings: 99,
      ingredients: [{ item: "eggs", amount: "3", have: true }, { item: "" }, { item: "cheese", have: "yes" }],
      steps: ["Beat eggs", 42, "Cook"],
    },
    { title: "", steps: ["x"] },
  ],
});

test("parseRecipes cleans model output", () => {
  const [r, ...rest] = parseRecipes("```json\n" + good + "\n```");
  assert.equal(rest.length, 0, "recipe without title dropped");
  assert.equal(r.time_minutes, 15);
  assert.equal(r.servings, 12, "clamped");
  assert.deepEqual(r.ingredients.map((i) => [i.item, i.have]), [["eggs", true], ["cheese", false]]);
  assert.deepEqual(r.steps, ["Beat eggs", "Cook"]);
  assert.throws(() => parseRecipes('{"recipes":[]}'));
});

test("buildPrompt carries diet, course and items", () => {
  const { user } = buildPrompt(
    [{ name: "basil", location: "herb" }, { name: "rice", location: "pantry" }],
    { diet: "vegan", course: "dessert", servings: 4, only_my_ingredients: true },
  );
  assert.match(user, /vegan/i);
  assert.match(user, /dessert, 4 servings/);
  assert.match(user, /Fresh herbs: basil/);
  assert.match(user, /Fridge: \(none\)/);
  assert.match(user, /ONLY the listed/);
});

test("generateRecipes falls back on error and on empty completion", async () => {
  const calls = [];
  const reply = (status, content) => ({
    ok: status === 200,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
  const fake = async (url) => {
    calls.push(url);
    if (url === "a") return reply(429, null);
    if (url === "b") return reply(200, "");
    return reply(200, good);
  };
  const p = (name) => ({ name, url: name, key: "k", model: "m" });
  const out = await generateRecipes({ system: "", user: "" }, [p("a"), p("b"), p("c")], fake);
  assert.equal(out.provider, "c");
  assert.deepEqual(calls, ["a", "b", "c"]);
  await assert.rejects(generateRecipes({ system: "", user: "" }, [p("a")], fake), /all AI providers failed/);
});

test("markHave recomputes 'have' from the real shelves", () => {
  const recipe = {
    title: "t", description: "", time_minutes: 10, servings: 2, steps: ["x"],
    ingredients: ["butter", "chicken breasts", "onion", "olive oil", "water", "tomato paste", "eggs", "yogurt"]
      .map((item) => ({ item, amount: "", have: true })),
  };
  const [r] = markHave([recipe], ["chicken", "onien", "oil", "Tomato paste", "egg"]);
  const have = Object.fromEntries(r.ingredients.map((i) => [i.item, i.have]));
  assert.deepEqual(have, {
    butter: false, "chicken breasts": true, onion: true, "olive oil": true,
    water: true, "tomato paste": true, eggs: true, yogurt: false,
  });
});
