// dash.clean.js
// Cleaned & simplified service dashboard JS
// - Per-card edit/delete buttons (no global edit/delete mode)
// - Fixed event delegation & modal wiring
// - Cleaned up search filter selectors
// - Calls fetchServices() for environment switching
// - Safer interval usage

let currentEnv = 'live'; // default

// -----------------------------
// Fetch services from server
// -----------------------------
async function fetchServices() {
  try {
    const res = await fetch(`/services?env=${encodeURIComponent(currentEnv)}`, { credentials: 'include' });

    // If the server redirected (session expired), follow
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    if (!res.ok) {
      console.error('Unexpected response while fetching services:', res.statusText);
      return;
    }

    const services = await res.json();
    renderServices(services);
    filterServices();
  } catch (err) {
    console.error('Failed to fetch services:', err);
  }
}

// -----------------------------
// Render service cards
// -----------------------------
function renderServices(services) {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  const messageId = 'noServicesMessage';

  if (!services || services.length === 0) {
    const messageElem = document.createElement('div');
    messageElem.id = messageId;
    messageElem.className = 'text-center mt-0 text-muted no-services-message';
    messageElem.innerText = `🚫 No services found for "${currentEnv}" environment.`;
    container.appendChild(messageElem);
    return;
  }

  services.forEach(({ name, endpoint, status, last_checked }) => {
    const color = status?.toUpperCase() === 'UP' ? 'success'
                : status?.toUpperCase() === 'DOWN' ? 'danger'
                : 'warning';

    // Try to shorten URL for display
    let shortEndpoint = endpoint;
    try {
      const urlObj = new URL(endpoint);
      shortEndpoint = urlObj.port
        ? `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`
        : `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (e) {
      shortEndpoint = endpoint;
    }

    const col = document.createElement('div');
    col.className = 'col-md-4';

    col.innerHTML = `
      <div class="modern-card service-card h-100 status-${color} p-4 d-flex flex-column justify-content-between"
           data-name="${escapeHtmlAttr(name)}" data-endpoint="${escapeHtmlAttr(endpoint)}">

        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">${escapeHtml(name)}</h5>
          <span class="badge status-badge bg-${color}">
            <i class="bi ${color === 'success' ? 'bi-check-circle' : color === 'danger' ? 'bi-x-circle' : 'bi-exclamation-circle'} me-1"></i>
            ${escapeHtml(status || 'UNKNOWN')}
          </span>
        </div>

        <!-- Endpoint -->
        <p class="service-url small text-muted mb-3">
          <i class="bi bi-link-45deg me-1"></i>${escapeHtml(shortEndpoint)}
        </p>

        <!-- Footer -->
        <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top">
          <small class="text-muted"><i class="bi bi-clock me-1"></i>${last_checked ? new Date(last_checked).toLocaleString() : 'Never'}</small>
          <div class="btn-group" role="group" aria-label="service actions">
            <button type="button" class="btn btn-light btn-sm edit-btn" title="Edit"><i class="bi bi-pencil"></i></button>
            <button type="button" class="btn btn-light btn-sm delete-btn" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(col);
  });
}

// -----------------------------
// Open Edit Modal & handle update
// -----------------------------
function openEditModal(name, endpoint) {
  // populate modal fields
  const editNameInput = document.getElementById('editServiceName');
  const editUrlInput = document.getElementById('editServiceUrl');
  if (!editNameInput || !editUrlInput) {
    console.error('Edit modal inputs not found.');
    return;
  }

  editNameInput.value = name || '';
  editUrlInput.value = endpoint || '';

  const modalEl = document.getElementById('editServiceModal');
  const modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();

  const originalName = name;

  // Rebind form submit (use onsubmit to replace previous)
  const form = document.getElementById('editServiceForm');
  if (!form) {
    console.error('Edit form not found.');
    return;
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const updatedName = document.getElementById('editServiceName').value.trim();
    const updatedUrl  = document.getElementById('editServiceUrl').value.trim();
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    Swal.fire({
      title: 'Please wait...',
      text: 'Updating Service...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch(`/api/services/${encodeURIComponent(originalName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken
        },
        body: JSON.stringify({ name: updatedName, endpoint: updatedUrl })
      });

      if (res.ok) {
        document.querySelector('.page-title').textContent = 'Services';
        bootstrap.Modal.getInstance(modalEl).hide();
        fetchServices();
        Swal.close();
        Swal.fire({ title: 'Updated!', text: 'Service updated successfully!', icon: 'success', showConfirmButton: false, timer: 1500 });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.close();
        Swal.fire({ title: 'Error', text: err.error || 'Update failed.', icon: 'error', showConfirmButton: false, timer: 2000 });
      }
    } catch (err) {
      console.error('Failed to update service:', err);
      Swal.close();
      Swal.fire({ title: 'Error', text: 'Update failed.', icon: 'error' });
    }
  };
}

// -----------------------------
// Add Service modal
// -----------------------------
function showAddModal() {
  const modal = new bootstrap.Modal(document.getElementById('addServiceModal'));
  modal.show();
}

// Add Service form handler
const addServForm = document.getElementById('addServiceForm');
if (addServForm) {
  addServForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('serviceName').value.trim();
    const endpoint = document.getElementById('serviceUrl').value.trim();
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    Swal.fire({ title: 'Please wait...', text: 'Adding Service...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfToken
        },
        body: JSON.stringify({ name, endpoint, env: currentEnv })
      });

      if (res.ok) {
        document.querySelector('.page-title').textContent = 'Services';
        bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
        fetchServices();
        Swal.close();
        Swal.fire({ title: 'Success', text: 'Service added!', icon: 'success', showConfirmButton: false, timer: 1000 });
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.close();
        Swal.fire({ title: 'Error', text: err.error || 'Failed to add service', icon: 'error', showConfirmButton: false, timer: 2000 });
      }
    } catch (err) {
      console.error('Failed to add service:', err);
      Swal.close();
      Swal.fire({ title: 'Error', text: 'Failed to add service', icon: 'error' });
    }
  });
}

// -----------------------------
// Delete Service
// -----------------------------
async function confirmDeleteService(serviceName) {
  const result = await Swal.fire({
    title: `Delete "${serviceName}"?`,
    text: "This cannot be undone.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!'
  });

  if (!result.isConfirmed) return;

  Swal.fire({ title: 'Please wait...', text: 'Deleting Service...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });

  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await fetch(`/api/services/${encodeURIComponent(serviceName)}`, {
      method: 'DELETE',
      headers: { 'CSRF-Token': csrfToken }
    });

    if (res.ok) {
      document.querySelector('.page-title').textContent = 'Services';
      Swal.close();
      Swal.fire({ title: 'Deleted!', text: `Service "${serviceName}" has been deleted.`, icon: 'success', timer: 1500, showConfirmButton: false });
      fetchServices();
    } else {
      const err = await res.json().catch(() => ({}));
      Swal.close();
      Swal.fire('Error', err.error || 'Failed to delete.', 'error');
    }
  } catch (err) {
    console.error('Failed to delete service:', err);
    Swal.close();
    Swal.fire('Error', 'Something went wrong.', 'error');
  }
}

// -----------------------------
// Search / filter services
// -----------------------------
function filterServices() {
  const input = document.getElementById('serviceSearchInput');
  const filter = (input?.value || '').toLowerCase();
  const columns = document.querySelectorAll('#servicesContainer .col-md-4');
  let anyVisible = false;

  columns.forEach(col => {
    const card = col.querySelector('.modern-card');
    const name = (card?.querySelector('.card-title')?.textContent || '').toLowerCase();
    const url  = (card?.querySelector('.service-url')?.textContent || '').toLowerCase();
    const matches = name.includes(filter) || url.includes(filter);
    col.style.display = matches ? 'block' : 'none';
    if (matches) anyVisible = true;
  });

  const messageId = 'noServicesMessage';
  let messageElem = document.getElementById(messageId);

  if (!anyVisible) {
    if (!messageElem) {
      messageElem = document.createElement('div');
      messageElem.id = messageId;
      messageElem.className = 'text-center mt-0 text-muted no-services-message';
      messageElem.innerText = '🚫 No matching services found.';
      document.getElementById('servicesContainer').appendChild(messageElem);
    }
  } else {
    if (messageElem) messageElem.remove();
  }
}

// -----------------------------
// Utility: debounce
// -----------------------------
function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const debouncedFilter = debounce(filterServices);

// Search input binding
const servSearch = document.getElementById('serviceSearchInput');
if (servSearch) servSearch.addEventListener('input', debouncedFilter);

// -----------------------------
// Environment toggle buttons
// -----------------------------
document.querySelectorAll('.env-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEnv = btn.dataset.env;
    console.log(`Switched to: ${currentEnv}`);
    fetchServices();
  });
});

// -----------------------------
// Event delegation for per-card actions
// -----------------------------
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    const card = editBtn.closest('.service-card');
    if (!card) return;
    const name = card.dataset.name;
    const endpoint = card.dataset.endpoint;
    openEditModal(name, endpoint);
    return;
  }

  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const card = deleteBtn.closest('.service-card');
    if (!card) return;
    const name = card.dataset.name;
    confirmDeleteService(name);
    return;
  }
});

// -----------------------------
// Helper: HTML escaping for attributes & content
// -----------------------------
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// -----------------------------
// Initial fetch + poll
// -----------------------------
fetchServices();
// Poll to refresh the dashboard (every 3s). You can adjust or remove this if too chatty.
// Poll every 3s: ping first, then refresh services
const servicesPoll = setInterval(async () => {
  try {
    await fetch('/api/services/ping', { credentials: 'include' });
  } catch (err) {
    console.error('Ping failed:', err);
  }
  fetchServices();
}, 3000);
