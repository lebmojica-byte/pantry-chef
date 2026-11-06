"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type PantryItem, type Settings } from "@/lib/options";
import { createClient } from "@/lib/supabase/client";
import Kitchen from "./Kitchen";

type Loaded = { email: string; items: PantryItem[]; settings: Settings };

// Static page: the session lives in the browser, so the login check happens here.
export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // getSession also finishes an email-confirmation ?code= exchange on this URL.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace(`/login${location.search}`);
      const [{ data: items }, { data: settings }] = await Promise.all([
        supabase.from("pantry_items").select("id, name, location").order("created_at"),
        supabase.from("user_settings").select("diet, course, servings, only_my_ingredients").limit(1),
      ]);
      setData({
        email: session.user.email ?? "",
        items: (items ?? []) as PantryItem[],
        settings: (settings?.[0] as Settings | undefined) ?? DEFAULT_SETTINGS,
      });
    })();
  }, [router]);

  if (!data) return <KitchenSkeleton />;
  return <Kitchen email={data.email} initialItems={data.items} initialSettings={data.settings} />;
}

function KitchenSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your kitchen" className="min-h-[100dvh]">
      <div className="h-16 border-b border-line" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:pt-10">
        <div>
          <div className="shimmer h-12 w-4/5 rounded-xl" />
          <div className="mt-7 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
          <div className="shimmer mt-3 h-64 rounded-2xl" />
        </div>
        <div className="lg:pt-3">
          <div className="shimmer h-8 w-3/5 rounded-xl" />
          <div className="shimmer mt-4 h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
