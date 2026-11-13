import { createApi } from "api-client";
import { createClient } from "@/lib/supabase/server";

// serverApi calls the API as the signed-in user, from Server Components.
export async function serverApi() {
  const supabase = await createClient();
  return createApi(process.env.NEXT_PUBLIC_API_URL!, async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  });
}
