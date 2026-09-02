import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const brevoApiKey = Deno.env.get('BREVO_API_KEY')!
const brevoFromEmail = Deno.env.get('BREVO_FROM_EMAIL')!
const brevoFromName = Deno.env.get('BREVO_FROM_NAME') || 'AQLER Timesheet'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: schedules, error } = await supabase
    .from('email_reminders')
    .select('id, subject, message, days_of_week, reminder_time, timezone, last_sent_on, profiles(email, full_name)')
    .eq('status', 'active')
    .limit(50)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results = []
  for (const reminder of schedules || []) {
    const timezone = reminder.timezone || 'Asia/Manila'
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date())
    const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'))
    const localDate = `${value('year')}-${value('month')}-${value('day')}`
    const localTime = `${value('hour')}:${value('minute')}`
    const scheduledTime = String(reminder.reminder_time).slice(0, 5)

    if (!reminder.days_of_week?.includes(weekday) || localTime < scheduledTime || reminder.last_sent_on === localDate) continue

    const { data: claimed } = await supabase
      .from('email_reminders')
      .update({ last_sent_on: localDate })
      .eq('id', reminder.id)
      .eq('status', 'active')
      .or(`last_sent_on.is.null,last_sent_on.neq.${localDate}`)
      .select('id')
      .maybeSingle()

    if (!claimed) continue

    const recipient = Array.isArray(reminder.profiles) ? reminder.profiles[0] : reminder.profiles

    if (!recipient?.email) {
      const detail = 'The employee does not have an email address.'
      await supabase
        .from('email_reminders')
        .update({ error: detail, last_sent_on: null })
        .eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'failed', error: detail })
      continue
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: brevoFromName, email: brevoFromEmail },
        to: [{ email: recipient.email, name: recipient.full_name || undefined }],
        subject: reminder.subject,
        textContent: reminder.message,
      }),
    })

    if (response.ok) {
      await supabase.from('email_reminders').update({ sent_at: new Date().toISOString(), error: null }).eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'sent' })
    } else {
      const detail = await response.text()
      await supabase.from('email_reminders').update({ error: detail.slice(0, 1000), last_sent_on: null }).eq('id', reminder.id)
      results.push({ id: reminder.id, status: 'failed', error: detail })
    }
  }

  return Response.json({ processed: results.length, results })
})
