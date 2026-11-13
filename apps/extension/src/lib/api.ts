import { createApi } from "api-client";
import { CONFIG } from "./config";
import { supabase } from "./supabase";

export const api = createApi(CONFIG.API_URL, async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
});
