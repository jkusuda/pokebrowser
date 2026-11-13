import { createApi } from "api-client";
import { createClient } from "@/lib/supabase/client";

export const api = createApi(process.env.NEXT_PUBLIC_API_URL!, async () => {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token;
});
