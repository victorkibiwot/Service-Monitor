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

    console.log(res); // For debugging

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




const renderServices = (services) => {
    const container = document.getElementById('servicesContainer');
    container.innerHTML = '';
    services.forEach(({ name, endpoint, status, last_checked }) => {
    const color = status?.toUpperCase() === 'UP' ? 'success' : status?.toUpperCase() === 'DOWN' ? 'danger' : 'warning';
    container.innerHTML += `
        <div class="col-md-4">
        <div class="card border-${color} shadow h-100">
            <div class="card-body">
            <h5 class="card-title text-${color}">${name}</h5>
            <p class="card-text small">${endpoint}</p>
            <p class="card-text"><strong>Status:</strong> <span class="badge bg-${color}">${status || 'UNKNOWN'}</span></p>
            <p class="card-text"><small class="text-muted">Last checked: ${last_checked ? new Date(last_checked).toLocaleString() : 'Never'}</small></p>
            </div>
        </div>
        </div>
    `;
    });
};

const showAddModal = () => new bootstrap.Modal(document.getElementById('addServiceModal')).show();

document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('serviceName').value.trim();
    const endpoint = document.getElementById('serviceUrl').value.trim();
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    const res = await fetch('/api/services', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
     },
    body: JSON.stringify({ name, endpoint  })
    });

    if (res.ok) {
    bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
    fetchServices();
    Swal.fire('Success', 'Service added!', 'success');
    } else {
    const err = await res.json();
    Swal.fire('Error', err.error || 'Failed to add service', 'error');
    }
});

fetchServices();
setInterval(() => fetch('/api/services/ping').then(fetchServices), 5000);


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