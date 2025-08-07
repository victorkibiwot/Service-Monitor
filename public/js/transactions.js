const ctx = document.getElementById('transactionChart').getContext('2d');

const txChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Daily Transactions',
      data: [],
      borderColor: '#0d6efd',
      backgroundColor: 'rgba(13, 110, 253, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: {
        title: { display: true, text: 'Time' },
        ticks: {
          callback: (val, index) => {
            const label = txChart.data.labels[index];
            return label ? new Date(label).toLocaleTimeString() : '';
          }
        }
      },
      y: {
        title: { display: true, text: 'Transactions' },
        beginAtZero: false, // Allow dynamic minimum
        ticks: {
          callback: function (value) {
            return value.toLocaleString(); // Optional: format with commas
          }
        }
      }
    },
    plugins: {
      legend: { display: false }
    }
  }
});


let lastSeq = null;
let lastChange = null;
const txHistory = [];

const fetchSequenceData = async () => {
  try {
    const res = await fetch('/api/latest-sequence');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch sequence data:', err);
    return null;
  }
};

const updateMonitor = async () => {
    const data = await fetchSequenceData();
    if (!data || data.code === 500) return;

    const now = new Date();
    const seq = data.latest_sequence;
    const txCount = data.daily_transactions;
    const fetchTime = new Date(data.last_updated);

    const diffMins = lastSeq === seq && lastChange
    ? (now - lastChange) / 60000
    : 0;

    let status = 'operational', badge = 'bg-success', icon = 'bi-check-circle';
    if (diffMins > 30) [status, badge, icon] = ['critical', 'bg-danger', 'bi-exclamation-triangle'];
    else if (diffMins > 20) [status, badge, icon] = ['warning', 'bg-warning', 'bi-exclamation-triangle'];

    // Update daily transactions with glow animation
    const txEl = document.getElementById('dailyTransactionsValue');
    const newText = Number(txCount).toLocaleString();
    if (txEl && txEl.textContent !== newText) {
        txEl.textContent = newText;
        txEl.classList.remove('daily-glow');
        void txEl.offsetWidth; // force reflow
        txEl.classList.add('daily-glow');
    }

    // Simple text updates for others (no animation)
    document.getElementById('latestSequence').textContent = `Latest sequence: ${seq}`;
    document.getElementById('latestUpdated').textContent = `Latest Transaction: ${fetchTime.toLocaleString()}`;
    document.getElementById('statusBadge').className = `badge ${badge} fs-5 px-3 py-2 mb-2 d-inline-block`;
    document.getElementById('statusBadge').innerHTML = `<i class="bi ${icon} me-1"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}`;

    if (seq !== lastSeq) {
        lastSeq = seq;
        lastChange = now;
    }

    // Maintain last 1 hour of history
    txHistory.push({ time: fetchTime, txCount });
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    while (txHistory.length && new Date(txHistory[0].time).getTime() < oneHourAgo) {
    txHistory.shift();
    }

    // Update chart
    txChart.data.labels = txHistory.map(entry => entry.time);
    txChart.data.datasets[0].data = txHistory.map(entry => entry.txCount);

    // Dynamically adjust Y-axis scale
    const values = txChart.data.datasets[0].data;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = Math.max(10, (maxVal - minVal) * 0.1); // Add 10% buffer or at least 10

    txChart.options.scales.y.min = Math.floor(minVal - padding);
    txChart.options.scales.y.max = Math.ceil(maxVal + padding);

    txChart.update();

};

// Initial run + schedule every 5 seconds
updateMonitor();
setInterval(updateMonitor, 5000);
