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



// --- KPLC Chart ---
const kplcLineCtx = document.getElementById('kplcLineChart').getContext('2d');
const kplcLineChart = new Chart(kplcLineCtx, {
  type: 'line',
  data: { labels: [], datasets: [
    { label: 'All', data: [], borderColor: 'blue', backgroundColor: 'rgba(0,0,255,0.1)', tension: 0.3, fill: true },
    { label: 'Processed', data: [], borderColor: 'gold', backgroundColor: 'rgba(255,215,0,0.1)', tension: 0.3, fill: true }
  ]},
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 50 } } },
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true }
    }
  }
});



const kplcPieCtx = document.getElementById('kplcStackedChart').getContext('2d');
const kplcPieChart = new Chart(kplcPieCtx, {
  type: 'doughnut',
  data: {
    labels: ['Successful', 'Failed'],
    datasets: [{
      data: [0, 0, 0, 0], // will update dynamically
      backgroundColor: [
        'rgba(0,128,0,0.7)',       // green
        'rgba(255,0,0,0.7)'        // red
      ],
      borderWidth: 0.2,
      radius: '50%',
      cutout: '60%'
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 20
        }
      },
      datalabels: {
        color: (ctx) => {
            const bg = ctx.dataset.backgroundColor[ctx.dataIndex];
            return bg; 
            },
        align: 'end',   
        anchor: 'end',  
        formatter: (value) => value.toLocaleString(),
        font: { weight: 'bold' }
      }
    }
  },
  plugins: [ChartDataLabels]
});




const kplcHistory = [];

// --- Fetch all kplc ---
const fetchKplcHistory = async () => {
  try {
    const res = await fetch('/getKplcTransactionData');
    const data = await res.json();
    if (data.code !== 200 || !Array.isArray(data.transactions)) return [];

    return data.transactions.map(item => ({
      time: new Date(Number(item.sysTime)),
      all: item.all,
      processed: item.processed,
      success: item.successful,
      failed: item.failed
    }));
  } catch (err) {
    console.error("Failed to fetch KPLC history:", err);
    return [];
  }
};

const fetchKplcLatest = async () => {
  try {
    const res = await fetch('/getSingleKplcTransactionData');
    const data = await res.json();
    if (data.code !== 200 || !data.transactions) return null;

    const t = data.transactions;
    return {
      time: new Date(Number(t.sysTime)),
      all: t.all,
      processed: t.processed,
      success: t.successful,
      failed: t.failed
    };
  } catch (err) {
    console.error("Failed to fetch latest KPLC data:", err);
    return null;
  }
};

// --- Update KPLC Chart ---
const updateKplcChart = () => {
  const labels = kplcHistory.map(e => e.time.toLocaleTimeString());

  // Line chart update
  kplcLineChart.data.labels = labels;
  kplcLineChart.data.datasets[0].data = kplcHistory.map(e => e.all);
  kplcLineChart.data.datasets[1].data = kplcHistory.map(e => e.processed);
  kplcLineChart.update();

// --- Pie chart update (latest snapshot) ---
  const latest = kplcHistory[kplcHistory.length - 1];
    if (latest) {
    kplcPieChart.data.datasets[0].data = [
        latest.success,
        latest.failed
    ];
    kplcPieChart.update();
    }

};

// --- Initialize ---
const loadKplcHistory = async () => {
  const data = await fetchKplcHistory();
  kplcHistory.length = 0;
  kplcHistory.push(...data);
  updateKplcChart();
};

let failStreak = 0;

const updateKplcMonitor = async () => {
  const latest = await fetchKplcLatest();
  if (!latest) return;

  // keep previous value
  const prev = kplcHistory[kplcHistory.length - 1];

  kplcHistory.push(latest);
  if (kplcHistory.length > 30) kplcHistory.shift();
  updateKplcChart();

  // Update badge & metrics
  document.getElementById('kplcAll').textContent = latest.all;
  document.getElementById('kplcProcessed').textContent = latest.processed;
  document.getElementById('kplcSuccess').textContent = latest.success;
  document.getElementById('kplcFailed').textContent = latest.failed;
  document.getElementById('kplcUpdated').textContent = latest.time.toLocaleString();

  // Badge logic (simplified for now)
  // --- Default badge setup
  let badge = 'bg-success',
      status = 'operational',
      icon = 'bi-check-circle';

  // --- Stale detection ---
  // Compare first and last entry in history
  let staleValues = false;
  if (kplcHistory.length > 1) {
    const first = kplcHistory[0];
    const last = kplcHistory[kplcHistory.length - 1];

    staleValues =
      first.all === last.all &&
      first.processed === last.processed &&
      first.success === last.success &&
      first.failed === last.failed;
  }

  const now = new Date();
  const diffMins = (now - latest.time) / 60000;
  const ratioProcessed = latest.all > 0 ? latest.processed / latest.all : 1;
  const failRate = latest.success > 0 ? latest.failed / latest.success : (latest.failed > 0 ? 1 : 0);

  // Track fail streak
  if (prev) {
    if (latest.failed > prev.failed) {
      // new fail happened
      failStreak++;
    } else if (latest.processed > prev.processed) {
      // new transaction(s) processed but no fail increase -> success in between
      failStreak = 0;
    } else {
      // nothing new processed, just holding steady (no change in metrics)
      // keep current failStreak as-is
    }
  }

  // --- Priority rules ---
  if (diffMins > 30 || staleValues) {
    badge = 'bg-danger';
    status = 'Critical: stale data';
    icon = 'bi-exclamation-triangle';
  } else if (diffMins > 15) {
    badge = 'bg-warning';
    status = 'Delayed updates';
    icon = 'bi-exclamation-triangle';
  } else if (failStreak >= 10) {
    badge = 'bg-danger';
    status = 'Critical: consecutive fails';
    icon = 'bi-exclamation-triangle';
  } else if (failStreak >= 5) {
    badge = 'bg-warning';
    status = 'Repeated fails';
    icon = 'bi-exclamation-triangle';
  } else if (failRate > 0.5) {
    badge = 'bg-danger';
    status = 'Critical: high failure rate';
    icon = 'bi-exclamation-triangle';
  } else if (failRate > 0.3) {
    badge = 'bg-warning';
    status = 'Elevated failures';
    icon = 'bi-exclamation-triangle';
  } else if (ratioProcessed < 0.5) {
    badge = 'bg-warning';
    status = 'Processing backlog';
    icon = 'bi-exclamation-triangle';
  }

  // --- Update badge UI ---
  document.getElementById('kplcStatusBadge').className = `badge ${badge} fs-5 px-3 py-2 mb-2 d-inline-block`;
  document.getElementById('kplcStatusBadge').innerHTML =
    `<i class="bi ${icon} me-1"></i> ${status}`;
};


document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("#txnToggle .txn-btn");
  const tabs = document.querySelectorAll(".tab-pane");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;

      // Update active button
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Show selected tab, hide others
      tabs.forEach(tab => tab.classList.add("d-none"));
      const activeTab = document.getElementById(type + "Tab");
      if (activeTab) {
        activeTab.classList.remove("d-none");
      }

      // Handle KPLC-specific case
      if (type === 'kplc') {
        loadKplcHistory().then(() => updateKplcMonitor());
        if (!window.kplcInterval) {
            window.kplcInterval = setInterval(updateKplcMonitor, 60000); // every 1 min
        }
      }
    });
  });
});


