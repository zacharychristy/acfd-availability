const { createClient } = require('@supabase/supabase-js')

exports.handler = async function() {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    await supabase.from('availability').select('id').limit(1)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Supabase keep-alive ping successful' })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
