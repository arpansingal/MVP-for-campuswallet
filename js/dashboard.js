// ============================================================
// CampusWallet — Dashboard Logic
// ============================================================

let currentUser = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear  = new Date().getFullYear();
let donutChart = null;
let barChart   = null;

// Colour map for categories
const CAT_COLORS = {
  food:          '#ef4444',
  rent:          '#a855f7',
  books:         '#06b6d4',
  transport:     '#f59e0b',
  entertainment: '#ec4899',
  health:        '#10b981',
  other:         '#94a3b8',
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  populateSidebarUser();
  initSidebarToggle();

  // Set today's date on expense form
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];

  // Header date
  document.getElementById('headerDate').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  updateMonthLabel();
  loadDashboard();
});

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent =
    getMonthName(currentMonth) + ' ' + currentYear;
  const el = document.getElementById('budgetMonthLabel');
  if (el) el.textContent = getMonthName(currentMonth) + ' ' + currentYear;
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth > 12) { currentMonth = 1;  currentYear++; }
  if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
  updateMonthLabel();
  loadDashboard();
}

// ---- Load all dashboard data ----
async function loadDashboard() {
  document.getElementById('pageBody').innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const [expenses, budget, goals] = await Promise.all([
    fetchExpenses(),
    fetchBudget(),
    fetchGoals(),
  ]);

  renderDashboard(expenses, budget, goals);
}

async function fetchExpenses() {
  const startDate = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`;
  const endDate   = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]; // last day of month
  const { data, error } = await supabaseClient
    .from('expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  if (error) console.error(error);
  return data || [];
}

async function fetchBudget() {
  const { data } = await supabaseClient
    .from('budgets')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('month', currentMonth)
    .eq('year',  currentYear)
    .single();
  return data;
}

async function fetchGoals() {
  const { data } = await supabaseClient
    .from('savings_goals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(3);
  return data || [];
}

// ---- Render ----
function renderDashboard(expenses, budget, goals) {
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const budgetAmt  = budget ? Number(budget.amount) : 0;
  const remaining  = budgetAmt - totalSpent;
  const pct        = budgetAmt > 0 ? Math.min((totalSpent / budgetAmt) * 100, 100) : 0;
  const pctClass   = pct >= 90 ? 'danger' : pct >= 70 ? '' : 'safe';

  // Category breakdown
  const catTotals = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });

  const html = `
    <!-- Budget setup prompt if no budget set -->
    ${!budget ? `
    <div class="budget-setup" style="margin-bottom:24px;">
      <div class="budget-setup-text">
        <h4>📅 Set your ${getMonthName(currentMonth)} budget</h4>
        <p>Track how much you're spending this month</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSetBudgetModal()">Set Budget</button>
    </div>` : ''}

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card purple">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Monthly Budget</div>
        <div class="stat-value">${budgetAmt > 0 ? formatCurrency(budgetAmt) : '—'}</div>
        ${budget ? `<div class="stat-sub">${getMonthName(currentMonth)} ${currentYear}</div>` : '<div class="stat-sub" style="color:var(--amber)">Not set</div>'}
        ${budget ? `<button onclick="openSetBudgetModal()" style="font-size:0.7rem;color:var(--text-muted);background:none;border:none;cursor:pointer;margin-top:2px;padding:0;font-family:var(--font);">Edit</button>` : ''}
      </div>
      <div class="stat-card ${pct >= 90 ? 'red' : 'cyan'}">
        <div class="stat-icon">💸</div>
        <div class="stat-label">Total Spent</div>
        <div class="stat-value">${formatCurrency(totalSpent)}</div>
        <div class="stat-sub">${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card ${remaining < 0 ? 'red' : 'green'}">
        <div class="stat-icon">${remaining < 0 ? '⚠️' : '🟢'}</div>
        <div class="stat-label">Remaining</div>
        <div class="stat-value">${budgetAmt > 0 ? formatCurrency(Math.abs(remaining)) : '—'}</div>
        <div class="stat-sub">${remaining < 0 ? 'Over budget!' : budgetAmt > 0 ? 'Left to spend' : 'Set budget first'}</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🎯</div>
        <div class="stat-label">Active Goals</div>
        <div class="stat-value">${goals.length}</div>
        <div class="stat-sub"><a href="goals.html" style="color:var(--amber);font-size:0.75rem;">View all →</a></div>
      </div>
    </div>

    <!-- Budget progress bar -->
    ${budget ? `
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-size:0.95rem;font-weight:700;">Budget Progress — ${getMonthName(currentMonth)}</span>
        <span style="font-size:0.85rem;color:${pct>=90?'var(--red)':'var(--text-secondary)'};">${pct.toFixed(0)}% used</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${pctClass}" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:0.8rem;color:var(--text-muted);">
        <span>Spent: <strong style="color:var(--text-primary);">${formatCurrency(totalSpent)}</strong></span>
        <span>Budget: <strong style="color:var(--text-primary);">${formatCurrency(budgetAmt)}</strong></span>
      </div>
    </div>` : ''}

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Spending by Category</div>
        ${Object.keys(catTotals).length === 0
          ? '<div class="empty-state"><div class="empty-icon">📊</div><p>No expenses this month</p></div>'
          : '<div class="chart-wrap"><canvas id="donutChart"></canvas></div>'}
      </div>
      <div class="chart-card">
        <div class="chart-title">Daily Spending</div>
        ${expenses.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📈</div><p>No expenses this month</p></div>'
          : '<div class="chart-wrap"><canvas id="barChart"></canvas></div>'}
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="card" style="margin-bottom:24px;">
      <div class="section-header">
        <span class="section-title">Recent Expenses</span>
        <a href="transactions.html" class="btn btn-outline btn-sm">View All</a>
      </div>
      ${expenses.length === 0
        ? '<div class="empty-state"><div class="empty-icon">🧾</div><h3>No expenses yet</h3><p>Click "+ Add Expense" to log your first one.</p></div>'
        : `<div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Action</th>
            </tr></thead>
            <tbody>
              ${expenses.slice(0,5).map(e => `
              <tr>
                <td style="color:var(--text-muted);white-space:nowrap;">${formatDate(e.date)}</td>
                <td>${e.description || '—'}</td>
                <td>${getCatChip(e.category)}</td>
                <td style="text-align:right;font-weight:700;color:var(--red);">−${formatCurrency(e.amount)}</td>
                <td style="text-align:right;">
                  <button onclick="openDeleteExpenseModal('${e.id}')" style="font-size:0.75rem;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:2px 6px;font-family:var(--font);" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-muted)'">🗑 Delete</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
    </div>

    <!-- Savings Goals -->
    ${goals.length > 0 ? `
    <div class="card">
      <div class="section-header">
        <span class="section-title">Savings Goals</span>
        <a href="goals.html" class="btn btn-outline btn-sm">Manage Goals</a>
      </div>
      <div class="goals-grid">
        ${goals.map(g => {
          const pct = g.target_amount > 0 ? Math.min((g.saved_amount / g.target_amount) * 100, 100) : 0;
          return `
          <div class="goal-card">
            <div class="goal-header">
              <div>
                <div class="goal-name">${g.name}</div>
                ${g.deadline ? `<div class="goal-deadline">📅 By ${formatDate(g.deadline)}</div>` : ''}
              </div>
              <span class="badge badge-purple">${pct.toFixed(0)}%</span>
            </div>
            <div class="goal-amounts">
              <span class="goal-saved">${formatCurrency(g.saved_amount)} saved</span>
              <span class="goal-target">of ${formatCurrency(g.target_amount)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill safe" style="width:${pct}%"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;

  document.getElementById('pageBody').innerHTML = html;

  // Render charts
  if (Object.keys(catTotals).length > 0) renderDonutChart(catTotals);
  if (expenses.length > 0) renderBarChart(expenses);
}

function renderDonutChart(catTotals) {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;
  if (donutChart) donutChart.destroy();
  const labels = Object.keys(catTotals).map(k => CATEGORIES[k]?.label || k);
  const values = Object.values(catTotals);
  const colors = Object.keys(catTotals).map(k => CAT_COLORS[k] || '#94a3b8');

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}` } }
      }
    }
  });
}

function renderBarChart(expenses) {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  if (barChart) barChart.destroy();

  // Aggregate by day
  const dayMap = {};
  expenses.forEach(e => {
    const d = e.date;
    dayMap[d] = (dayMap[d] || 0) + Number(e.amount);
  });
  const sorted = Object.keys(dayMap).sort();
  const labels = sorted.map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  const values = sorted.map(d => dayMap[d]);

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spent (₹)',
        data: values,
        backgroundColor: 'rgba(124,58,237,0.6)',
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '₹'+v }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ---- Add Expense ----
function openAddExpenseModal() {
  document.getElementById('addExpenseModal').classList.add('active');
}
function closeAddExpenseModal() {
  document.getElementById('addExpenseModal').classList.remove('active');
  document.getElementById('addExpenseForm').reset();
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
}

async function handleAddExpense(e) {
  e.preventDefault();
  const btn = document.getElementById('addExpBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { error } = await supabaseClient.from('expenses').insert({
    user_id:     currentUser.id,
    amount:      parseFloat(document.getElementById('expAmount').value),
    category:    document.getElementById('expCategory').value,
    description: document.getElementById('expDescription').value.trim() || null,
    date:        document.getElementById('expDate').value,
  });

  btn.disabled = false; btn.textContent = 'Add Expense';
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Expense added!', 'success');
  closeAddExpenseModal();
  loadDashboard();
}

// ---- Set Budget ----
function openSetBudgetModal() {
  document.getElementById('setBudgetModal').classList.add('active');
  document.getElementById('budgetMonthLabel').textContent = getMonthName(currentMonth) + ' ' + currentYear;
}

async function handleSetBudget(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  const { error } = await supabaseClient.from('budgets').upsert({
    user_id: currentUser.id,
    month:   currentMonth,
    year:    currentYear,
    amount,
  }, { onConflict: 'user_id,month,year' });

  document.getElementById('setBudgetModal').classList.remove('active');
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Budget set!', 'success');
  document.getElementById('setBudgetForm').reset();
  loadDashboard();
}

// ---- Delete Expense ----
let deleteExpenseTargetId = null;
function openDeleteExpenseModal(id) {
  deleteExpenseTargetId = id;
  document.getElementById('deleteExpenseModal').classList.add('active');
}
function closeDeleteExpenseModal() {
  deleteExpenseTargetId = null;
  document.getElementById('deleteExpenseModal').classList.remove('active');
}
async function confirmDeleteExpense() {
  if (!deleteExpenseTargetId) return;
  const { error } = await supabaseClient.from('expenses').delete().eq('id', deleteExpenseTargetId);
  closeDeleteExpenseModal();
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Expense deleted.', 'info');
  loadDashboard();
}
