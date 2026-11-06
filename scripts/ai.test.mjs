// Run: npm test   (node --experimental-strip-types loads the .ts file directly)
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrompt, generateRecipes, parseRecipes } from "../supabase/functions/recipes/ai.ts";

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
