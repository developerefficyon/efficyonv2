require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const ADMIN_EMAIL = "admin@efficyon.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456"
const ADMIN_NAME = "Admin User"

async function seedAdmin() {
  console.log("🌱 Starting admin seed...")
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`)
  console.log(`🔑 Admin password: ${ADMIN_PASSWORD}`)

  try {
    // Check if admin user already exists
    console.log("\n1️⃣ Checking if admin user exists...")
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Error listing users:", listError.message)
      throw listError
    }

    const existingAdmin = existingUsers.users.find((u) => u.email === ADMIN_EMAIL)

    if (existingAdmin) {
      console.log("✅ Admin user already exists in auth.users")
      console.log(`   User ID: ${existingAdmin.id}`)
      console.log(`   Email confirmed: ${existingAdmin.email_confirmed_at ? 'Yes' : 'No'}`)

      // Ensure email is confirmed (required for login)
      if (!existingAdmin.email_confirmed_at) {
        console.log("📧 Admin email not confirmed, confirming now...")
        const { data: updatedUser, error: confirmError } = await supabase.auth.admin.updateUserById(
          existingAdmin.id,
          { email_confirm: true }
        )
        if (confirmError) {
          console.error("⚠️ Warning: Could not confirm admin email:", confirmError.message)
        } else {
          console.log("✅ Admin email confirmed")
        }
      }

      // Check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", existingAdmin.id)
        .maybeSingle()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("❌ Error checking profile:", profileError.message)
        throw profileError
      }

      if (existingProfile) {
        console.log("✅ Admin profile already exists")
        console.log(`   Profile ID: ${existingProfile.id}`)
        console.log(`   Role: ${existingProfile.role}`)

        // Update profile to ensure it's set as admin (new schema only has: id, email, full_name, role, company_id, onboarding_completed)
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({
            role: "admin",
            email: ADMIN_EMAIL,
            full_name: ADMIN_NAME,
          })
          .eq("id", existingAdmin.id)
          .select()
          .single()

        if (updateError) {
          console.error("❌ Error updating profile:", updateError.message)
          throw updateError
        }

        console.log("✅ Admin profile updated successfully")
        console.log("\n✨ Seed completed! Admin user is ready.")
        console.log(`\n📝 Login credentials:`)
        console.log(`   Email: ${ADMIN_EMAIL}`)
        console.log(`   Password: ${ADMIN_PASSWORD}`)
        return
      } else {
        // Create profile for existing admin user (new schema only has: id, email, full_name, role, company_id, onboarding_completed)
        console.log("📝 Creating profile for existing admin user...")
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: existingAdmin.id,
            email: ADMIN_EMAIL,
            full_name: ADMIN_NAME,
            role: "admin",
          })
          .select()
          .single()

        if (createError) {
          console.error("❌ Error creating profile:", createError.message)
          throw createError
        }

        console.log("✅ Admin profile created successfully")
        console.log("\n✨ Seed completed! Admin user is ready.")
        console.log(`\n📝 Login credentials:`)
        console.log(`   Email: ${ADMIN_EMAIL}`)
        console.log(`   Password: ${ADMIN_PASSWORD}`)
        return
      }
    }

    // Create new admin user
    console.log("\n2️⃣ Creating new admin user...")
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email (sets email_confirmed_at)
      user_metadata: {
        name: ADMIN_NAME,
        role: "admin",
      },
    })

    if (createUserError) {
      console.error("❌ Error creating admin user:", createUserError.message)
      throw createUserError
    }

    console.log("✅ Admin user created in auth.users")
    console.log(`   User ID: ${newUser.user.id}`)

    // Create profile for admin user (new schema only has: id, email, full_name, role, company_id, onboarding_completed)
    console.log("\n3️⃣ Creating admin profile...")
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: newUser.user.id,
        email: ADMIN_EMAIL,
        full_name: ADMIN_NAME,
        role: "admin",
      })
      .select()
      .single()

    if (profileError) {
      console.error("❌ Error creating profile:", profileError.message)
      console.error("   Full error:", profileError)
      throw profileError
    }

    console.log("✅ Admin profile created successfully")
    console.log(`   Profile ID: ${profile.id}`)
    console.log(`   Role: ${profile.role}`)

    console.log("\n✨ Seed completed successfully!")
    console.log(`\n📝 Admin login credentials:`)
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`\n⚠️  Please change the password after first login!`)
  } catch (error) {
    console.error("\n❌ Seed failed:", error.message)
    if (error.details) {
      console.error("   Details:", error.details)
    }
    if (error.hint) {
      console.error("   Hint:", error.hint)
    }
    process.exit(1)
  }
}

// Run the seed
seedAdmin()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

