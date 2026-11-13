import { notFound, redirect } from "next/navigation";
import { ApiError } from "api-client";
import { serverApi } from "@/lib/api-server";
import AdminDashboard from "@/components/admin/AdminDashboard";
import route101 from "@/assets/route101.webp";

export const metadata = { title: "Admin · Pokebrowser" };

// Non-admins get a 404; the API enforces the same check on every admin call.
export default async function AdminPage() {
  const api = await serverApi();
  const me = await api.me().catch((err) => {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  });
  if (!me) redirect("/?modal=login");
  if (!me.profile.isAdmin) notFound();

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-fixed bg-no-repeat relative"
      style={{ backgroundImage: `url(${route101.src})` }}
    >
      <div className="absolute inset-0 bg-white/40 pointer-events-none z-0" />
      <div className="relative z-10">
        <AdminDashboard trainerName={me.profile.trainerName} />
      </div>
    </div>
  );
}
