/* Main JavaScript Login */

/**
 * Login form submission
 */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const payload = new URLSearchParams(formData);

        submitForm({
            form: loginForm,
            url: '/',
            loadingTitle: 'Logging in...',
            successTitle: 'Login successful!',
            errorTitle: 'Login failed',
            body: payload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    });
}


/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark-mode');
    const themeToggleInput = document.getElementById('themeToggleInput');

    // Update checkbox state
    if (themeToggleInput) {
        themeToggleInput.checked = isDark;
    }

    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Get saved theme from localStorage or system preference
 * @returns {string} 'dark' or 'light'
 */
function getCurrentTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (prefersDark ? 'dark' : 'light');
}

function initializeThemeToggleBtn() {
    const themeToggleInput = document.getElementById('themeToggleInput');

    if (themeToggleInput) {
        themeToggleInput.addEventListener('change', toggleTheme);
    }
}

initializeThemeToggleBtn();


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

