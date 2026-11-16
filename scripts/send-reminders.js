/**
 * Invoice Chaser - Daily Reminder Cron Script
 * Runs via GitHub Actions every day at 09:00 UTC
 *
 * 1. Queries Supabase for pending invoices past their due date
 * 2. Sends reminder emails via Resend (day 1, 7, 14 stages)
 * 3. Updates follow-up logs and invoice reminder counts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error('Missing required environment variables');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const REMINDER_STAGES = [
  { daysPastDue: 1, stage: 'day_1', subjectTemplate: 'Friendly reminder: Invoice {{invoiceNumber}} is due' },
  { daysPastDue: 7, stage: 'day_7', subjectTemplate: 'Following up: Invoice {{invoiceNumber}} is 1 week overdue' },
  { daysPastDue: 14, stage: 'day_14', subjectTemplate: 'Action required: Invoice {{invoiceNumber}} is 2 weeks overdue' },
];

const EMAIL_TEMPLATES = {
  polite: {
    day_1: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nJust a quick note that invoice #${invoiceNumber} for $${amount} was due on ${dueDate}. It may have slipped through — could you let me know when I can expect payment?\n\nThanks,\n{{userName}}`,
    day_7: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nI'm following up on invoice #${invoiceNumber} for $${amount}, which was due on ${dueDate}. It's now one week overdue.\n\nCould you please share an ETA for payment or let me know if there's an issue?\n\nBest,\n{{userName}}`,
    day_14: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} is now two weeks overdue (due ${dueDate}).\n\nI need to resolve this soon. Can you let me know when payment will be sent, or if there's something I should know about?\n\nRegards,\n{{userName}}`,
  },
  firm: {
    day_1: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} was due on ${dueDate} and is now overdue. Please arrange payment at your earliest convenience.\n\nThank you,\n{{userName}}`,
    day_7: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nThis is a formal reminder that invoice #${invoiceNumber} for $${amount} is now one week past due (due date: ${dueDate}).\n\nPlease provide payment or an update by end of week.\n\nRegards,\n{{userName}}`,
    day_14: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} is now two weeks overdue.\n\nIf payment is not received soon, I may need to pause further work until this is settled. Please contact me immediately.\n\nRegards,\n{{userName}}`,
  },
  final: {
    day_1: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} is overdue as of ${dueDate}. This is a final notice before escalation.\n\nPlease confirm payment immediately.\n\n{{userName}}`,
    day_7: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} is now one week overdue. This is a final notice.\n\nPayment is required immediately to avoid further action.\n\n{{userName}}`,
    day_14: (clientName, invoiceNumber, amount, dueDate) =>
      `Hi ${clientName},\n\nInvoice #${invoiceNumber} for $${amount} is now two weeks overdue.\n\nThis is a final demand for payment. If we do not receive payment or hear from you by [date], I will need to consider next steps.\n\n{{userName}}`,
  },
};

function getTemplate(tone, stage, clientName, invoiceNumber, amount, dueDate, userName) {
  const toneTemplates = EMAIL_TEMPLATES[tone] || EMAIL_TEMPLATES.polite;
  const template = toneTemplates[stage] || toneTemplates.day_1;
  return template(clientName, invoiceNumber, amount, dueDate).replace('{{userName}}', userName || 'Your freelancer');
}

function getSubject(stage, invoiceNumber) {
  const stageMap = {
    day_1: `Friendly reminder: Invoice ${invoiceNumber}`,
    day_7: `Following up: Invoice ${invoiceNumber} is overdue`,
    day_14: `Action required: Invoice ${invoiceNumber}`,
  };
  return stageMap[stage] || `Reminder: Invoice ${invoiceNumber}`;
}

function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

async function sendEmail(resend, to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Invoice Chaser <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('Starting daily reminder check...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all pending invoices with auto_follow_up enabled
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select(`
      *,
      clients (name, email, tone)
    `)
    .eq('status', 'pending')
    .eq('auto_follow_up', true)
    .lt('due_date', today.toISOString().split('T')[0]);

  if (invoicesError) {
    console.error('Error fetching invoices:', invoicesError);
    Deno.exit(1);
  }

  if (!invoices || invoices.length === 0) {
    console.log('No overdue invoices with auto follow-up found.');
    return;
  }

  console.log(`Found ${invoices.length} overdue invoice(s) to check.`);

  // Get user profile for sender name
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');

  for (const invoice of invoices) {
    const client = invoice.clients;
    if (!client) continue;

    const userProfile = profiles?.find(p => p.id === invoice.user_id);
    const userName = userProfile?.full_name || userProfile?.email || 'Your freelancer';

    const dueDate = new Date(invoice.due_date);
    const daysPastDue = daysBetween(today, dueDate);

    // Find which reminder stage applies
    const applicableStage = REMINDER_STAGES.find(s => daysPastDue >= s.daysPastDue);

    if (!applicableStage) continue;

    // Check if this stage was already sent
    const { data: existingLogs } = await supabase
      .from('follow_up_logs')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('reminder_stage', applicableStage.stage);

    if (existingLogs && existingLogs.length > 0) {
      continue; // Already sent this stage
    }

    // Check if a more recent stage was already sent (don't go backwards)
    const { data: allLogs } = await supabase
      .from('follow_up_logs')
      .select('reminder_stage, sent_at')
      .eq('invoice_id', invoice.id)
      .order('sent_at', { ascending: false })
      .limit(1);

    const lastStage = allLogs?.[0]?.reminder_stage;
    const stageOrder = { day_1: 1, day_7: 2, day_14: 3 };
    if (lastStage && stageOrder[lastStage] >= stageOrder[applicableStage.stage]) {
      continue; // Already sent this or a later stage
    }

    // Compose email
    const subject = getSubject(applicableStage.stage, invoice.invoice_number);
    const body = getTemplate(
      client.tone,
      applicableStage.stage,
      client.name,
      invoice.invoice_number,
      Number(invoice.amount).toLocaleString(),
      invoice.due_date,
      userName
    );

    try {
      await sendEmail(null, client.email, subject, body.replace(/\n/g, '<br>'));

      // Log the follow-up
      await supabase.from('follow_up_logs').insert({
        user_id: invoice.user_id,
        invoice_id: invoice.id,
        reminder_stage: applicableStage.stage,
        email_sent_to: client.email,
        email_subject: subject,
      });

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          last_reminder_sent: new Date().toISOString(),
          reminder_count: (invoice.reminder_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      console.log(`Sent ${applicableStage.stage} reminder to ${client.email} for invoice ${invoice.invoice_number}`);
    } catch (err) {
      console.error(`Failed to send reminder for invoice ${invoice.id}:`, err.message);
    }
  }

  console.log('Daily reminder check complete.');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  Deno.exit(1);
});