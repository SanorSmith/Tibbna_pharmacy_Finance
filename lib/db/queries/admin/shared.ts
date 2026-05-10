import { getUser } from "@/lib/user";

export async function checkIsAdmin(): Promise<boolean> {
  const user = await getUser();
  return user?.permissions?.includes("admin") || false;
}

export function withAdminCheck<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<R> => {
    if (!(await checkIsAdmin())) {
      throw new Error("User is not an administrator");
    }
    return fn(...args);
  };
}
