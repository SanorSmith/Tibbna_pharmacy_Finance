import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { hashPassword } from "./lib/db/queries/user";
import { eq } from "drizzle-orm";

async function setUserPassword() {
  try {
    const userEmail = "sanorsmith83@gmail.com";
    const newPassword = "password123"; // You can change this
    
    // Hash the password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedat: new Date()
      })
      .where(eq(users.email, userEmail));
    
    console.log(`Password set successfully for ${userEmail}`);
    console.log(`You can now login with:`);
    console.log(`Email: ${userEmail}`);
    console.log(`Password: ${newPassword}`);
  } catch (error) {
    console.error("Error setting password:", error);
  }
}

setUserPassword();
