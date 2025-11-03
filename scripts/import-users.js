import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import process from 'node:process'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure you have VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Load user credentials
const credentialsPath = path.join(__dirname, '../../user-credentials.json')
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))

console.log(`📥 Loaded ${credentials.totalUsers} users from credentials file`)

// Function to create a single user
async function createUser(user, index) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: user.username.toLowerCase()
      }
    })

    if (authError) {
      console.error(`❌ Auth error for ${user.username}:`, authError)
      throw new Error(`Auth error: ${authError.message || JSON.stringify(authError)}`)
    }

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    // Create/update profile explicitly (don't rely on trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: user.username.toLowerCase(),
        email: user.email,
        role: 'player' // Default role is player
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error(`❌ Profile error for ${user.username}:`, profileError)
      // Try to delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Profile error: ${profileError.message}`)
    }

    console.log(`✅ Created user ${index + 1}/${credentials.totalUsers}: ${user.username}`)
    return { success: true, username: user.username }
  } catch (error) {
    console.error(`❌ Failed to create user ${user.username}:`, error)
    return { success: false, username: user.username, error: error.message || JSON.stringify(error) }
  }
}

// Function to create all users with rate limiting
async function importAllUsers() {
  console.log('\n🚀 Starting bulk user import...\n')

  const results = {
    success: [],
    failed: []
  }

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 10
  const DELAY_MS = 1000 // 1 second delay between batches

  for (let i = 0; i < credentials.users.length; i += BATCH_SIZE) {
    const batch = credentials.users.slice(i, i + BATCH_SIZE)

    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(credentials.users.length / BATCH_SIZE)}`)

    const batchResults = await Promise.all(
      batch.map((user, index) => createUser(user, i + index))
    )

    batchResults.forEach(result => {
      if (result.success) {
        results.success.push(result.username)
      } else {
        results.failed.push({ username: result.username, error: result.error })
      }
    })

    // Wait before next batch (except for the last batch)
    if (i + BATCH_SIZE < credentials.users.length) {
      console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Successfully created: ${results.success.length} users`)
  console.log(`❌ Failed: ${results.failed.length} users`)

  if (results.failed.length > 0) {
    console.log('\n❌ Failed users:')
    results.failed.forEach(({ username, error }) => {
      console.log(`   - ${username}: ${error}`)
    })
  }

  console.log('\n✨ Import complete!\n')
}

// Function to make specific users admins
async function makeUsersAdmin(usernames) {
  console.log('\n👑 Making specified users admins...\n')

  for (const username of usernames) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('username', username.toLowerCase())

    if (error) {
      console.error(`❌ Failed to make ${username} admin:`, error.message)
    } else {
      console.log(`✅ ${username} is now an admin`)
    }
  }
}

// Main function
async function main() {
  await importAllUsers()

  // Make YLES-001 and YLES-300 admins (you can customize this)
  await makeUsersAdmin(['yles-001', 'yles-300'])

  console.log('\n🎉 All done! Your users are ready to login.\n')
  process.exit(0)
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
