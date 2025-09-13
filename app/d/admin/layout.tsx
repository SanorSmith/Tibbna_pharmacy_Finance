import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";

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

  return <div className="container mx-auto p-6">{children}</div>;
}
