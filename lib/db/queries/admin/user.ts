import { db } from "@/lib/db";
import { users, NewUser, User, UserPermissions } from "@/lib/db/tables/user";
import { eq, ilike, or, desc, not, sql, and } from "drizzle-orm";
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

      // Prevent creating admin users - force permissions to be empty or null
      const safeUserData = {
        ...userData,
        permissions: [] as UserPermissions[], // Force non-admin permissions
      };

      const [user] = await db.insert(users).values(safeUserData).returning();

      return user || null;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  },
);

export const deleteUser = withAdminCheck(
  async (userid: string): Promise<boolean> => {
    try {
      // Prevent deleting admin users
      await db
        .delete(users)
        .where(
          and(
            eq(users.userid, userid),
            or(
              sql`${users.permissions} IS NULL`,
              sql`${users.permissions} = '[]'::jsonb`,
              not(sql`${users.permissions} ? 'admin'`),
            ),
          ),
        );
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  },
);

export const getAllUsers = withAdminCheck(
  async (limit: number = 50, offset: number = 0): Promise<User[]> => {
    try {
      return await db
        .select()
        .from(users)
        .where(
          or(
            sql`${users.permissions} IS NULL`,
            sql`${users.permissions} = '[]'::jsonb`,
            not(sql`${users.permissions} ? 'admin'`),
          ),
        )
        .orderBy(desc(users.createdat))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error getting users:", error);
      return [];
    }
  },
);

export const searchUsers = withAdminCheck(
  async (query: string, limit: number = 50): Promise<User[]> => {
    try {
      return await db
        .select()
        .from(users)
        .where(
          and(
            or(
              ilike(users.name, `%${query}%`),
              ilike(users.email, `%${query}%`),
            ),
            or(
              sql`${users.permissions} IS NULL`,
              sql`${users.permissions} = '[]'::jsonb`,
              not(sql`${users.permissions} ? 'admin'`),
            ),
          ),
        )
        .orderBy(desc(users.createdat))
        .limit(limit);
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  },
);

export const updateUser = withAdminCheck(
  async (
    userid: string,
    updates: Partial<Pick<User, "name" | "email">>,
  ): Promise<User | null> => {
    try {
      // Prevent updating admin users
      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.userid, userid),
            or(
              sql`${users.permissions} IS NULL`,
              sql`${users.permissions} = '[]'::jsonb`,
              not(sql`${users.permissions} ? 'admin'`),
            ),
          ),
        )
        .limit(1);

      if (!existingUser) {
        throw new Error("User not found or is an administrator");
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedat: new Date(),
        })
        .where(eq(users.userid, userid))
        .returning();

      return updatedUser || null;
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  },
);
