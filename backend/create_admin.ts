import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './src/lib/supabase.js'

async function createAdmin() {
  const email = 'admin@example.com'
  const password = 'password'

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        email,
        password_hash,
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        is_active: true
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating admin:', error)
    return
  }

  console.log('Admin created successfully:')
  console.log(data)
}

createAdmin()