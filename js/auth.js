// ============================================================
// CampusWallet — Auth Guard & Helpers
// ============================================================

// Redirect to login if not authenticated
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.user;
}

// Get current user (cached)
async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// Sign out
async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// Populate sidebar user chip
async function populateSidebarUser() {
  const user = await getCurrentUser();
  if (!user) return;
  const name  = user.user_metadata?.full_name || user.email.split('@')[0];
  const email = user.email;
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarEl = document.getElementById('sidebarAvatar');
  const nameEl   = document.getElementById('sidebarName');
  const emailEl  = document.getElementById('sidebarEmail');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = email;
}

// ============================================================
// Toast notifications
// ============================================================
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ============================================================
// Format currency
// ============================================================
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ============================================================
// Format date
// ============================================================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================
// Month helpers
// ============================================================
function getMonthName(month) {
  return new Date(2024, month - 1).toLocaleString('en-IN', { month: 'long' });
}

// ============================================================
// Sidebar toggle (mobile)
// ============================================================
function initSidebarToggle() {
  const menuBtn = document.getElementById('menuToggle');
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  if (!menuBtn || !sidebar) return;

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ============================================================
// Category config
// ============================================================
const CATEGORIES = {
  food:          { label: 'Food',          emoji: '🍕', class: 'cat-food' },
  rent:          { label: 'Rent',          emoji: '🏠', class: 'cat-rent' },
  books:         { label: 'Books',         emoji: '📚', class: 'cat-books' },
  transport:     { label: 'Transport',     emoji: '🚌', class: 'cat-transport' },
  entertainment: { label: 'Entertainment', emoji: '🎬', class: 'cat-entertainment' },
  health:        { label: 'Health',        emoji: '💊', class: 'cat-health' },
  other:         { label: 'Other',         emoji: '📦', class: 'cat-other' },
};

function getCatChip(category) {
  const cat = CATEGORIES[category] || CATEGORIES.other;
  return `<span class="cat-chip ${cat.class}">${cat.emoji} ${cat.label}</span>`;
}
