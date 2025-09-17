async function fetchSessionData() {
  try {
    const response = await fetch('/api/inactive-sessions');
    if (!response.ok) throw new Error('Network response not ok');

    const { inactive_user_sessions, total_inactive_sessions, time } = await response.json();

    // Update total inactive
    document.getElementById('sessTotal').textContent = total_inactive_sessions;

    // Convert time (assuming it's microseconds or nanoseconds)
    const formattedTime = formatTimestamp(time);
    document.getElementById('sessUpdated').textContent = formattedTime;

    // Update badge
    const badge = document.getElementById('badgeStatus');
    let badgeClass = 'badge-good';
    let badgeText = 'Operational';
    let badgeIcon = 'bi-check-circle-fill';

    if (total_inactive_sessions >= 1000) {
    badgeClass = 'badge-critical';
    badgeText = 'Critical';
    badgeIcon = 'bi-exclamation-triangle-fill';
    } else if (total_inactive_sessions >= 700) {
    badgeClass = 'badge-warning';
    badgeText = 'Warning';
    badgeIcon = 'bi-exclamation-triangle-fill';
    }

    badge.className = `badge fs-5 px-3 py-2 mb-2 mt-2 d-inline-block ${badgeClass}`;
    badge.innerHTML = `<i class="bi ${badgeIcon} me-1"></i> ${badgeText}`;


    // Update user table
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    inactive_user_sessions.forEach(user => {
      let rowClass = user.session_count >= 100 ? 'row-critical'
                    : user.session_count >= 50 ? 'row-warning'
                    : 'row-good';

      tbody.innerHTML += `
        <tr class="${rowClass}">
          <td><i class="bi bi-person-circle me-2"></i> ${user.username}</td>
          <td>${user.module}</td>
          <td>${user.machine}</td>
          <td>${user.program}</td>
          <td>${user.session_count}</td>
        </tr>`;
    });

  } catch (err) {
    console.error('Failed to fetch session data:', err);
  }
}

// Convert timestamp -> readable
function formatTimestamp(raw) {
  // Example: raw = 175890030451556 (nanoseconds since epoch)
  let millis = Math.floor(raw / 1000); 
  const date = new Date(millis);
  return date.toLocaleString(); // e.g., "9/17/2025, 1:30:45 PM"
}

// Initial fetch
fetchSessionData();
// Refresh every minute
setInterval(fetchSessionData, 60 * 1000);

