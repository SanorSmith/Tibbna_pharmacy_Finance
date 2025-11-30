import { db } from "@/lib/db";
import {
  userSessions,
  UserSession,
  NewUserSession,
  User,
  users,
} from "@/lib/db/schema";
import { eq, lt, gt, and } from "drizzle-orm";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return dbUsers[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(":");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), buf);
}

// Session Management Functions

export async function createUserSession(
  userid: string,
  sessionToken: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<UserSession | null> {
  try {
    // Calculate expiration (365 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    const sessionData: NewUserSession = {
      userid,
      sessiontoken: sessionToken,
      deviceinfo: deviceInfo || null,
      ipaddress: ipAddress || null,
      useragent: userAgent || null,
      expiresat: expiresAt,
    };

    const newSessions = await db
      .insert(userSessions)
      .values(sessionData)
      .returning();

    return newSessions[0] || null;
  } catch (error) {
    console.error("Error creating user session:", error);
    return null;
  }
}

export async function getActiveSession(
  sessionToken: string,
): Promise<UserSession | null> {
  try {
    const session = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessiontoken, sessionToken),
          gt(userSessions.expiresat, new Date()),
        ),
      )
      .limit(1);

    return session[0] || null;
  } catch (error) {
    console.error("Error getting active session:", error);
    return null;
  }
}

export async function updateSessionActivity(
  sessionToken: string,
): Promise<boolean> {
  try {
    // First check if the session exists
    const existingSession = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessiontoken, sessionToken))
      .limit(1);

    if (existingSession.length === 0) {
      console.warn(
        "Session not found for activity update:",
        sessionToken.substring(0, 8) + "...",
      );
      return false;
    }

    // Optimization: Only update if last active was more than 5 minutes ago
    const lastActive = existingSession[0].lastactive;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (lastActive && lastActive > fiveMinutesAgo) {
      return true; // Skip update, consider it successful
    }

    await db
      .update(userSessions)
      .set({ lastactive: new Date() })
      .where(eq(userSessions.sessiontoken, sessionToken));

    return true;
  } catch (error) {
    console.error("Error updating session activity:", error);
    return false;
  }
}

export async function invalidateSession(
  sessionToken: string,
): Promise<boolean> {
  try {
    await db
      .delete(userSessions)
      .where(eq(userSessions.sessiontoken, sessionToken));

    return true;
  } catch (error) {
    console.error("Error invalidating session:", error);
    return false;
  }
}

export async function invalidateAllUserSessions(
  userid: string,
): Promise<boolean> {
  try {
    await db.delete(userSessions).where(eq(userSessions.userid, userid));

    return true;
  } catch (error) {
    console.error("Error invalidating all user sessions:", error);
    return false;
  }
}

export async function getUserActiveSessions(
  userid: string,
): Promise<UserSession[]> {
  try {
    const sessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userid, userid),
          gt(userSessions.expiresat, new Date()),
        ),
      )
      .orderBy(userSessions.lastactive);

    return sessions;
  } catch (error) {
    console.error("Error getting user active sessions:", error);
    return [];
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresat, new Date()));

    // Drizzle doesn't always return rowCount, so we'll return a success indicator
    return result ? 1 : 0;
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return 0;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Validates if a session token is active and not expired
 * @param sessionToken - The session token to validate
 * @returns true if session is valid and active, false otherwise
 */
export async function validateSessionToken(
  sessionToken: string,
): Promise<boolean> {
  try {
    const session = await getActiveSession(sessionToken);
    return !!session;
  } catch (error) {
    console.error("Error validating session token:", error);
    return false;
  }
}

export async function updateUserProfile(
  email: string,
  {
    name,
    image,
  }: {
    name?: typeof users.$inferSelect.name;
    image?: typeof users.$inferSelect.image;
  },
): Promise<boolean> {
  try {
    const dbUsers = await db
      .update(users)
      .set({ name, image })
      .where(eq(users.email, email))
      .returning();

    return dbUsers.length > 0;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
}
