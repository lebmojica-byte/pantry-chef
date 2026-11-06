"use client";

import { ChefHat, Egg, Carrot, Grains, Pepper, Leaf, Snowflake, Jar, Plant } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

// Fixed light chips on the tomato panel in both color modes (panel color does not change).
const CHIPS = [
  { label: "eggs", Icon: Egg, tint: "oklch(0.42 0.12 245)", rotate: -6 },
  { label: "basil", Icon: Leaf, tint: "oklch(0.42 0.11 140)", rotate: 4 },
  { label: "rice", Icon: Grains, tint: "oklch(0.45 0.09 70)", rotate: -2 },
  { label: "paprika", Icon: Pepper, tint: "oklch(0.45 0.16 33)", rotate: 7 },
  { label: "zucchini", Icon: Carrot, tint: "oklch(0.42 0.11 140)", rotate: -4 },
  { label: "butter", Icon: Snowflake, tint: "oklch(0.42 0.12 245)", rotate: 3 },
  { label: "lentils", Icon: Jar, tint: "oklch(0.45 0.09 70)", rotate: -7 },
  { label: "coriander", Icon: Plant, tint: "oklch(0.42 0.11 140)", rotate: 5 },
];

export default function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative flex flex-col overflow-hidden bg-tomato px-5 pb-7 pt-5 text-white sm:px-8 sm:pb-10 lg:min-h-[100dvh] lg:px-14 lg:py-12">
      <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
        <ChefHat size={28} weight="fill" aria-hidden />
        Pantry Chef
      </div>

      <div className="mt-6 max-w-xl sm:mt-10 lg:mt-auto">
        <h1 className="text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
          What&apos;s for dinner?
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-white sm:mt-5 sm:text-lg">
          Add what&apos;s in your fridge, pantry and spice rack. Get three recipes you can cook tonight.
        </p>
      </div>

      {/* Phones: one row that runs off the edge; wider screens: the full wrapped cluster. */}
      <ul
        className="-mx-5 mt-5 flex max-w-xl flex-nowrap gap-2.5 overflow-hidden px-5 py-1 [mask-image:linear-gradient(90deg,#000_75%,transparent)] sm:mx-0 sm:mt-8 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none] lg:mb-auto lg:mt-12 lg:gap-3"
        aria-label="Example ingredients"
      >
        {CHIPS.map(({ label, Icon, tint, rotate }, i) => (
          <motion.li
            key={label}
            initial={reduce ? false : { opacity: 0, y: 18, rotate: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: reduce ? 0 : rotate, scale: 1 }}
            whileHover={reduce ? undefined : { rotate: 0, y: -4 }}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.6, delay: reduce ? 0 : 0.15 + i * 0.05 }}
            className="flex shrink-0 cursor-default select-none items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold sm:px-4 sm:py-2.5 sm:text-base text-[oklch(0.23_0.02_35)] shadow-[0_3px_0_oklch(0.47_0.17_33)] lg:px-5 lg:py-3 lg:text-lg"
          >
            <Icon size={20} weight="bold" color={tint} aria-hidden />
            {label}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
