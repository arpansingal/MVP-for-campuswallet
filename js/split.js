// ============================================================
// CampusWallet — Split Bills Logic
// ============================================================

let currentUser   = null;
let deleteSplitId = null;
let participantCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;
  populateSidebarUser();
  initSidebarToggle();
  loadSplits();
});

// ---- Load Splits ----
async function loadSplits() {
  document.getElementById('splitsList').innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  const { data: splits, error } = await supabaseClient
    .from('splits')
    .select('*, split_participants(*)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { showToast(error.message, 'error'); return; }
  renderStats(splits || []);
  renderSplits(splits || []);
}

function renderStats(splits) {
  const totalAmount = splits.reduce((s, sp) => s + Number(sp.total_amount), 0);
  const unpaidAmt = splits.reduce((s, sp) => {
    return s + sp.split_participants.filter(p => !p.paid).reduce((a, p) => a + Number(p.amount_owed), 0);
  }, 0);
  const paidAmt = totalAmount - unpaidAmt;

  document.getElementById('splitStats').innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:0;">
      <div class="stat-card purple">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Total Splits</div>
        <div class="stat-value">${splits.length}</div>
        <div class="stat-sub">all time</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">⏳</div>
        <div class="stat-label">Pending</div>
        <div class="stat-value">${formatCurrency(unpaidAmt)}</div>
        <div class="stat-sub">yet to be settled</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Settled</div>
        <div class="stat-value">${formatCurrency(paidAmt)}</div>
        <div class="stat-sub">already paid</div>
      </div>
    </div>
  `;
}

function renderSplits(splits) {
  if (splits.length === 0) {
    document.getElementById('splitsList').innerHTML = `
      <div class="empty-state" style="padding:80px 20px;">
        <div class="empty-icon">👥</div>
        <h3>No splits yet</h3>
        <p>Click "+ New Split" to divide a bill with friends or roommates.</p>
      </div>`;
    return;
  }

  const html = `
    <div class="splits-list">
      ${splits.map(sp => {
        const participants = sp.split_participants || [];
        const totalOwed = participants.reduce((s, p) => s + Number(p.amount_owed), 0);
        const totalPaid = participants.filter(p => p.paid).reduce((s, p) => s + Number(p.amount_owed), 0);
        const allPaid   = participants.length > 0 && participants.every(p => p.paid);

        return `
        <div class="split-card" style="${allPaid?'border-color:rgba(16,185,129,0.3);':''}">
          <div class="split-header">
            <div>
              <div class="split-title">${allPaid ? '✅ ' : ''}${sp.title}</div>
              <div class="split-date">${formatDate(sp.created_at.split('T')[0])}</div>
            </div>
            <button onclick="openDeleteSplitModal('${sp.id}')" class="btn btn-sm btn-outline" style="color:var(--red);border-color:transparent;padding:4px 8px;font-size:1rem;">🗑</button>
          </div>

          <div class="split-total">
            Total: <span>${formatCurrency(sp.total_amount)}</span>
            ${allPaid ? '' : ` · <span style="color:var(--amber);">${formatCurrency(totalOwed - totalPaid)} pending</span>`}
          </div>

          <div class="participants-list">
            ${participants.length === 0
              ? `<div style="color:var(--text-muted);font-size:0.85rem;">No participants added.</div>`
              : participants.map(p => `
              <div class="participant-row">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:28px;height:28px;border-radius:50%;background:var(--purple-glow);display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:var(--purple-light);">
                    ${p.name.charAt(0).toUpperCase()}
                  </div>
                  <span class="participant-name">${p.name}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="participant-amt">${formatCurrency(p.amount_owed)}</span>
                  <button class="participant-paid ${p.paid ? 'paid' : 'unpaid'}"
                    onclick="togglePaid('${p.id}', ${p.paid})">
                    ${p.paid ? '✓ Paid' : '✗ Unpaid'}
                  </button>
                </div>
              </div>`).join('')}
          </div>

          ${participants.length > 0 ? `
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);">
            <span>${participants.filter(p=>p.paid).length} of ${participants.length} settled</span>
            <span style="color:var(--green);">${formatCurrency(totalPaid)} paid · ${formatCurrency(totalOwed - totalPaid)} left</span>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;

  document.getElementById('splitsList').innerHTML = html;
}

// ---- Toggle Paid ----
async function togglePaid(participantId, currentPaid) {
  const { error } = await supabaseClient
    .from('split_participants')
    .update({ paid: !currentPaid })
    .eq('id', participantId);
  if (error) { showToast(error.message, 'error'); return; }
  showToast(!currentPaid ? 'Marked as paid ✓' : 'Marked as unpaid', 'info');
  loadSplits();
}

// ---- New Split Modal ----
function openNewSplitModal() {
  participantCount = 0;
  document.getElementById('participantRows').innerHTML = '';
  document.getElementById('splitPreview').textContent  = '';
  document.getElementById('sTitle').value  = '';
  document.getElementById('sTotal').value  = '';
  // Add 2 default participant rows
  addParticipantRow();
  addParticipantRow();
  document.getElementById('newSplitModal').classList.add('active');
}
function closeNewSplitModal() {
  document.getElementById('newSplitModal').classList.remove('active');
}

function addParticipantRow() {
  participantCount++;
  const idx = participantCount;
  const row = document.createElement('div');
  row.id = `pRow${idx}`;
  row.style.cssText = 'display:flex;gap:10px;align-items:center;';
  row.innerHTML = `
    <input type="text" class="form-input participant-name" placeholder="Name (e.g. Rahul)"
      style="flex:1;" oninput="recalcSplit()">
    <input type="number" class="form-input participant-custom-amt" placeholder="₹ (auto)"
      style="width:110px;" min="0" step="0.01" oninput="recalcSplit()">
    <button type="button" onclick="removeParticipant(${idx})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2rem;padding:4px;line-height:1;" title="Remove">×</button>
  `;
  document.getElementById('participantRows').appendChild(row);
  recalcSplit();
}

function removeParticipant(idx) {
  const row = document.getElementById(`pRow${idx}`);
  if (row) row.remove();
  recalcSplit();
}

function recalcSplit() {
  const total  = parseFloat(document.getElementById('sTotal').value) || 0;
  const rows   = document.querySelectorAll('#participantRows > div');
  const count  = rows.length;
  if (count === 0 || total === 0) {
    document.getElementById('splitPreview').textContent = '';
    return;
  }
  const even   = (total / count).toFixed(2);
  document.getElementById('splitPreview').textContent =
    `Equal split: ₹${even} each (${count} people) · You can override amounts per person above.`;
}

async function handleCreateSplit() {
  const title = document.getElementById('sTitle').value.trim();
  const total = parseFloat(document.getElementById('sTotal').value);
  if (!title)    { showToast('Please enter a title.', 'error'); return; }
  if (!total)    { showToast('Please enter the total amount.', 'error'); return; }

  const rows = document.querySelectorAll('#participantRows > div');
  const participants = [];
  let sumCustom = 0;
  let hasCustom = false;

  rows.forEach(row => {
    const name = row.querySelector('.participant-name').value.trim();
    const customAmt = parseFloat(row.querySelector('.participant-custom-amt').value);
    if (name) {
      if (!isNaN(customAmt) && customAmt > 0) { hasCustom = true; sumCustom += customAmt; }
      participants.push({ name, customAmt: (!isNaN(customAmt) && customAmt > 0) ? customAmt : null });
    }
  });

  if (participants.length < 2) { showToast('Add at least 2 participants.', 'error'); return; }

  // Calculate amounts
  const evenAmt = total / participants.length;
  const participantData = participants.map(p => ({
    name: p.name,
    amount_owed: p.customAmt !== null ? p.customAmt : parseFloat(evenAmt.toFixed(2)),
    paid: false,
  }));

  // Insert split
  const { data: splitRow, error: splitErr } = await supabaseClient
    .from('splits')
    .insert({ user_id: currentUser.id, title, total_amount: total })
    .select()
    .single();

  if (splitErr) { showToast(splitErr.message, 'error'); return; }

  // Insert participants
  const participantInserts = participantData.map(p => ({ ...p, split_id: splitRow.id }));
  const { error: pErr } = await supabaseClient.from('split_participants').insert(participantInserts);

  closeNewSplitModal();
  if (pErr) { showToast(pErr.message, 'error'); return; }
  showToast('Split created! 👥', 'success');
  loadSplits();
}

// ---- Delete Split ----
function openDeleteSplitModal(id) {
  deleteSplitId = id;
  document.getElementById('deleteSplitModal').classList.add('active');
}
function closeDeleteSplitModal() {
  deleteSplitId = null;
  document.getElementById('deleteSplitModal').classList.remove('active');
}
async function confirmDeleteSplit() {
  if (!deleteSplitId) return;
  // Participants are cascade deleted via Supabase FK
  const { error } = await supabaseClient.from('splits').delete().eq('id', deleteSplitId);
  closeDeleteSplitModal();
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Split deleted.', 'info');
  loadSplits();
}
