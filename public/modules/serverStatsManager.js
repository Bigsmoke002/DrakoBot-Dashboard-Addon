// addons/dashboard/public/modules/serverStatsManager.js

const ServerStatsManager = {
  loadServerStats(selectedServerId) {
    if (!selectedServerId) return;
    
    const container = document.getElementById('server-stats-data');
    container.innerHTML = '<div class="loading">Lade Server-Statistiken...</div>';
    
    fetch(`/server-stats/${selectedServerId}`)
      .then(res => res.json())
      .then(stats => {
        container.innerHTML = this.createServerStatsHTML(stats);
      })
      .catch(err => {
        console.error("Error loading server stats:", err);
        container.innerHTML = '<p>Fehler beim Laden der Server-Statistiken.</p>';
      });
  },

  createServerStatsHTML(stats) {
    return `
      <div class="server-info-section">
        <h3>Server-Informationen</h3>
        <div class="stats-grid">
          <div class="stats-item">
            <span class="stats-label">Server-Name:</span>
            <span class="stats-value">${stats.serverInfo.name}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Server-ID:</span>
            <span class="stats-value">${stats.serverInfo.id}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Erstellt am:</span>
            <span class="stats-value">${new Date(stats.serverInfo.createdAt).toLocaleString()}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Owner-ID:</span>
            <span class="stats-value">${stats.serverInfo.ownerId}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Boost Level:</span>
            <span class="stats-value">${stats.serverInfo.boostLevel}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Region/Locale:</span>
            <span class="stats-value">${stats.serverInfo.region}</span>
          </div>
        </div>
      </div>
      
      <div class="member-stats-section">
        <h3>Mitgliederstatistiken</h3>
        <div class="member-overview">
          <div class="stat-box total-members">
            <span class="stat-number">${stats.memberStats?.total || stats.memberCount}</span>
            <span class="stat-description">Gesamte Mitglieder</span>
          </div>
          <div class="stat-box human-members">
            <span class="stat-number">${stats.memberStats?.humans || 'N/A'}</span>
            <span class="stat-description">Menschen</span>
          </div>
          <div class="stat-box bot-members">
            <span class="stat-number">${stats.memberStats?.bots || 'N/A'}</span>
            <span class="stat-description">Bots</span>
          </div>
        </div>
        
        <div class="time-periods">
          ${this.createTimePeriodHTML('Letzte 24 Stunden', stats.stats24)}
          ${this.createTimePeriodHTML('Letzte 7 Tage', stats.stats7)}
          ${this.createTimePeriodHTML('Letzter Monat', stats.stats30)}
        </div>
      </div>
    `;
  },

  createTimePeriodHTML(title, stats) {
    return `
      <div class="time-period">
        <h4>${title}</h4>
        <div class="stats-grid">
          <div class="stats-item">
            <span class="stats-label">Beigetreten:</span>
            <span class="stats-value">${stats.joined}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Verlassen:</span>
            <span class="stats-value">${stats.left}</span>
          </div>
          <div class="stats-item">
            <span class="stats-label">Netto:</span>
            <span class="stats-value ${stats.net > 0 ? 'positive' : stats.net < 0 ? 'negative' : ''}">${stats.net > 0 ? '+' : ''}${stats.net}</span>
          </div>
        </div>
      </div>
    `;
  }
};