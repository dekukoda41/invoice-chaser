// ==================== Invoice Chaser — Frontend App ====================
// Supabase config — replace with your values from Supabase Settings → API
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Plan limits
const PLAN_LIMITS = {
  free: { maxInvoices: 10, price: 0 },
  pro: { maxInvoices: Infinity, price: 15 },
};

// Stripe checkout link for Pro upgrade
const STRIPE_PRO_LINK = 'https://buy.stripe.com/test_4gw28n6s81R94e8aAA';

// ==================== DOM Elements ====================
const authContainer = document.getElementById('authContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const upgradeBanner = document.getElementById('upgradeBanner');
const authForm = document.getElementById('authForm');
const authBtn = document.getElementById('authBtn');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const toggleAuth = document.getElementById('toggleAuth');
const logoutBtn = document.getElementById('logoutBtn');
const addInvoiceForm = document.getElementById('addInvoiceForm');
const addClientForm = document.getElementById('addClientForm');
const invoiceTableBody = document.getElementById('invoiceTableBody');
const emptyState = document.getElementById('emptyState');
const invoiceClientSelect = document.getElementById('invoiceClient');
const statOverdue = document.getElementById('statOverdue');
const statExpected = document.getElementById('statExpected');
const statReminders = document.getElementById('statReminders');

// State
let isSignUpMode = false;
let currentUser = null;
let userPlan = 'free'; // default plan

// ==================== Toast ====================
function toast(message, type = 'success') {
  // Remove existing toast
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'toast';
  el.className = `show ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ==================== Loading State Helpers ====================
function setBtnLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Please wait...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}

// ==================== Auth ====================
async function handleAuth(e) {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;

  setBtnLoading(authBtn, true);

  try {
    if (isSignUpMode) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast('Account created! Please sign in.');
      toggleAuthClick();
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadDashboard();
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBtnLoading(authBtn, false);
  }
}

function toggleAuthClick() {
  isSignUpMode = !isSignUpMode;
  authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
  toggleAuth.textContent = isSignUpMode
    ? 'Already have an account? Sign in'
    : "Don't have an account? Sign up";
}

async function loadDashboard() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  currentUser = data.user;

  // Create profile if missing
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (!profile) {
    await supabase.from('profiles').insert({
      id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.email.split('@')[0],
      plan: 'free',
    });
    userPlan = 'free';
  } else {
    userPlan = profile.plan || 'free';
  }

  // Show/hide upgrade banner based on plan
  if (upgradeBanner) {
    upgradeBanner.style.display = userPlan === 'free' ? 'block' : 'none';
  }

  authContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  await loadClients();
  await loadInvoices();
  await updateStats();
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  userPlan = 'free';
  authContainer.classList.remove('hidden');
  dashboardContainer.classList.add('hidden');
  authForm.reset();
}

// ==================== Plan Enforcement ====================
function canAddInvoice(invoiceCount) {
  const limit = PLAN_LIMITS[userPlan].maxInvoices;
  return invoiceCount < limit;
}

function getUpgradeMessage() {
  if (userPlan === 'free') {
    return 'Free plan limit reached (10 invoices). Upgrade to Pro for unlimited invoices.';
  }
  return '';
}

// ==================== Clients ====================
async function loadClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return;

  invoiceClientSelect.innerHTML = '<option value="">Select a client</option>';
  data.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    invoiceClientSelect.appendChild(opt);
  });
}

addClientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setBtnLoading(btn, true);

  const { error } = await supabase.from('clients').insert({
    user_id: currentUser.id,
    name: document.getElementById('clientName').value,
    email: document.getElementById('clientEmail').value,
    tone: document.getElementById('clientTone').value,
  });

  if (error) {
    toast(error.message, 'error');
  } else {
    addClientForm.reset();
    await loadClients();
    toast('Client added');
  }

  setBtnLoading(btn, false);
});

// ==================== Invoices ====================
async function loadInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`, clients (*)`)
    .order('created_at', { ascending: false });

  if (error || !data) {
    invoiceTableBody.innerHTML =
      '<tr><td colspan="7" class="p-6 text-center text-gray-500">Error loading invoices</td></tr>';
    return;
  }

  invoiceTableBody.innerHTML = '';

  if (data.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  data.forEach(inv => {
    const client = inv.clients;
    const isOverdue = inv.status === 'pending' && new Date(inv.due_date) < new Date();
    const statusClass =
      inv.status === 'paid'
        ? 'bg-green-100 text-green-700'
        : isOverdue
          ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700';
    const statusText = isOverdue ? 'Overdue' : inv.status.charAt(0).toUpperCase() + inv.status.slice(1);

    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 transition';
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${inv.invoice_number}</td>
      <td class="px-6 py-4 whitespace-nowrap text-gray-700">${client ? client.name : 'Unknown'}</td>
      <td class="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">$${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="px-6 py-4 whitespace-nowrap text-gray-700">${new Date(inv.due_date).toLocaleDateString()}</td>
      <td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span></td>
      <td class="px-6 py-4 whitespace-nowrap text-gray-600">${inv.reminder_count || 0}</td>
      <td class="px-6 py-4 whitespace-nowrap text-right">
        <button onclick="markPaid('${inv.id}')" class="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Mark Paid</button>
      </td>
    `;
    invoiceTableBody.appendChild(row);
  });
}

window.markPaid = async (id) => {
  if (!confirm('Mark this invoice as paid? Reminders will stop automatically.')) return;

  const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
  if (error) {
    toast(error.message, 'error');
    return;
  }
  toast('Marked as paid — reminders will stop.');
  await loadInvoices();
  await updateStats();
};

addInvoiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setBtnLoading(btn, true);

  // Check plan limit
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  const pendingCount = existing ? existing.length : 0;
  if (!canAddInvoice(pendingCount)) {
    setBtnLoading(btn, false);
    toast(getUpgradeMessage(), 'error');
    return;
  }

  const { error } = await supabase.from('invoices').insert({
    user_id: currentUser.id,
    client_id: document.getElementById('invoiceClient').value,
    invoice_number: document.getElementById('invoiceNumber').value,
    amount: parseFloat(document.getElementById('invoiceAmount').value),
    due_date: document.getElementById('invoiceDueDate').value,
    auto_follow_up: document.getElementById('invoiceAutoFollowUp').checked,
  });

  if (error) {
    toast(error.message, 'error');
  } else {
    addInvoiceForm.reset();
    document.getElementById('invoiceAutoFollowUp').checked = true;
    await loadInvoices();
    await updateStats();
    toast('Invoice added — follow-ups scheduled.');
  }

  setBtnLoading(btn, false);
});

// ==================== Stats ====================
async function updateStats() {
  const { data } = await supabase
    .from('invoices')
    .select('amount, status, reminder_count')
    .eq('user_id', currentUser.id);

  if (!data) return;

  const overdue = data.filter(i => i.status === 'pending' && new Date(i.due_date) < new Date());
  const pending = data.filter(i => i.status === 'pending');

  const overdueTotal = overdue.reduce((sum, i) => sum + Number(i.amount), 0);
  const expectedTotal = pending.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalReminders = data.reduce((sum, i) => sum + (i.reminder_count || 0), 0);

  statOverdue.textContent = '$' + overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
  statExpected.textContent = '$' + expectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
  statReminders.textContent = totalReminders;
}

// ==================== FAQ Toggle ====================
window.toggleFaq = (btn) => {
  const chevron = btn.querySelector('svg');
  const content = btn.nextElementSibling;
  const isOpen = !content.classList.contains('hidden');

  if (isOpen) {
    content.classList.add('hidden');
    chevron.classList.remove('rotate-180');
  } else {
    content.classList.remove('hidden');
    chevron.classList.add('rotate-180');
  }
};

// ==================== Listeners ====================
authForm.addEventListener('submit', handleAuth);
toggleAuth.addEventListener('click', toggleAuthClick);
logoutBtn.addEventListener('click', logout);

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    await loadDashboard();
  } else {
    authContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
  }
});