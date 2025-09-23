// Dummy store for now (replace with API later)
let contacts = [];

// Render contacts to grid
function renderContacts(filter = "") {
  const container = document.getElementById("contactsContainer");
  container.innerHTML = "";

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.phone.includes(filter) ||
    c.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted">No contacts found.</p>`;
    return;
  }

  filtered.forEach(contact => {
    const card = document.createElement("div");
    card.className = "col-md-4";
    card.innerHTML = `
      <div class="contact-card">
        <div class="contact-info">
          <h5>${contact.name}</h5>
          <p><i class="bi bi-telephone me-1"></i> ${contact.phone}</p>
          <p><i class="bi bi-envelope me-1"></i> ${contact.email}</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" onclick="editContact('${contact.id}')">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteContact('${contact.id}')">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Show Add Modal
function showAddContactModal() {
  document.getElementById("addContactForm").reset();
  const modal = new bootstrap.Modal(document.getElementById("addContactModal"));
  modal.show();
}

// Add Contact
document.getElementById("addContactForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("contactName").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const email = document.getElementById("contactEmail").value.trim();

  const newContact = { id: Date.now().toString(), name, phone, email };
  contacts.push(newContact);

  bootstrap.Modal.getInstance(document.getElementById("addContactModal")).hide();
  renderContacts();
});

// Edit Contact
function editContact(id) {
  const contact = contacts.find(c => c.id === id);
  if (!contact) return;

  document.getElementById("editContactId").value = contact.id;
  document.getElementById("editContactName").value = contact.name;
  document.getElementById("editContactPhone").value = contact.phone;
  document.getElementById("editContactEmail").value = contact.email;

  const modal = new bootstrap.Modal(document.getElementById("editContactModal"));
  modal.show();
}

// Update Contact
document.getElementById("editContactForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = document.getElementById("editContactId").value;
  const name = document.getElementById("editContactName").value.trim();
  const phone = document.getElementById("editContactPhone").value.trim();
  const email = document.getElementById("editContactEmail").value.trim();

  const index = contacts.findIndex(c => c.id === id);
  if (index !== -1) {
    contacts[index] = { id, name, phone, email };
  }

  bootstrap.Modal.getInstance(document.getElementById("editContactModal")).hide();
  renderContacts();
});

// Delete Contact
function deleteContact(id) {
  Swal.fire({
    title: "Are you sure?",
    text: "This contact will be deleted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel"
  }).then(result => {
    if (result.isConfirmed) {
      contacts = contacts.filter(c => c.id !== id);
      renderContacts();
      Swal.fire("Deleted!", "The contact has been removed.", "success");
    }
  });
}

// Search
document.getElementById("contactSearchInput").addEventListener("input", e => {
  renderContacts(e.target.value);
});

// Initial render (empty state)
renderContacts();
