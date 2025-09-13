import { LoginForm } from "./components/login-form";
import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getUser();
  if (user) {
    redirect("/d");
  }
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  );
}
