"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [message, setMessage] = useState("Checking Supabase configuration...");

  useEffect(() => {
    if (!supabase) {
      setMessage(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
      );
      return;
    }

    const test = async () => {
      const { data, error } = await supabase.from("orders").select("*");
      console.log("DATA:", data);
      console.log("ERROR:", error);
      setMessage(error ? `Error: ${error.message}` : "Connected successfully");
    };

    test();
  }, []);

  return (
    <div className="p-10 text-white">
      {message}
    </div>
  );
}