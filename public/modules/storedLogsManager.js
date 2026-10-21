// addons/dashboard/public/modules/storedLogsManager.js

const StoredLogsManager = {
  setupEventListeners() {
    const loadBtn = document.getElementById('load-stored-logs');
    const exportBtn = document.getElementById('export-logs');
    
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.handleLoadStoredLogs());
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportLogs());
    }
  },

  handleLoadStoredLogs() {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    if (!selectedServerId) {
      alert('Bitte wählen Sie zuerst einen Server aus.');
      return;
    }
    
    const logType = document.getElementById('stored-log-type').value;
    this.loadStoredLogs(selectedServerId, logType);
  },

  handleExportLogs() {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    if (!selectedServerId) {
      alert('Bitte wählen Sie zuerst einen Server aus.');
      return;
    }
    
    const logType = document.getElementById('stored-log-type').value;
    this.exportLogs(selectedServerId, logType);
  },

  loadStoredLogs(selectedServerId, logType) {
    const container = document.getElementById('stored-log-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Lade gespeicherte Logs...</div>';
    
    fetch(`/logs/${selectedServerId}/${logType}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(logs => {
        this.renderStoredLogs(container, logs, logType);
      })
      .catch(err => {
        console.error("Error loading stored logs:", err);
        container.innerHTML = `<div class="error">Fehler beim Laden der Logs: ${err.message}</div>`;
      });
  },

  renderStoredLogs(container, logs, logType) {
    container.innerHTML = '';
    
    if (!logs || logs.length === 0) {
      container.innerHTML = '<p>Keine gespeicherten Logs gefunden.</p>';
      return;
    }
    
    const logsList = document.createElement('ul');
    logsList.className = 'stored-logs-list';
    
    logs.forEach(event => {
      const listItem = this.createLogListItem(event, logType);
      logsList.appendChild(listItem);
    });
    
    container.appendChild(logsList);
    
    // Statistiken anzeigen
    const statsDiv = document.createElement('div');
    statsDiv.className = 'logs-stats';
    statsDiv.innerHTML = `<p>Gefunden: ${logs.length} ${logType} Einträge</p>`;
    container.insertBefore(statsDiv, logsList);
  },

  createLogListItem(event, logType) {
    const li = document.createElement('li');
    li.className = 'log-item';
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = window.dashboardGlobals.formatTimestamp(event.timestamp);
    
    const eventSpan = document.createElement('span');
    eventSpan.className = 'log-event';
    
    // Format basierend auf Log-Typ
    const eventText = this.formatLogEvent(event, logType);
    eventSpan.innerHTML = eventText;
    
    li.appendChild(timestampSpan);
    li.appendChild(eventSpan);
    
    return li;
  },

  formatLogEvent(event, logType) {
    const eventType = event.event_type || logType;
    const data = event.data || event;
    
    switch (eventType) {
      case 'messageCreate':
        return `<strong>${data.author}</strong> schrieb in <em>#${data.channel}</em>: ${data.content}`;
      case 'messageDelete':
        return `Nachricht von <strong>${data.author}</strong> in <em>#${data.channel}</em> wurde gelöscht`;
      case 'guildMemberAdd':
        return `<strong>${data.user}</strong> ist dem Server beigetreten`;
      case 'guildMemberRemove':
        return `<strong>${data.user}</strong> hat den Server verlassen`;
      case 'presenceUpdate':
        return `<strong>${data.user}</strong> Status: ${data.oldStatus} → ${data.newStatus}`;
      case 'usernameChange':
        return `<strong>${data.old_username}</strong> → <strong>${data.new_username}</strong>`;
      case 'auditLog':
        return `Audit: ${data.action} von ${data.executor}`;
      default:
        return `${eventType}: ${JSON.stringify(data)}`;
    }
  },

  exportLogs(selectedServerId, logType) {
    const url = `/export-logs/${selectedServerId}/${logType}`;
    window.open(url, '_blank');
  },

  getLogTypeDisplayName(logType) {
    const typeNames = {
      'messageCreate': 'Neue Nachrichten',
      'messageDelete': 'Gelöschte Nachrichten',
      'guildMemberAdd': 'Mitglied beigetreten',
      'guildMemberRemove': 'Mitglied verlassen',
      'presenceUpdate': 'Statusänderungen',
      'usernameChange': 'Namensänderungen',
      'auditLog': 'Audit Log'
    };
    
    return typeNames[logType] || logType;
  }
};