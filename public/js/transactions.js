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
        beginAtZero: false,
        ticks: {
          callback: (value) => value.toLocaleString()
        }
      }
    },
    plugins: { legend: { display: false } }
  }
});

// --- API calls ---
const fetchHistory = async () => {
  try {
    const res = await fetch('/api/history');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch history:', err);
    return null;
  }
};

const fetchLatestData = async () => {
  try {
    const res = await fetch('/api/latest-sequence');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch latest data:', err);
    return null;
  }
};

let lastSeq = null;
let lastTxCount = null;
let lastChange = null;
const txHistory = [];

// --- Chart updates ---
const updateChart = () => {
  txChart.data.labels = txHistory.map(entry => entry.time);
  txChart.data.datasets[0].data = txHistory.map(entry => entry.txCount);

  const values = txChart.data.datasets[0].data;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = Math.max(10, (maxVal - minVal) * 0.1);

  txChart.options.scales.y.min = Math.floor(minVal - padding);
  txChart.options.scales.y.max = Math.ceil(maxVal + padding);

  txChart.update();
};

// --- Initial history load ---
const loadInitialHistory = async () => {
  const data = await fetchHistory();
  if (!data || data.code !== 200 || !Array.isArray(data.transactions)) return;
  console.log(data);
  
  txHistory.length = 0; // Clear old data
  data.transactions.forEach(item => {
    txHistory.push({
      time: new Date(Number(item.sysTime)),
      txCount: item.tranNumber
    });
  });

  updateChart();

  // Initialize last known values from the latest history entry
  if (txHistory.length > 0) {
    const latest = txHistory[txHistory.length - 1];
    lastTxCount = latest.txCount;
    lastChange = latest.time;   // 🔑 set baseline from history
    lastSeq = null;             // will be filled on first live fetch
  }
};

// --- Incremental update ---
const updateMonitor = async () => {
  const data = await fetchLatestData();
  if (!data || data.code === 500) return;

  const now = new Date();
  const seq = data.latest_sequence;
  const txCount = data.daily_transactions;
  const fetchTime = new Date(Number(data.time));

  // Case 1: Initial run (no lastSeq yet) → trust history baseline
  if (lastSeq === null) {
    lastSeq = seq;          // initialize it
    lastTxCount = txCount;  // initialize
    // lastChange was already set in loadInitialHistory()
    // ✅ don't overwrite lastChange here
  }
  // Case 2: Subsequent runs → only update lastChange if data actually changed
  else if (seq !== lastSeq || txCount !== lastTxCount) {
    lastSeq = seq;
    lastTxCount = txCount;
    lastChange = now;  
  }

  // Always compute diffMins against lastChange
  const diffMins = lastChange ? (now - lastChange) / 60000 : 0;

  let status = 'operational', badge = 'bg-success', icon = 'bi-check-circle';
  if (diffMins > 30) [status, badge, icon] = ['critical', 'bg-danger', 'bi-exclamation-triangle'];
  else if (diffMins > 20) [status, badge, icon] = ['warning', 'bg-warning', 'bi-exclamation-triangle'];

  // --- Update UI ---
  const txEl = document.getElementById('dailyTransactionsValue');
  const newText = Number(txCount).toLocaleString();
  if (txEl && txEl.textContent !== newText) {
    txEl.textContent = newText;
    txEl.classList.remove('daily-glow');
    void txEl.offsetWidth;
    txEl.classList.add('daily-glow');
  }

  document.getElementById('latestSequence').textContent = `Latest sequence: ${seq}`;
  document.getElementById('latestUpdated').textContent = `Latest Transaction: ${fetchTime.toLocaleString()}`;
  document.getElementById('statusBadge').className = `badge ${badge} fs-5 px-3 py-2 mb-2 d-inline-block`;
  document.getElementById('statusBadge').innerHTML = `<i class="bi ${icon} me-1"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  // --- Keep chart updated ---
  txHistory.push({ time: fetchTime, txCount });
  if (txHistory.length > 30) {
    txHistory.shift();
  }
  updateChart();
};

// --- Run everything ---
(async () => {
  await loadInitialHistory().then(() => {
    updateMonitor();
  });
  setInterval(updateMonitor, 60000);
})();


document.querySelectorAll('#txnToggle .txn-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#txnToggle .txn-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Example: use data-type attribute to filter or update UI
        const selectedType = this.getAttribute('data-type');
        console.log('Selected Transaction Type:', selectedType);
        // You can trigger your data loading here...
    });
});
