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

async function checkAdmin() {
  console.log("🔍 Checking admin user status...")
  console.log(`📧 Admin email: ${ADMIN_EMAIL}\n`)

  try {
    // Check if admin user exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Error listing users:", listError.message)
      throw listError
    }

    const existingAdmin = existingUsers.users.find((u) => u.email === ADMIN_EMAIL)

    if (!existingAdmin) {
      console.log("❌ Admin user NOT FOUND in auth.users")
      console.log("💡 Run 'npm run seed' to create the admin user")
      return
    }

    console.log("✅ Admin user found in auth.users")
    console.log(`   User ID: ${existingAdmin.id}`)
    console.log(`   Email: ${existingAdmin.email}`)
    console.log(`   Email confirmed: ${existingAdmin.email_confirmed_at ? '✅ Yes' : '❌ No'}`)
    console.log(`   Created at: ${existingAdmin.created_at}`)
    console.log(`   Last sign in: ${existingAdmin.last_sign_in_at || 'Never'}`)

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", existingAdmin.id)
      .maybeSingle()

    if (profileError) {
      console.error("❌ Error checking profile:", profileError.message)
      return
    }

    if (!profile) {
      console.log("❌ Admin profile NOT FOUND")
      console.log("💡 Run 'npm run seed' to create the admin profile")
      return
    }

    console.log("\n✅ Admin profile found")
    console.log(`   Profile ID: ${profile.id}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   Full name: ${profile.full_name || 'Not set'}`)
    console.log(`   Email: ${profile.email || 'Not set'}`)
    console.log(`   Company ID: ${profile.company_id || 'None'}`)
    console.log(`   Onboarding completed: ${profile.onboarding_completed ? 'Yes' : 'No'}`)

    // Summary
    console.log("\n📊 Summary:")
    const issues = []
    if (!existingAdmin.email_confirmed_at) {
      issues.push("Email not confirmed")
    }
    if (!profile) {
      issues.push("Profile missing")
    } else if (profile.role !== "admin") {
      issues.push(`Role is '${profile.role}' instead of 'admin'`)
    }

    if (issues.length > 0) {
      console.log("⚠️  Issues found:")
      issues.forEach(issue => console.log(`   - ${issue}`))
      console.log("\n💡 Run 'npm run seed' to fix these issues")
    } else {
      console.log("✅ Admin user is properly configured!")
      console.log("\n📝 Login credentials:")
      console.log(`   Email: ${ADMIN_EMAIL}`)
      console.log(`   Password: Check your .env file (ADMIN_PASSWORD) or use default: Admin@123456`)
    }
  } catch (error) {
    console.error("\n❌ Check failed:", error.message)
    if (error.details) {
      console.error("   Details:", error.details)
    }
    process.exit(1)
  }
}

// Run the check
checkAdmin()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

