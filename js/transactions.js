// ============================================================
// CampusWallet — Transactions (Expenses) Logic
// ============================================================

let currentUser  = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear  = new Date().getFullYear();
let activeFilter = 'all';
let allExpenses  = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  populateSidebarUser();
  initSidebarToggle();
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  updateMonthLabel();
  loadExpenses();
});

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = getMonthName(currentMonth) + ' ' + currentYear;
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) { currentMonth = 1;  currentYear++; }
  if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
  updateMonthLabel();
  loadExpenses();
}

function setFilter(cat) {
  activeFilter = cat;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  renderExpenses();
}

async function loadExpenses() {
  document.getElementById('expenseList').innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const startDate = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`;
  const endDate   = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

  const { data, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) { showToast(error.message, 'error'); return; }
  allExpenses = data || [];
  renderSummary();
  renderExpenses();
}

function renderSummary() {
  const total = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const catTotals = {};
  allExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount); });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('summaryStrip').innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));">
      <div class="stat-card cyan">
        <div class="stat-icon">💸</div>
        <div class="stat-label">Total Spent</div>
        <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(total)}</div>
        <div class="stat-sub">${allExpenses.length} expenses</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon">📊</div>
        <div class="stat-label">Top Category</div>
        <div class="stat-value" style="font-size:1.1rem;">${topCat ? (CATEGORIES[topCat[0]]?.emoji + ' ' + CATEGORIES[topCat[0]]?.label) : '—'}</div>
        <div class="stat-sub">${topCat ? formatCurrency(topCat[1]) : 'No expenses'}</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">📅</div>
        <div class="stat-label">Daily Average</div>
        <div class="stat-value" style="font-size:1.4rem;">${total > 0 ? formatCurrency(total / new Date(currentYear, currentMonth, 0).getDate()) : '—'}</div>
        <div class="stat-sub">per day this month</div>
      </div>
    </div>
  `;
}

function renderExpenses() {
  const filtered = activeFilter === 'all' ? allExpenses : allExpenses.filter(e => e.category === activeFilter);

  if (filtered.length === 0) {
    document.getElementById('expenseList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <h3>No expenses found</h3>
        <p>${activeFilter !== 'all' ? 'No expenses in this category.' : 'Click "+ Add Expense" to log your first one.'}</p>
      </div>`;
    return;
  }

  // Group by date
  const grouped = {};
  filtered.forEach(e => {
    grouped[e.date] = grouped[e.date] || [];
    grouped[e.date].push(e);
  });
  const sortedDates = Object.keys(grouped).sort().reverse();

  const html = sortedDates.map(date => {
    const dayTotal = grouped[date].reduce((s, e) => s + Number(e.amount), 0);
    return `
      <div style="padding:14px 20px 4px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">${formatDate(date)}</span>
        <span style="font-size:0.8rem;font-weight:700;color:var(--red);">−${formatCurrency(dayTotal)}</span>
      </div>
      ${grouped[date].map(e => `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.03);transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <div style="width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:var(--bg-input);flex-shrink:0;">
          ${CATEGORIES[e.category]?.emoji || '📦'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.9rem;font-weight:600;">${e.description || CATEGORIES[e.category]?.label || 'Expense'}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${getCatChip(e.category)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:1rem;font-weight:700;color:var(--red);">−${formatCurrency(e.amount)}</div>
          <button onclick="openDeleteModal('${e.id}')" style="font-size:0.7rem;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:2px;font-family:var(--font);transition:color 0.15s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-muted)'">
            🗑 Delete
          </button>
        </div>
      </div>`).join('')}
    `;
  }).join('');

  document.getElementById('expenseList').innerHTML = html;
}

// ---- Modal ----
function openModal() {
  document.getElementById('addModal').classList.add('active');
}
function closeModal() {
  document.getElementById('addModal').classList.remove('active');
  document.getElementById('expenseForm').reset();
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
}

async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { error } = await supabaseClient.from('expenses').insert({
    user_id:     currentUser.id,
    amount:      parseFloat(document.getElementById('fAmount').value),
    category:    document.getElementById('fCategory').value,
    description: document.getElementById('fDesc').value.trim() || null,
    date:        document.getElementById('fDate').value,
  });

  btn.disabled = false; btn.textContent = 'Add Expense';
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Expense added!', 'success');
  closeModal();
  loadExpenses();
}

// ---- Delete ----
function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').classList.add('active');
}
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').classList.remove('active');
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  const { error } = await supabaseClient.from('expenses').delete().eq('id', deleteTargetId);
  closeDeleteModal();
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Expense deleted.', 'info');
  loadExpenses();
}
