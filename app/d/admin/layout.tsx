import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { AdminNav } from "./components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  if (!(await checkIsAdmin())) {
    redirect("/d");
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
