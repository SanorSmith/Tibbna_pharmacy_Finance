import { db } from "@/lib/db";
import { users, NewUser, User } from "@/lib/db/tables/user";
import { eq, ilike, or, desc } from "drizzle-orm";
import { withAdminCheck } from "./shared";

export const createNewUser = withAdminCheck(
  async (userData: NewUser): Promise<User | null> => {
    try {
      const dbUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
      if (dbUsers.length > 0) {
        throw new Error("User already exists");
      }

      const [user] = await db.insert(users).values(userData).returning();

      return user || null;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  }
);

export const deleteUser = withAdminCheck(
  async (userid: string): Promise<boolean> => {
    try {
      await db.delete(users).where(eq(users.userid, userid));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
);

export const getAllUsers = withAdminCheck(async (limit: number = 50, offset: number = 0): Promise<User[]> => {
  try {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdat))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
});

export const searchUsers = withAdminCheck(async (query: string, limit: number = 50): Promise<User[]> => {
  try {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      )
      .orderBy(desc(users.createdat))
      .limit(limit);
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
});
