// Switching Environment
let currentEnv = 'live'; // default

async function fetchServices() {
  try {
    const res = await fetch(`/services?env=${encodeURIComponent(currentEnv)}`);

    if (res.redirected) {
      // The session expired and server redirected us silently
      window.location.href = res.url;
      return;
    }

    if (!res.ok) {
      console.error('Unexpected response:', res.statusText);
      return;
    }

    const services = await res.json();
    renderServices(services);
    filterServices();
  } catch (err) {
    console.error('Failed to fetch services:', err);
  }
}


let isEditMode = false;

const enterEditMode = () => {
  if (isDeleteMode) exitDeleteMode();

  document.querySelector('.page-title').textContent = 'Edit Service';
  isEditMode = true;
  document.getElementById('servicesContainer').classList.add('edit-mode');
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.add('card-edit-mode');
    card.style.pointerEvents = 'auto'; // ensure clickable
  });
  Swal.fire({
    title: 'Edit Mode',
    text: 'Click a service to edit it.',
    icon: 'info',
    toast: true,
    position: 'top',
    timer: 1500,
    showConfirmButton: false
  });
};


function exitToHomeState() {
  isEditMode = false;
  document.querySelector('.page-title').textContent = 'Services';
  document.getElementById('servicesContainer').classList.remove('edit-mode');
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('card-edit-mode');
    card.style.pointerEvents = 'none'; // or back to default
  });
}


const renderServices = (services) => {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = '';

  const messageId = "noServicesMessage";

  if (!services || services.length === 0) {
    let messageElem = document.createElement("div");
    messageElem.id = messageId;
    messageElem.className = "text-center mt-0 text-muted no-services-message";
    messageElem.innerText = `🚫 No services found for "${currentEnv}" environment.`;
    container.appendChild(messageElem);
    return;
  }

  services.forEach(({ name, endpoint, status, last_checked }) => {
    const color = status?.toUpperCase() === 'UP' ? 'success' :
                  status?.toUpperCase() === 'DOWN' ? 'danger' : 'warning';

    // Parse and truncate the URL
    let shortEndpoint = endpoint;
    try {
      const urlObj = new URL(endpoint);
      // If port is specified, show protocol + host + port
      // Otherwise, just protocol + host
      shortEndpoint = urlObj.port 
        ? `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`
        : `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (e) {
      // Fallback if not a valid URL
      shortEndpoint = endpoint;
    }

    const card = document.createElement('div');
    card.className = 'col-md-4';
    card.innerHTML = `
      <div class="modern-card service-card h-100 status-${color} position-relative p-4" data-name="${name}" data-endpoint="${endpoint}">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="card-title mb-0 text-${color}">${name}</h5>
          <span class="status-dot ${status?.toLowerCase() || 'warning'}"></span>
        </div>
        <div class="card-text service-url mb-2">${shortEndpoint}</div>
        <div class="card-text mb-2"><strong>Status:</strong> <span class="badge bg-${color}">${status || 'UNKNOWN'}</span></div>
        <div><small class="card-text text-muted">Last checked: ${last_checked ? new Date(last_checked).toLocaleString() : 'Never'}</small></div>
      </div>
    `;

    const cardInner = card.querySelector('.modern-card');

    // Shared card click handler based on mode
    cardInner.addEventListener('click', () => {
      if (isEditMode) {
        openEditModal(name, endpoint);
      } else if (isDeleteMode) {
        confirmDeleteService(name);
      }
    });

    // Apply style classes based on mode
    if (isEditMode) {
      cardInner.classList.add('card-edit-mode');
      cardInner.style.pointerEvents = 'auto';
    }

    if (isDeleteMode) {
      cardInner.classList.add('card-delete-mode');
      cardInner.style.pointerEvents = 'auto';
    }

    container.appendChild(card);
  });

  // Mode-level class changes (optional but helpful)
  container.classList.toggle('edit-mode', isEditMode);
  container.classList.toggle('delete-mode', isDeleteMode);
};



// Opening editServiceModal
const openEditModal = (name, endpoint) => {
  document.getElementById('editServiceName').value = name;
  document.getElementById('editServiceUrl').value = endpoint;

  const modalEl = document.getElementById('editServiceModal');
  const modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();

  // Store original name for PUT request
  const originalName = name;

  // Rebind the edit form
  const form = document.getElementById('editServiceForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const updatedName = document.getElementById('editServiceName').value.trim();
    const updatedUrl = document.getElementById('editServiceUrl').value.trim();
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    Swal.fire({
      title: 'Please wait...',
      text: 'Updating Service...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });


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
      Swal.fire({
        title: 'Updated!',
        text: 'Service updated successfully!',
        icon: 'success',
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      const err = await res.json();
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: err.error || 'Update failed.',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000
      });
    }
  };
};


const showAddModal = () => new bootstrap.Modal(document.getElementById('addServiceModal')).show();


const addServForm = document.getElementById('addServiceForm');
if (addServForm){
  addServForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('serviceName').value.trim();
      const endpoint = document.getElementById('serviceUrl').value.trim();
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

      Swal.fire({
        title: 'Please wait...',
        text: 'Adding Service...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      
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
        Swal.fire({
          title: 'Success',
          text: 'Service added!',
          icon: 'success',
          showConfirmButton: false,
          timer: 1000
        });
      } else {
      const err = await res.json();
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: err.error || 'Failed to add service',
        icon: 'error',
        showConfirmButton: false,
        timer: 2000
      });
      }
  });
}


// Delete Services functionality
let isDeleteMode = false;

const enterDeleteMode = () => {
  if (isEditMode) exitToHomeState();

  isDeleteMode = true;
  document.querySelector('.page-title').textContent = 'Delete Service';
  document.getElementById('servicesContainer').classList.add('delete-mode');

  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.add('card-delete-mode');
    card.style.pointerEvents = 'auto';
  });

  Swal.fire({
    title: 'Delete Mode',
    text: 'Click a card to delete it.',
    icon: 'warning',
    toast: true,
    position: 'top',
    timer: 2000,
    showConfirmButton: false
  });
};


const exitDeleteMode = () => {
  isDeleteMode = false;
  document.querySelector('.page-title').textContent = 'Services';
  document.getElementById('servicesContainer').classList.remove('delete-mode');

  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('card-delete-mode');
    card.style.pointerEvents = 'none';
  });
};


const confirmDeleteService = async (serviceName) => {
  const result = await Swal.fire({
    title: `Delete "${serviceName}"?`,
    text: "This cannot be undone.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    Swal.fire({
      title: 'Please wait...',
      text: 'Deleting Service...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      const res = await fetch(`/api/services/${encodeURIComponent(serviceName)}`, {
        method: 'DELETE',
        headers: {
          'CSRF-Token': csrfToken
        }
      });

      if (res.ok) {
        document.querySelector('.page-title').textContent = 'Services';
        Swal.close();
        Swal.fire({
          title: 'Deleted!',
          text: `Service "${serviceName}" has been deleted.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        fetchServices(); // refresh list
      } else {
        const err = await res.json();
        Swal.close();
        Swal.fire('Error', err.error || 'Failed to delete.', 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.close();
      Swal.fire('Error', 'Something went wrong.', 'error');
    }
  }
};

document.addEventListener('keydown', (e) => {
  if (isDeleteMode && e.key === 'Escape') {
    exitDeleteMode();
  }

  if (isEditMode && e.key === 'Escape') {
    exitToHomeState();
  }
});

const addServMod = document.getElementById('addServiceModal');
if (addServMod){
  addServMod.addEventListener('show.bs.modal', () => {
    if (isDeleteMode) exitDeleteMode();
    if (isEditMode) exitToHomeState();
    document.querySelector('.page-title').textContent = 'Add Service';
  });
}



fetchServices();
setInterval(() => fetch('/api/services/ping').then(fetchServices), 3000);


function filterServices() {
  const input = document.getElementById("serviceSearchInput");
  const filter = input?.value.toLowerCase() || "";
  const columns = document.querySelectorAll("#servicesContainer .col-md-4");
  let anyVisible = false;

  columns.forEach(col => {
    const card = col.querySelector(".modern-card");
    const name = card.querySelector(".card-title")?.textContent.toLowerCase() || "";
    const url = card.querySelector(".card-text")?.textContent.toLowerCase() || "";
    const matches = name.includes(filter) || url.includes(filter);
    col.style.display = matches ? "block" : "none";
    if (matches) anyVisible = true;
  });

  const messageId = "noServicesMessage";
  let messageElem = document.getElementById(messageId);

  if (!anyVisible) {
    if (!messageElem) {
      messageElem = document.createElement("div");
      messageElem.id = messageId;
      messageElem.className = "text-center mt-0 text-muted no-services-message";
      messageElem.innerText = "🚫 No matching services found.";
      document.getElementById("servicesContainer").appendChild(messageElem);
    }
  } else {
    if (messageElem) messageElem.remove();
  }
}


function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const debouncedFilter = debounce(filterServices);

const servSearch = document.getElementById("serviceSearchInput");
if (servSearch) {
  servSearch.addEventListener("input", debouncedFilter);
}

document.querySelectorAll('.env-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentEnv = btn.dataset.env;

    // Later: fetch services for selected env
    console.log(`Switched to: ${currentEnv}`);

    fetch(`/services?env=${currentEnv}`, { credentials: 'include' })
      .then(res => res.json())
      .then(services => {
        renderServices(services); // your existing function to populate the UI
      })
      .catch(err => console.error(err));

  });
});


