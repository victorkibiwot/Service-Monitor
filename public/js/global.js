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