/* Shared Utility Functions for Form Submission, File Upload, and Ticket Actions */

/**
 * Handle form submission with SweetAlert2 feedback
 * @param {HTMLFormElement} form - The form element
 * @param {string} url - The endpoint to send the request to
 * @param {string} method - HTTP method (default: POST)
 * @param {string} loadingTitle - Title for loading alert
 * @param {string} successTitle - Title for success alert
 * @param {string} errorTitle - Title for error alert
 * @param {FormData|URLSearchParams} body - Form data or URL-encoded payload
 * @param {Object} headers - Additional headers (e.g., CSRF-Token)
 * @returns {Promise<void>}
 */

async function submitForm({ form, url, method = 'POST', loadingTitle, successTitle, errorTitle, body, headers = {} }) {
    try {
        Swal.fire({
            title: loadingTitle,
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(url, { method, headers, body });
        const data = await response.json();
        Swal.close();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: successTitle,
                text: data.message || `${successTitle} successfully!`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = data.redirect || '/';
            });
        } else if (data.forbidden) {
            Swal.fire({
                icon: 'warning',
                title: 'Forbidden',
                text: data.message || 'Action not allowed.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                if (data.redirect) window.location.href = data.redirect;
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: errorTitle,
                text: data.message || 'Something went wrong. Please try again.'
            }).then(() => {
                if (data.redirect) window.location.href = data.redirect;
            });
        }
    } catch (err) {
        console.error(`${errorTitle} error:`, err);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Unexpected Error',
            text: 'Please try again later.'
        });
    }
}

/**
 * Initialize file upload handling
 * @param {string} fileInputId - ID of the file input element
 * @param {string} customButtonId - ID of the custom file button
 * @param {string} fileListId - ID of the file list container
 * @returns {Array} - Array of selected files
 */
function initFileUpload(fileInputId, customButtonId, fileListId) {
    const fileInput = document.getElementById(fileInputId);
    const customFileButton = document.getElementById(customButtonId);
    const fileListContainer = document.getElementById(fileListId);
    let selectedFiles = [];

    if (!fileInput || !customFileButton || !fileListContainer) return selectedFiles;

    customFileButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        });
        updateFileListDisplay();
    });

    function updateFileListDisplay() {
        fileListContainer.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');
            fileItem.innerHTML = `
                ${file.name}
                <span class="remove-file" data-index="${index}">✖</span>
            `;
            fileListContainer.appendChild(fileItem);
        });

        const removeButtons = fileListContainer.querySelectorAll('.remove-file');
        removeButtons.forEach(button => {
            button.addEventListener('click', function () {
                const index = parseInt(this.getAttribute('data-index'));
                selectedFiles.splice(index, 1);
                updateFileListDisplay();
            });
        });
    }

    return selectedFiles;
}

/**
 * Close a ticket
 * @param {string} ticketId - The ticket ID
 * @param {string} csrfToken - CSRF token
 */
async function closeTicket(ticketId, csrfToken) {
    Swal.fire({
        title: 'Are you sure you want to close this ticket?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Close it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            submitForm({
                form: null,
                url: `/tickets/close?ticketId=${ticketId}`,
                loadingTitle: 'Closing ticket...',
                successTitle: 'Closed!',
                errorTitle: 'Error!',
                headers: { 'CSRF-Token': csrfToken }
            });
        }
    });
}

/**
 * Mark a ticket as resolved
 * @param {string} ticketId - The ticket ID
 * @param {string} csrfToken - CSRF token
 */
async function markAsResolved(ticketId, csrfToken) {
    Swal.fire({
        title: 'Mark this ticket as resolved?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Mark as Resolved'
    }).then((result) => {
        if (result.isConfirmed) {
            submitForm({
                form: null,
                url: `/tickets/resolve?ticketId=${ticketId}`,
                loadingTitle: 'Marking as resolved...',
                successTitle: 'Resolved!',
                errorTitle: 'Error!',
                headers: { 'CSRF-Token': csrfToken }
            });
        }
    });
}

/**
 * Display error or success notifications from URL parameters
 */
function showNotifications() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: decodeURIComponent(error),
            timer: 1500,
            showConfirmButton: false
        });
    } else if (success) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: decodeURIComponent(success),
            timer: 1500,
            showConfirmButton: false
        });
    }
}