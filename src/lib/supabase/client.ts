import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient | undefined;
export function getSupabase() {
  if (!client) {
    const { url, publishableKey } = getSupabaseConfig();
    client = createClient(url, publishableKey);
  }
  return client;
}
