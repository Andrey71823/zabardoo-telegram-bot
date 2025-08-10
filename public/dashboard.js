const metricsEl = document.getElementById('metrics');
const activityEl = document.getElementById('activity');
const barChartEl = document.getElementById('barChart');

function mockData() {
  return {
    metrics: [
      { label: 'Total Users', value: '1,24,567', delta: 3.8 },
      { label: 'Active Today', value: '8,644', delta: 1.2 },
      { label: 'Revenue (₹)', value: '₹42,75,600', delta: 4.3 },
      { label: 'Conversion Rate', value: '4.2%', delta: 0.3 },
      { label: 'Total Cashback', value: '₹2,14,560', delta: 2.1 },
      { label: 'Uptime', value: '99.96%', delta: 0.01 }
    ],
    usersDaily: [52,54,58,56,60,62,59,61,64,66,65,68,70,72,71,74,76,75,78,80,79,82,84,83,86,88,87,90,92,91],
    activity: [
      { text: 'New coupon approved: Flipkart Electronics', time: '2m' },
      { text: 'Campaign sent to 12,400 users', time: '12m' },
      { text: 'Top user redeemed cashback ₹450', time: '25m' },
      { text: 'Myntra Fashion deals synced', time: '48m' },
      { text: 'System health OK – CPU 32%', time: '1h' }
    ]
  };
}

function renderMetrics(data){
  if(!metricsEl) return;
  metricsEl.innerHTML = '';
  const icons = ['fas fa-users','fas fa-user-check','fas fa-rupee-sign','fas fa-chart-line','fas fa-gift','fas fa-server'];
  const iconClasses = ['primary','success','warning','info','success','info'];
  for(let i=0;i<data.metrics.length;i++){
    const m = data.metrics[i];
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="card-body">
        <div class="metric-icon ${iconClasses[i]}"><i class="${icons[i]}"></i></div>
        <h3>${m.label}</h3>
        <div class="metric-value">${m.value}</div>
        <div class="metric-sub ${m.delta>=0?'delta-up':'delta-down'}">
          <i class="fas fa-arrow-${m.delta>=0?'up':'down'}"></i>${Math.abs(m.delta).toFixed(1)}% from last week
        </div>
      </div>`;
    metricsEl.appendChild(div);
  }
}

function renderActivity(list){
  if(!activityEl) return;
  activityEl.innerHTML = '';
  for(const a of list){
    const row = document.createElement('div');
    row.className = 'activity-item';
    row.innerHTML = `<span>${a.text}</span><span class="muted">${a.time} ago</span>`;
    activityEl.appendChild(row);
  }
}

function renderBarChart(data){
  if(!barChartEl) return;
  barChartEl.innerHTML='';
  const maxValue = Math.max(...data.usersDaily);
  for (const v of data.usersDaily){
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (v / maxValue * 100) + '%';
    barChartEl.appendChild(bar);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const d = mockData();
  renderMetrics(d);
  renderActivity(d.activity);
  renderBarChart(d);
});


