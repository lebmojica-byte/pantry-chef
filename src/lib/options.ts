// Must match the CHECK constraints in supabase/migrations/0001_init.sql.
export const LOCATIONS = [
  {
    id: "fridge",
    label: "Fridge",
    placeholder: "eggs, milk, zucchini",
    suggestions: ["eggs", "milk", "butter", "cheese", "yogurt", "zucchini", "bell pepper", "chicken"],
  },
  {
    id: "pantry",
    label: "Pantry",
    placeholder: "rice, pasta, canned tomatoes",
    suggestions: ["rice", "pasta", "canned tomatoes", "lentils", "flour", "onions", "garlic", "olive oil"],
  },
  {
    id: "spice",
    label: "Spices",
    placeholder: "cumin, paprika, salt",
    suggestions: ["salt", "black pepper", "paprika", "cumin", "chili flakes", "oregano", "cinnamon", "curry powder"],
  },
  {
    id: "herb",
    label: "Herbs",
    placeholder: "basil, coriander, mint",
    suggestions: ["basil", "coriander", "parsley", "mint", "chives", "dill", "thyme", "rosemary"],
  },
] as const;

export const DIETS = [
  { id: "any", label: "Everything" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
] as const;

export const COURSES = [
  { id: "any", label: "Any" },
  { id: "breakfast", label: "Breakfast" },
  { id: "appetizer", label: "Appetizer" },
  { id: "soup", label: "Soup" },
  { id: "salad", label: "Salad" },
  { id: "main", label: "Main course" },
  { id: "dessert", label: "Dessert" },
  { id: "snack", label: "Snack" },
] as const;

export type Location = (typeof LOCATIONS)[number]["id"];
export type Diet = (typeof DIETS)[number]["id"];
export type Course = (typeof COURSES)[number]["id"];

export type PantryItem = { id: string; name: string; location: Location };
export type Settings = {
  diet: Diet;
  course: Course;
  servings: number;
  only_my_ingredients: boolean;
};

// ponytail: mirrors Recipe in supabase/functions/recipes/ai.ts (Deno code can't be imported here).
export type Recipe = {
  title: string;
  description: string;
  time_minutes: number;
  servings: number;
  ingredients: { item: string; amount: string; have: boolean }[];
  steps: string[];
};

export type TriedRecipe = { id: string; title: string; recipe: Recipe; tried_at: string };

export const DEFAULT_SETTINGS: Settings = {
  diet: "any",
  course: "any",
  servings: 2,
  only_my_ingredients: false,
};
