import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const resendFrom = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'
const cronSecret = Deno.env.get('CRON_SECRET')!

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: due, error } = await supabase
    .from('email_reminders')
    .select('id, subject, message, profiles(email, full_name)')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results = []
  for (const reminder of due || []) {
    const { data: claimed } = await supabase
      .from('email_reminders')
      .update({ status: 'processing' })
      .eq('id', reminder.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!claimed) continue

    const recipient = Array.isArray(reminder.profiles) ? reminder.profiles[0] : reminder.profiles
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: resendFrom,
        to: [recipient.email],
        subject: reminder.subject,
        text: reminder.message,
      }),
    })

    if (response.ok) {
      await supabase.from('email_reminders').update({ status: 'sent', sent_at: new Date().toISOString(), error: null }).eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'sent' })
    } else {
      const detail = await response.text()
      await supabase.from('email_reminders').update({ status: 'failed', error: detail.slice(0, 1000) }).eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'failed' })
    }
  }

  return Response.json({ processed: results.length, results })
})
