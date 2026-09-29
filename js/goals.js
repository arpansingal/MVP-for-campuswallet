// ============================================================
// CampusWallet — Savings Goals Logic
// ============================================================

let currentUser   = null;
let addToGoalId   = null;
let deleteGoalId  = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  populateSidebarUser();
  initSidebarToggle();
  loadGoals();
});

async function loadGoals() {
  document.getElementById('goalsGrid').innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const { data, error } = await supabaseClient
    .from('savings_goals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { showToast(error.message, 'error'); return; }
  renderStats(data || []);
  renderGoals(data || []);
}

function renderStats(goals) {
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalSaved  = goals.reduce((s, g) => s + Number(g.saved_amount), 0);
  const completed   = goals.filter(g => Number(g.saved_amount) >= Number(g.target_amount)).length;

  document.getElementById('goalsStats').innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:0;">
      <div class="stat-card green">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total Saved</div>
        <div class="stat-value">${formatCurrency(totalSaved)}</div>
        <div class="stat-sub">across all goals</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-icon">🎯</div>
        <div class="stat-label">Total Target</div>
        <div class="stat-value">${formatCurrency(totalTarget)}</div>
        <div class="stat-sub">${goals.length} active goal${goals.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Completed</div>
        <div class="stat-value">${completed}</div>
        <div class="stat-sub">goal${completed !== 1 ? 's' : ''} achieved</div>
      </div>
    </div>
  `;
}

function renderGoals(goals) {
  if (goals.length === 0) {
    document.getElementById('goalsGrid').innerHTML = `
      <div class="empty-state" style="padding:80px 20px;">
        <div class="empty-icon">🎯</div>
        <h3>No savings goals yet</h3>
        <p>Click "+ New Goal" to set your first savings target.</p>
      </div>`;
    return;
  }

  const html = `
    <div class="goals-grid">
      ${goals.map(g => {
        const saved  = Number(g.saved_amount);
        const target = Number(g.target_amount);
        const pct    = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
        const done   = saved >= target;
        const remaining = Math.max(target - saved, 0);

        // Days left
        let daysLeftHtml = '';
        if (g.deadline) {
          const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / (1000*60*60*24));
          daysLeftHtml = daysLeft > 0
            ? `<span style="font-size:0.75rem;color:${daysLeft<14?'var(--amber)':'var(--text-muted)'};">📅 ${daysLeft} days left</span>`
            : `<span style="font-size:0.75rem;color:var(--red);">⚠️ Deadline passed</span>`;
        }

        return `
        <div class="goal-card" style="${done ? 'border-color:rgba(16,185,129,0.4);background:rgba(16,185,129,0.04);' : ''}">
          <div class="goal-header">
            <div>
              <div class="goal-name">${done ? '✅ ' : ''}${g.name}</div>
              ${daysLeftHtml}
            </div>
            <span class="badge ${done ? 'badge-green' : 'badge-purple'}">${pct.toFixed(0)}%</span>
          </div>

          <div class="goal-amounts">
            <span class="goal-saved">${formatCurrency(saved)} saved</span>
            <span class="goal-target">of ${formatCurrency(target)}</span>
          </div>
          <div class="progress-bar" style="margin-bottom:8px;">
            <div class="progress-fill safe" style="width:${pct}%;background:${done?'var(--green)':'linear-gradient(90deg,var(--purple),var(--cyan))'};"></div>
          </div>
          ${!done ? `<div style="font-size:0.75rem;color:var(--text-muted);">${formatCurrency(remaining)} more to go</div>` : `<div style="font-size:0.75rem;color:var(--green);font-weight:700;">🎉 Goal reached!</div>`}

          <div class="goal-actions">
            ${!done ? `<button class="btn btn-success btn-sm" onclick="openAddToGoal('${g.id}','${g.name.replace(/'/g,"\\'")}')">+ Add Savings</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="openDeleteGoalModal('${g.id}')" style="color:var(--red);border-color:var(--red-glow);">🗑 Delete</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  document.getElementById('goalsGrid').innerHTML = html;
}

// ---- New Goal ----
function openNewGoalModal() {
  document.getElementById('newGoalModal').classList.add('active');
}
function closeNewGoalModal() {
  document.getElementById('newGoalModal').classList.remove('active');
  document.getElementById('goalForm').reset();
}
async function handleNewGoal(e) {
  e.preventDefault();
  const btn = document.getElementById('goalSubmitBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const savedVal = parseFloat(document.getElementById('gSaved').value) || 0;
  const { error } = await supabaseClient.from('savings_goals').insert({
    user_id:       currentUser.id,
    name:          document.getElementById('gName').value.trim(),
    target_amount: parseFloat(document.getElementById('gTarget').value),
    saved_amount:  savedVal,
    deadline:      document.getElementById('gDeadline').value || null,
  });

  btn.disabled = false; btn.textContent = 'Create Goal';
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Goal created! 🎯', 'success');
  closeNewGoalModal();
  loadGoals();
}

// ---- Add to Goal ----
function openAddToGoal(id, name) {
  addToGoalId = id;
  document.getElementById('addToGoalTitle').textContent = '+ Add to: ' + name;
  document.getElementById('addToGoalModal').classList.add('active');
}
function closeAddToGoalModal() {
  addToGoalId = null;
  document.getElementById('addToGoalModal').classList.remove('active');
  document.getElementById('addToGoalForm').reset();
}
async function handleAddToGoal(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('addAmt').value);
  if (!addToGoalId || !amount) return;

  // Fetch current saved_amount
  const { data: goal } = await supabaseClient.from('savings_goals').select('saved_amount,target_amount').eq('id', addToGoalId).single();
  const newSaved = Math.min(Number(goal.saved_amount) + amount, Number(goal.target_amount));

  const { error } = await supabaseClient.from('savings_goals').update({ saved_amount: newSaved }).eq('id', addToGoalId);
  closeAddToGoalModal();
  if (error) { showToast(error.message, 'error'); return; }
  showToast(`${formatCurrency(amount)} added to goal! 💰`, 'success');
  loadGoals();
}

// ---- Delete Goal ----
function openDeleteGoalModal(id) {
  deleteGoalId = id;
  document.getElementById('deleteGoalModal').classList.add('active');
}
function closeDeleteGoalModal() {
  deleteGoalId = null;
  document.getElementById('deleteGoalModal').classList.remove('active');
}
async function confirmDeleteGoal() {
  if (!deleteGoalId) return;
  const { error } = await supabaseClient.from('savings_goals').delete().eq('id', deleteGoalId);
  closeDeleteGoalModal();
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Goal deleted.', 'info');
  loadGoals();
}
