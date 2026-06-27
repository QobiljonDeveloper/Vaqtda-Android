import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface RegionRow {
  id: string;
  name: any; // {uz,ru} jsonb
  slug: string;
}

export function useRegions() {
  const [regions, setRegions] = useState<RegionRow[]>([]);

  useEffect(() => {
    let active = true;
    supabase
      .from("regions")
      .select("id, name, slug")
      .eq("is_active", true)
      .then(
        ({ data }) => {
          if (active) setRegions((data as RegionRow[]) ?? []);
        },
        () => {}
      );
    return () => {
      active = false;
    };
  }, []);

  return regions;
}
