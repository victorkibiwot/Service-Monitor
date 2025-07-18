function openNav() {
  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("main");
  const topBar = document.querySelector(".top-bar");
  if (sidebar && main && topBar) {
    document.body.classList.add("sidebar-open");
  }
}

function closeNav() {
  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("main");
  const topBar = document.querySelector(".top-bar");
  if (sidebar && main && topBar) {
    document.body.classList.remove("sidebar-open");
  }
}

document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('sidebar');
  const burgerMenu = document.querySelector('.burger-menu');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!sidebar || !burgerMenu) return;

  const isClickInsideSidebar = sidebar.contains(event.target);
  const isClickOnBurger = burgerMenu.contains(event.target);
  const isClickOnOverlay = overlay && event.target === overlay;

  if ((isClickOnOverlay || (!isClickInsideSidebar && !isClickOnBurger)) && document.body.classList.contains('sidebar-open')) {
    closeNav();
  }
});


const themeToggleInput = document.getElementById('themeToggleInput');
if (themeToggleInput) {
    themeToggleInput.checked = document.documentElement.classList.contains('dark-mode');
    themeToggleInput.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
    });
}

async function fetchServices() {
  try {
    const res = await fetch('/services');

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

  services.forEach(({ name, endpoint, status, last_checked }) => {
    const color = status?.toUpperCase() === 'UP' ? 'success' :
                  status?.toUpperCase() === 'DOWN' ? 'danger' : 'warning';

    const card = document.createElement('div');
    card.className = 'col-md-4';
    card.innerHTML = `
      <div class="card border-${color} shadow h-100 service-card position-relative" data-name="${name}" data-endpoint="${endpoint}">
        <div class="card-body">
          <h5 class="card-title text-${color}">${name}</h5>
          <p class="card-text small">${endpoint}</p>
          <p class="card-text"><strong>Status:</strong> <span class="badge bg-${color}">${status || 'UNKNOWN'}</span></p>
          <p class="card-text"><small class="text-muted">Last checked: ${last_checked ? new Date(last_checked).toLocaleString() : 'Never'}</small></p>
        </div>
      </div>
    `;

    const cardInner = card.querySelector('.card');

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


document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
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
    body: JSON.stringify({ name, endpoint  })
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


document.getElementById('addServiceModal').addEventListener('show.bs.modal', () => {
  if (isDeleteMode) exitDeleteMode();
  if (isEditMode) exitToHomeState();
  document.querySelector('.page-title').textContent = 'Add Service';
});




fetchServices();
setInterval(() => fetch('/api/services/ping').then(fetchServices), 3000);

/**
 * Logout handler
 */
const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', async function (e) {
        e.preventDefault();
        submitForm({
            form: null,
            url: '/logout',
            method: 'GET',
            loadingTitle: 'Logging out...',
            successTitle: 'Logged Out!',
            errorTitle: 'Logout Failed',
        });
    });
}