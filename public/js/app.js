/**
 * ==========================================================================
 * VELOCITY MOTORS - SHADCN/UI CLIENT & REST API INTEGRATION
 * ==========================================================================
 */

const API_BASE = (window.location.origin.includes('http') && window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

// Global Application State
const state = {
  users: [],
  activeUserId: localStorage.getItem('velocity_active_user') || null,
  sections: [],
  cars: [],
  favorites: [],
  favoriteCarIds: new Set(),
  activeSectionFilter: 'ALL',
  searchQuery: '',
  apiCallsCount: 0
};

// Re-render Lucide icons safely
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ==========================================================================
// API CLIENT WRAPPER & LIVE LOGGING
// ==========================================================================

async function apiRequest(endpoint, options = {}) {
  const startTime = performance.now();
  const method = options.method || 'GET';
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const duration = Math.round(performance.now() - startTime);
    const data = await response.json();

    logApiNetwork(method, endpoint, response.status, duration, !response.ok);

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logApiNetwork(method, endpoint, 'ERR', duration, true);
    throw error;
  }
}

function logApiNetwork(method, endpoint, status, duration, isError = false) {
  state.apiCallsCount++;
  document.getElementById('badgeApiCallsCount').textContent = state.apiCallsCount;

  const consoleLogs = document.getElementById('consoleLogs');
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const logItem = document.createElement('div');
  logItem.className = 'log-row';

  const methodClass = `method-${method.toLowerCase()}`;

  logItem.innerHTML = `
    <span style="color: hsl(var(--muted-foreground));">${timeStr}</span>
    <span class="method-tag ${methodClass}">${method}</span>
    <span style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${endpoint}</span>
    <span style="color: hsl(var(--muted-foreground));">${duration}ms</span>
    <span style="color: ${isError ? 'hsl(var(--destructive))' : 'hsl(142 76% 56%)'}; font-weight: 600;">${status}</span>
  `;

  consoleLogs.prepend(logItem);
}

// ==========================================================================
// SHADCN TOAST / SONNER NOTIFICATIONS
// ==========================================================================

function showToast(message, type = 'default') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'sonner-toast';

  let iconName = 'info';
  let iconColor = 'hsl(var(--foreground))';

  if (type === 'success') {
    iconName = 'check-circle-2';
    iconColor = 'hsl(142 76% 56%)';
  } else if (type === 'error') {
    iconName = 'alert-triangle';
    iconColor = 'hsl(0 84.2% 60.2%)';
  }

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 1.125rem; height: 1.125rem; color: ${iconColor}; flex-shrink: 0;"></i>
    <div style="flex-grow: 1; font-size: 0.8125rem; font-weight: 500;">${message}</div>
  `;

  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

// ==========================================================================
// DATA FETCHING
// ==========================================================================

async function fetchAllData() {
  try {
    await Promise.all([
      fetchUsers(),
      fetchSections(),
      fetchCars()
    ]);

    if (state.activeUserId) {
      await fetchActiveUserFavorites();
    }

    renderAll();
  } catch (error) {
    showToast(`Initialization note: ${error.message}`, 'error');
  }
}

async function fetchUsers() {
  try {
    const data = await apiRequest('/users');
    state.users = data.users || [];

    if (!state.activeUserId || !state.users.some(u => u._id === state.activeUserId)) {
      state.activeUserId = state.users.length > 0 ? state.users[0]._id : null;
      if (state.activeUserId) {
        localStorage.setItem('velocity_active_user', state.activeUserId);
      }
    }
  } catch (err) {
    console.error("fetchUsers error:", err);
  }
}

async function fetchSections() {
  try {
    const data = await apiRequest('/sections');
    state.sections = data.sections || [];
  } catch (err) {
    console.error("fetchSections error:", err);
  }
}

async function fetchCars() {
  try {
    const data = await apiRequest('/cars');
    state.cars = data.cars || [];
  } catch (err) {
    console.error("fetchCars error:", err);
  }
}

// API 5 (M-M): Fetch Active User Favorites
async function fetchActiveUserFavorites() {
  if (!state.activeUserId) return;
  try {
    const data = await apiRequest(`/favorites/user/${state.activeUserId}`);
    state.favorites = data.favorites || [];
    state.favoriteCarIds = new Set(state.favorites.map(c => c._id));
  } catch (err) {
    console.error("fetchActiveUserFavorites error:", err);
    state.favorites = [];
    state.favoriteCarIds.clear();
  }
}

// ==========================================================================
// RENDERING
// ==========================================================================

function renderAll() {
  renderUserSelector();
  renderSectionPills();
  renderSectionSelectInModal();
  renderCarsGrid();
  renderSectionsTab();
  renderBookingTab();
  renderFavoritesTab();
  updateStats();
  refreshIcons();
}

function updateStats() {
  document.getElementById('statCarsCount').textContent = `${state.cars.length} Cars`;
  document.getElementById('badgeCarsCount').textContent = state.cars.length;
  document.getElementById('badgeSectionsCount').textContent = state.sections.length;
  document.getElementById('badgeFavoritesCount').textContent = state.favorites.length;
  document.getElementById('statFavoritesCount').textContent = `${state.favorites.length} Saved`;

  const activeUser = state.users.find(u => u._id === state.activeUserId);
  const isBooked = activeUser && activeUser.carId;
  document.getElementById('badgeBookingCount').textContent = isBooked ? '1' : '0';
  document.getElementById('statBookingState').textContent = isBooked ? 'Active Booking' : 'None';
}

// User Dropdown in Navbar
function renderUserSelector() {
  const userSelector = document.getElementById('userSelector');
  const navAvatar = document.getElementById('navAvatar');

  userSelector.innerHTML = '';

  if (state.users.length === 0) {
    userSelector.innerHTML = '<option value="">No Users (+ New)</option>';
    navAvatar.textContent = '?';
    return;
  }

  state.users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user._id;
    opt.textContent = `${user.name} (${user.email.split('@')[0]})`;
    if (user._id === state.activeUserId) {
      opt.selected = true;
    }
    userSelector.appendChild(opt);
  });

  const activeUser = state.users.find(u => u._id === state.activeUserId);
  if (activeUser) {
    navAvatar.textContent = activeUser.name.charAt(0).toUpperCase();
  }
}

// Section Filter Pills in Toolbar
function renderSectionPills() {
  const container = document.getElementById('sectionPillsContainer');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `filter-pill ${state.activeSectionFilter === 'ALL' ? 'active' : ''}`;
  allBtn.textContent = `All (${state.cars.length})`;
  allBtn.onclick = () => {
    state.activeSectionFilter = 'ALL';
    renderSectionPills();
    renderCarsGrid();
  };
  container.appendChild(allBtn);

  state.sections.forEach(sec => {
    const count = state.cars.filter(c => {
      const secId = (typeof c.sectionId === 'object' && c.sectionId) ? c.sectionId._id : c.sectionId;
      return secId === sec._id;
    }).length;

    const btn = document.createElement('button');
    btn.className = `filter-pill ${state.activeSectionFilter === sec._id ? 'active' : ''}`;
    btn.textContent = `${sec.title} (${count})`;
    btn.onclick = () => {
      state.activeSectionFilter = sec._id;
      renderSectionPills();
      renderCarsGrid();
    };
    container.appendChild(btn);
  });
}

// Section dropdown inside Add Car modal
function renderSectionSelectInModal() {
  const select = document.getElementById('carSectionSelect');
  select.innerHTML = '<option value="">Select a category...</option>';

  state.sections.forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec._id;
    opt.textContent = sec.title;
    select.appendChild(opt);
  });
}

// ==========================================================================
// RENDER CARS SHOWROOM (TAB 1)
// ==========================================================================

function renderCarsGrid() {
  const grid = document.getElementById('carsGrid');
  grid.innerHTML = '';

  let filtered = state.cars.filter(car => {
    if (state.activeSectionFilter !== 'ALL') {
      const secId = (typeof car.sectionId === 'object' && car.sectionId) ? car.sectionId._id : car.sectionId;
      if (secId !== state.activeSectionFilter) return false;
    }
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const titleMatch = car.title && car.title.toLowerCase().includes(q);
      const modelMatch = car.model && car.model.toLowerCase().includes(q);
      if (!titleMatch && !modelMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon"><i data-lucide="car"></i></div>
        <h3 style="font-weight: 600; font-size: 1rem;">No vehicles found</h3>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground));">
          Try clearing your search query or click <strong>Seed Demo</strong> to populate sample records.
        </p>
      </div>
    `;
    refreshIcons();
    return;
  }

  const activeUser = state.users.find(u => u._id === state.activeUserId);
  const activeUserBookedCarId = activeUser && activeUser.carId
    ? (typeof activeUser.carId === 'object' ? activeUser.carId._id : activeUser.carId)
    : null;

  const bookedCarUserMap = new Map();
  state.users.forEach(u => {
    if (u.carId) {
      const bId = typeof u.carId === 'object' ? u.carId._id : u.carId;
      bookedCarUserMap.set(bId, u.name);
    }
  });

  filtered.forEach(car => {
    const isFav = state.favoriteCarIds.has(car._id);
    const isBookedByActiveUser = activeUserBookedCarId === car._id;
    const bookedByName = bookedCarUserMap.get(car._id);
    const isBookedByOther = bookedByName && !isBookedByActiveUser;

    let sectionTitle = 'General';
    if (car.sectionId) {
      if (typeof car.sectionId === 'object' && car.sectionId.title) {
        sectionTitle = car.sectionId.title;
      } else {
        const found = state.sections.find(s => s._id === car.sectionId);
        if (found) sectionTitle = found.title;
      }
    }

    let statusBadge = '<span class="badge badge-outline">Available</span>';
    if (isBookedByActiveUser) {
      statusBadge = '<span class="badge badge-success">Booked by You</span>';
    } else if (isBookedByOther) {
      statusBadge = `<span class="badge badge-destructive">Booked (${bookedByName})</span>`;
    }

    const card = document.createElement('div');
    card.className = 'card';

    const colorsHtml = (car.colors && car.colors.length > 0)
      ? car.colors.map(c => `<span class="color-dot-tag">${c}</span>`).join('')
      : '<span class="color-dot-tag">Base Spec</span>';

    card.innerHTML = `
      <div class="card-header">
        <div class="car-card-top">
          <span class="badge badge-secondary car-section-badge">${sectionTitle}</span>
          ${statusBadge}
        </div>
        <h3 class="card-title">${car.title}</h3>
        <p class="card-description">Model Year ${car.model}</p>
      </div>

      <div class="card-content">
        <div class="car-price-block">
          <span class="car-price-value">$${Number(car.price).toLocaleString()}</span>
          <span class="car-price-label">USD</span>
        </div>
        <div class="car-color-tags">
          ${colorsHtml}
        </div>
      </div>

      <div class="card-footer" style="border-top: 1px solid hsl(var(--border)); padding-top: 1rem;">
        <button class="btn btn-outline btn-sm btn-fav ${isFav ? 'btn-secondary' : ''}" style="flex: 1;" data-car-id="${car._id}">
          <i data-lucide="heart" style="width: 0.875rem; height: 0.875rem; ${isFav ? 'fill: currentColor; color: hsl(var(--destructive));' : ''}"></i>
          <span>${isFav ? 'Saved' : 'Favorite'}</span>
        </button>

        <button class="btn btn-primary btn-sm btn-book" style="flex: 1;" data-car-id="${car._id}" ${isBookedByOther || isBookedByActiveUser ? 'disabled' : ''}>
          <i data-lucide="key" style="width: 0.875rem; height: 0.875rem;"></i>
          <span>${isBookedByActiveUser ? 'Reserved' : isBookedByOther ? 'Unavailable' : 'Book (1-1)'}</span>
        </button>
      </div>
    `;

    const favBtn = card.querySelector('.btn-fav');
    favBtn.onclick = () => handleFavoriteClick(car._id);

    const bookBtn = card.querySelector('.btn-book');
    bookBtn.onclick = () => handleBookCarClick(car._id, car.title);

    grid.appendChild(card);
  });

  refreshIcons();
}

// ==========================================================================
// RENDER SECTIONS TAB (1-M EXPLORER)
// ==========================================================================

function renderSectionsTab() {
  const grid = document.getElementById('sectionsGrid');
  grid.innerHTML = '';

  if (state.sections.length === 0) {
    grid.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon"><i data-lucide="layers"></i></div>
        <h3 style="font-weight: 600; font-size: 1rem;">No sections created</h3>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground));">
          Add sections to classify cars under the 1-M model.
        </p>
      </div>
    `;
    refreshIcons();
    return;
  }

  state.sections.forEach(sec => {
    const count = state.cars.filter(c => {
      const secId = (typeof c.sectionId === 'object' && c.sectionId) ? c.sectionId._id : c.sectionId;
      return secId === sec._id;
    }).length;

    const card = document.createElement('div');
    card.className = 'section-item-card';
    card.innerHTML = `
      <div class="section-item-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="folder" style="width: 1.125rem; height: 1.125rem; color: hsl(var(--muted-foreground));"></i>
          <h4 style="font-weight: 600; font-size: 0.9375rem;">${sec.title}</h4>
        </div>
        <span class="badge badge-secondary">${count} cars</span>
      </div>
      <p style="font-size: 0.75rem; color: hsl(var(--muted-foreground));">
        Click to execute <code>GET /api/v1/sections/${sec._id}/cars</code>
      </p>
    `;

    card.onclick = () => inspectSectionCars(sec._id, sec.title);
    grid.appendChild(card);
  });

  refreshIcons();
}

// API 2 (1-M): Fetch all cars for a section
async function inspectSectionCars(sectionId, sectionTitle) {
  try {
    const data = await apiRequest(`/sections/${sectionId}/cars`);
    const box = document.getElementById('sectionDetailBox');
    const titleEl = document.getElementById('detailSectionTitle');
    const countEl = document.getElementById('detailSectionCount');
    const listEl = document.getElementById('detailCarsList');

    titleEl.textContent = `Section: ${data.section ? data.section.title : sectionTitle}`;
    countEl.textContent = `${data.count || (data.cars ? data.cars.length : 0)} cars associated (1-M relationship)`;
    listEl.innerHTML = '';

    if (!data.cars || data.cars.length === 0) {
      listEl.innerHTML = '<p style="grid-column: 1/-1; font-size: 0.875rem; color: hsl(var(--muted-foreground));">No cars linked to this section yet.</p>';
    } else {
      data.cars.forEach(car => {
        const item = document.createElement('div');
        item.className = 'card';
        item.innerHTML = `
          <div class="card-header">
            <h4 class="card-title" style="font-size: 0.9375rem;">${car.title}</h4>
            <p class="card-description">Model: ${car.model}</p>
          </div>
          <div class="card-content">
            <div style="font-size: 1.125rem; font-weight: 700;">$${Number(car.price).toLocaleString()}</div>
            <div style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); margin-top: 0.25rem;">
              Colors: ${car.colors && car.colors.length ? car.colors.join(', ') : 'Default'}
            </div>
          </div>
        `;
        listEl.appendChild(item);
      });
    }

    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth' });
    refreshIcons();
  } catch (error) {
    showToast(`Section fetch error: ${error.message}`, 'error');
  }
}

// ==========================================================================
// RENDER BOOKINGS TAB (1-1 EXPLORER)
// ==========================================================================

function renderBookingTab() {
  const activeUser = state.users.find(u => u._id === state.activeUserId);

  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const profileId = document.getElementById('profileId');
  const spotlight = document.getElementById('bookingSpotlight');

  if (!activeUser) {
    profileAvatar.textContent = '?';
    profileName.textContent = 'No User Selected';
    profileEmail.textContent = 'Create or select a user from above';
    profilePhone.textContent = '-';
    profileId.textContent = '-';
    spotlight.innerHTML = `
      <div class="booking-status-box">
        <i data-lucide="user-x" style="width: 2rem; height: 2rem; color: hsl(var(--muted-foreground));"></i>
        <h4 style="font-weight: 600;">No active user session</h4>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground));">Select a user to inspect single car bookings.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  profileAvatar.textContent = activeUser.name.charAt(0).toUpperCase();
  profileName.textContent = activeUser.name;
  profileEmail.textContent = activeUser.email;
  profilePhone.textContent = activeUser.phone;
  profileId.textContent = activeUser._id;

  if (!activeUser.carId) {
    spotlight.innerHTML = `
      <div class="booking-status-box">
        <i data-lucide="key" style="width: 2rem; height: 2rem; color: hsl(var(--muted-foreground));"></i>
        <h4 style="font-weight: 600;">No Active Reservation</h4>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); max-width: 24rem;">
          Under the <strong>1-1 relationship</strong>, you can book exactly one vehicle at a time.
        </p>
        <button class="btn btn-primary btn-sm" onclick="switchTab('carsTab')">
          <i data-lucide="car" style="width: 0.875rem; height: 0.875rem;"></i>
          <span>Select a Car to Book</span>
        </button>
      </div>
    `;
  } else {
    let bookedCar = typeof activeUser.carId === 'object' ? activeUser.carId : state.cars.find(c => c._id === activeUser.carId);

    if (!bookedCar) {
      spotlight.innerHTML = `
        <div class="booking-status-box">
          <h4 style="font-weight: 600;">Booked Car ID: ${activeUser.carId}</h4>
        </div>
      `;
      refreshIcons();
      return;
    }

    spotlight.innerHTML = `
      <div class="card" style="padding: 1.5rem; background-color: hsl(var(--secondary));">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <div>
            <span class="badge badge-success" style="margin-bottom: 0.5rem;">Reserved (1-1 Locked)</span>
            <h3 style="font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em;">${bookedCar.title}</h3>
            <span style="font-size: 0.8125rem; color: hsl(var(--muted-foreground));">Model: ${bookedCar.model}</span>
          </div>
          <div style="font-size: 1.5rem; font-weight: 800; color: hsl(var(--foreground));">
            $${Number(bookedCar.price).toLocaleString()}
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          ${bookedCar.colors && bookedCar.colors.length ? bookedCar.colors.map(c => `<span class="color-dot-tag">${c}</span>`).join('') : ''}
        </div>

        <div style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); border-top: 1px solid hsl(var(--border)); padding-top: 0.75rem;">
          ✓ This vehicle is locked to user <strong>${activeUser.name}</strong>. No other user can reserve it.
        </div>
      </div>
    `;
  }

  refreshIcons();
}

// ==========================================================================
// RENDER FAVORITES TAB (M-M EXPLORER)
// ==========================================================================

function renderFavoritesTab() {
  const grid = document.getElementById('favoritesGrid');
  grid.innerHTML = '';

  if (state.favorites.length === 0) {
    grid.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon"><i data-lucide="heart"></i></div>
        <h3 style="font-weight: 600; font-size: 1rem;">No favorites saved</h3>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground));">
          Click the Favorite button on any vehicle to link it via the <strong>Favorite M-M</strong> model.
        </p>
      </div>
    `;
    refreshIcons();
    return;
  }

  state.favorites.forEach(car => {
    if (!car) return;

    let sectionName = 'General';
    if (car.sectionId && typeof car.sectionId === 'object' && car.sectionId.title) {
      sectionName = car.sectionId.title;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div class="car-card-top">
          <span class="badge badge-secondary car-section-badge">${sectionName}</span>
          <span class="badge badge-destructive">Favorite</span>
        </div>
        <h3 class="card-title">${car.title}</h3>
        <p class="card-description">Model Year ${car.model}</p>
      </div>

      <div class="card-content">
        <div class="car-price-value">$${Number(car.price).toLocaleString()}</div>
      </div>

      <div class="card-footer" style="border-top: 1px solid hsl(var(--border)); padding-top: 0.75rem;">
        <span style="font-size: 0.75rem; color: hsl(var(--muted-foreground));">
          M-M Junction Record Active
        </span>
      </div>
    `;
    grid.appendChild(card);
  });

  refreshIcons();
}

// ==========================================================================
// INTERACTIONS & EVENT HANDLERS
// ==========================================================================

// API 4 (M-M): Add to Favorites
async function handleFavoriteClick(carId) {
  if (!state.activeUserId) {
    showToast('Select or create an active user first', 'error');
    return;
  }

  if (state.favoriteCarIds.has(carId)) {
    showToast('Vehicle is already in user favorites', 'default');
    return;
  }

  try {
    await apiRequest('/favorites', {
      method: 'POST',
      body: JSON.stringify({
        userId: state.activeUserId,
        carId: carId
      })
    });

    showToast('Vehicle added to favorites (M-M record saved)', 'success');
    await fetchActiveUserFavorites();
    renderCarsGrid();
    renderFavoritesTab();
    updateStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// API 3 (1-1): Book Car for Active User
async function handleBookCarClick(carId, carTitle) {
  if (!state.activeUserId) {
    showToast('Select or create an active user first', 'error');
    return;
  }

  const activeUser = state.users.find(u => u._id === state.activeUserId);
  if (activeUser && activeUser.carId) {
    showToast('User already has a booked car (1-1 constraint)', 'error');
    return;
  }

  try {
    await apiRequest(`/users/${state.activeUserId}/book/${carId}`, {
      method: 'POST'
    });

    showToast(`Booked ${carTitle} successfully! (1-1 enforced)`, 'success');
    await fetchUsers();
    await fetchCars();
    renderAll();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==========================================================================
// FORMS SUBMISSION
// ==========================================================================

// API 1 (1-M): Create Car
document.getElementById('createCarForm').onsubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('carTitle').value.trim();
  const model = document.getElementById('carModel').value.trim();
  const price = Number(document.getElementById('carPrice').value);
  const sectionId = document.getElementById('carSectionSelect').value;
  const colorsRaw = document.getElementById('carColors').value.trim();
  const colors = colorsRaw ? colorsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  try {
    await apiRequest('/cars', {
      method: 'POST',
      body: JSON.stringify({ title, model, price, sectionId, colors })
    });

    showToast('Vehicle created & associated with section (1-M)', 'success');
    closeModal('carModal');
    e.target.reset();
    await fetchCars();
    renderSectionPills();
    renderCarsGrid();
    renderSectionsTab();
    updateStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// Create Section
document.getElementById('createSectionForm').onsubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('sectionTitle').value.trim();

  try {
    await apiRequest('/sections', {
      method: 'POST',
      body: JSON.stringify({ title })
    });

    showToast(`Section "${title}" created`, 'success');
    closeModal('sectionModal');
    e.target.reset();
    await fetchSections();
    renderSectionPills();
    renderSectionSelectInModal();
    renderSectionsTab();
    updateStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// Create User
document.getElementById('createUserForm').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const password = document.getElementById('userPassword').value;

  try {
    const res = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password })
    });

    showToast(`User account created: ${name}`, 'success');
    closeModal('userModal');
    e.target.reset();

    if (res.user && res.user._id) {
      state.activeUserId = res.user._id;
      localStorage.setItem('velocity_active_user', state.activeUserId);
    }

    await fetchUsers();
    await fetchActiveUserFavorites();
    renderAll();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// Demo Seeder
document.getElementById('btnExecuteSeed').onclick = async () => {
  const seedBtn = document.getElementById('btnExecuteSeed');
  seedBtn.disabled = true;
  seedBtn.textContent = 'Generating records...';

  try {
    showToast('Seeding initial showroom data...', 'default');

    await apiRequest('/sections', { method: 'POST', body: JSON.stringify({ title: 'Supercars' }) }).catch(() => null);
    await apiRequest('/sections', { method: 'POST', body: JSON.stringify({ title: 'Luxury SUV' }) }).catch(() => null);
    await apiRequest('/sections', { method: 'POST', body: JSON.stringify({ title: 'Electric GT' }) }).catch(() => null);

    await fetchSections();

    const sSuper = state.sections.find(s => s.title === 'Supercars') || state.sections[0];
    const sSuv = state.sections.find(s => s.title === 'Luxury SUV') || state.sections[0];
    const sElec = state.sections.find(s => s.title === 'Electric GT') || state.sections[0];

    if (sSuper) {
      await apiRequest('/cars', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Porsche 911 GT3 RS',
          model: '2024',
          price: 241300,
          colors: ['Guards Red', 'Shark Blue'],
          sectionId: sSuper._id
        })
      }).catch(() => null);

      await apiRequest('/cars', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Ferrari 296 GTB',
          model: '2024',
          price: 338255,
          colors: ['Rosso Corsa', 'Nero Daytona'],
          sectionId: sSuper._id
        })
      }).catch(() => null);
    }

    if (sSuv) {
      await apiRequest('/cars', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Lamborghini Urus Performante',
          model: '2024',
          price: 260676,
          colors: ['Verde Mantis', 'Grigio Keres'],
          sectionId: sSuv._id
        })
      }).catch(() => null);

      await apiRequest('/cars', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Range Rover SV',
          model: '2024',
          price: 218300,
          colors: ['Santorini Black', 'Carpathian Grey'],
          sectionId: sSuv._id
        })
      }).catch(() => null);
    }

    if (sElec) {
      await apiRequest('/cars', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Porsche Taycan Turbo S',
          model: '2024',
          price: 197500,
          colors: ['Frozen Blue', 'Carmine Red'],
          sectionId: sElec._id
        })
      }).catch(() => null);
    }

    const rnd = Date.now().toString().slice(-4);
    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alexander Vance',
        email: `alex_${rnd}@velocity.io`,
        phone: `+97150${rnd}01`,
        password: 'password123'
      })
    }).catch(() => null);

    await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: `elena_${rnd}@velocity.io`,
        phone: `+97150${rnd}02`,
        password: 'password123'
      })
    }).catch(() => null);

    closeModal('seedModal');
    showToast('Showroom seeded successfully!', 'success');
    await fetchAllData();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    seedBtn.disabled = false;
    seedBtn.textContent = 'Generate Now';
  }
};

// ==========================================================================
// MODALS & NAVIGATION
// ==========================================================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function switchTab(tabId) {
  document.querySelectorAll('.tabs-trigger').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tabs-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });

  refreshIcons();
}

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tabs-trigger').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('cardStat1M').onclick = () => switchTab('sectionsTab');
  document.getElementById('cardStat11').onclick = () => switchTab('bookingTab');
  document.getElementById('cardStatMM').onclick = () => switchTab('favoritesTab');

  // Modals
  document.getElementById('btnOpenCarModal').onclick = () => openModal('carModal');
  document.getElementById('btnCloseCarModal').onclick = () => closeModal('carModal');
  document.getElementById('btnCancelCar').onclick = () => closeModal('carModal');

  document.getElementById('btnOpenSectionModal').onclick = () => openModal('sectionModal');
  document.getElementById('btnCloseSectionModal').onclick = () => closeModal('sectionModal');
  document.getElementById('btnCancelSection').onclick = () => closeModal('sectionModal');

  document.getElementById('btnOpenUserModal').onclick = () => openModal('userModal');
  document.getElementById('btnCloseUserModal').onclick = () => closeModal('userModal');
  document.getElementById('btnCancelUser').onclick = () => closeModal('userModal');

  document.getElementById('btnOpenSeedModal').onclick = () => openModal('seedModal');
  document.getElementById('btnCloseSeedModal').onclick = () => closeModal('seedModal');
  document.getElementById('btnCancelSeed').onclick = () => closeModal('seedModal');

  document.getElementById('btnCloseDetail').onclick = () => {
    document.getElementById('sectionDetailBox').style.display = 'none';
  };

  // User Switcher
  document.getElementById('userSelector').onchange = async (e) => {
    state.activeUserId = e.target.value;
    localStorage.setItem('velocity_active_user', state.activeUserId);
    await fetchActiveUserFavorites();
    renderAll();
    showToast('Active user switched', 'default');
  };

  document.getElementById('btnSwitchUserPrompt').onclick = () => {
    document.getElementById('userSelector').focus();
  };

  // Search input
  document.getElementById('carSearchInput').oninput = (e) => {
    state.searchQuery = e.target.value;
    renderCarsGrid();
  };

  // Refresh button
  document.getElementById('btnRefreshCars').onclick = async () => {
    await fetchCars();
    renderCarsGrid();
    showToast('Inventory refreshed', 'default');
  };

  // Clear logs
  document.getElementById('btnClearLogs').onclick = () => {
    document.getElementById('consoleLogs').innerHTML = '';
    state.apiCallsCount = 0;
    document.getElementById('badgeApiCallsCount').textContent = '0';
  };

  fetchAllData();
});
