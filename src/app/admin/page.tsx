import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/admin/AdminDashboard";
import route101 from "@/assets/route101.webp";

export const metadata = { title: "Admin · Pokebrowser" };

/**
 * Admin tools. Gated on `users.is_admin` — non-admins get a 404 so the page
 * doesn't advertise itself. The real boundary is the same `is_admin` check
 * inside every `dev_*` SECURITY DEFINER RPC, which runs on each write.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/?modal=login");

  const { data, error } = await supabase
    .from("users")
    .select("trainer_name, is_admin")
    .eq("id", authUser.id)
    .single();

  if (error || !data?.is_admin) notFound();

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-fixed bg-no-repeat relative"
      style={{ backgroundImage: `url(${route101.src})` }}
    >
      <div className="absolute inset-0 bg-white/40 pointer-events-none z-0" />
      <div className="relative z-10">
        <AdminDashboard trainerName={data.trainer_name} />
      </div>
    </div>
  );
}
