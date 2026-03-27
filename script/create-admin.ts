import "dotenv/config";
import { hashPassword } from "../server/auth.js";
import { storage } from "../server/storage.js";
import { UserRole } from "../shared/schema.js";

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@devshare.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin User";

  try {
    
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      if (existingUser.role === UserRole.ADMIN) {
        console.log("✅ Admin user already exists!");
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${existingUser.email}`);
        return;
      } else {
        
        const hashedPassword = await hashPassword(password);
        await storage.updateUser(existingUser.id, {
          role: UserRole.ADMIN,
          password: hashedPassword,
        });
        console.log("✅ Existing user promoted to admin!");
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        return;
      }
    }

    
    const hashedPassword = await hashPassword(password);
    const admin = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      name,
      role: UserRole.ADMIN,
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
  } catch (error: any) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
}

createAdmin();

