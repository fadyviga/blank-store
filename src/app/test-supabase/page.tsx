"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from("orders").select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);
    };

    test();
  }, []);

  return (
    <div className="p-10 text-white">
      Check console for Supabase test
    </div>
  );
}