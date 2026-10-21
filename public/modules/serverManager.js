// addons/dashboard/public/modules/serverManager.js
const ServerManager = {
  handleServerListUpdate(servers, selectedServerId) {
    const serverSelector = document.getElementById('server-selector');
    serverSelector.innerHTML = '';
    
    const activeServers = servers.filter(server => server.active);
    if (activeServers.length > 0) {
      const activeOptgroup = document.createElement('optgroup');
      activeOptgroup.label = 'Aktive Server';
      
      activeServers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = server.name;
        activeOptgroup.appendChild(option);
      });
      
      serverSelector.appendChild(activeOptgroup);
    }
    
    const inactiveServers = servers.filter(server => !server.active);
    if (inactiveServers.length > 0) {
      const inactiveOptgroup = document.createElement('optgroup');
      inactiveOptgroup.label = 'Inaktive Server';
      
      inactiveServers.forEach(server => {
        const option = document.createElement('option');
        option.value = server.id;
        option.textContent = `${server.name} (verlassen: ${new Date(server.leftAt).toLocaleDateString()})`;
        option.disabled = true;
        inactiveOptgroup.appendChild(option);
      });
      
      serverSelector.appendChild(inactiveOptgroup);
    }
    
    if (activeServers.length > 0 && !selectedServerId) {
      window.dashboardGlobals.setSelectedServerId(activeServers[0].id);
      serverSelector.value = activeServers[0].id;
    }
  }
};

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
          <div class="time-period">
            <h4>Letzte 24 Stunden</h4>
            <div class="stats-grid">
              <div class="stats-item">
                <span class="stats-label">Beigetreten:</span>
                <span class="stats-value">${stats.stats24.joined}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Verlassen:</span>
                <span class="stats-value">${stats.stats24.left}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Netto:</span>
                <span class="stats-value ${stats.stats24.net > 0 ? 'positive' : stats.stats24.net < 0 ? 'negative' : ''}">${stats.stats24.net > 0 ? '+' : ''}${stats.stats24.net}</span>
              </div>
            </div>
          </div>
          
          <div class="time-period">
            <h4>Letzte 7 Tage</h4>
            <div class="stats-grid">
              <div class="stats-item">
                <span class="stats-label">Beigetreten:</span>
                <span class="stats-value">${stats.stats7.joined}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Verlassen:</span>
                <span class="stats-value">${stats.stats7.left}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Netto:</span>
                <span class="stats-value ${stats.stats7.net > 0 ? 'positive' : stats.stats7.net < 0 ? 'negative' : ''}">${stats.stats7.net > 0 ? '+' : ''}${stats.stats7.net}</span>
              </div>
            </div>
          </div>
          
          <div class="time-period">
            <h4>Letzter Monat</h4>
            <div class="stats-grid">
              <div class="stats-item">
                <span class="stats-label">Beigetreten:</span>
                <span class="stats-value">${stats.stats30.joined}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Verlassen:</span>
                <span class="stats-value">${stats.stats30.left}</span>
              </div>
              <div class="stats-item">
                <span class="stats-label">Netto:</span>
                <span class="stats-value ${stats.stats30.net > 0 ? 'positive' : stats.stats30.net < 0 ? 'negative' : ''}">${stats.stats30.net > 0 ? '+' : ''}${stats.stats30.net}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

// addons/dashboard/public/modules/activeUsersManager.js
const ActiveUsersManager = {
  loadActive(selectedServerId) {
    if (!selectedServerId) return;
    
    const voiceContainer = document.getElementById('voice-activity-table');
    const chatContainer = document.getElementById('chat-activity-table');
    
    voiceContainer.innerHTML = '<div class="loading">Lade Voice-Aktivitäten...</div>';
    chatContainer.innerHTML = '<div class="loading">Lade Chat-Aktivitäten...</div>';
    
    fetch(`/active-users/${selectedServerId}`)
      .then(res => res.json())
      .then(data => {
        this.renderVoiceActivity(data.voiceUsers);
        this.renderChatActivity(data.recentMessages);
      })
      .catch(err => {
        console.error("Error loading active users:", err);
        voiceContainer.innerHTML = '<div class="error">Fehler beim Laden der Voice-Aktivitäten</div>';
        chatContainer.innerHTML = '<div class="error">Fehler beim Laden der Chat-Aktivitäten</div>';
      });
  },

  renderVoiceActivity(voiceUsers) {
    const container = document.getElementById('voice-activity-table');
    
    if (!voiceUsers || voiceUsers.length === 0) {
      container.innerHTML = '<p>Keine Benutzer in Voice-Channels</p>';
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'voice-activity-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Benutzer</th>
        <th>Channel</th>
        <th>Status</th>
        <th>Aktivitäten</th>
        <th>Voice-Status</th>
      </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    voiceUsers.forEach(user => {
      const row = document.createElement('tr');
      
      const userCell = document.createElement('td');
      userCell.innerHTML = `
        <div class="voice-user-info">
          <img src="${user.avatar}" class="voice-user-avatar" alt="${user.username}">
          <span>${user.username}</span>
        </div>
      `;
      row.appendChild(userCell);
      
      const channelCell = document.createElement('td');
      channelCell.textContent = user.channelName;
      row.appendChild(channelCell);
      
      const statusCell = document.createElement('td');
      statusCell.innerHTML = `<span class="status-dot status-${user.status}"></span> ${user.status}`;
      row.appendChild(statusCell);
      
      const activitiesCell = document.createElement('td');
      activitiesCell.textContent = user.activities.join(', ') || 'Keine';
      row.appendChild(activitiesCell);
      
      const voiceStatusCell = document.createElement('td');
      const voiceStatuses = [];
      if (user.muted) voiceStatuses.push('🔇 Stumm');
      if (user.deafened) voiceStatuses.push('🔕 Taub');
      if (user.streaming) voiceStatuses.push('📺 Streaming');
      voiceStatusCell.textContent = voiceStatuses.length > 0 ? voiceStatuses.join(', ') : 'Normal';
      row.appendChild(voiceStatusCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  },

  renderChatActivity(recentMessages) {
    const container = document.getElementById('chat-activity-table');
    
    if (!recentMessages || recentMessages.length === 0) {
      container.innerHTML = '<p>Keine aktuellen Chat-Aktivitäten</p>';
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'chat-activity-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Benutzer</th>
        <th>Channel</th>
        <th>Nachricht</th>
        <th>Zeit</th>
      </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    recentMessages.forEach(msg => {
      const row = document.createElement('tr');
      
      const userCell = document.createElement('td');
      userCell.textContent = msg.username;
      row.appendChild(userCell);
      
      const channelCell = document.createElement('td');
      channelCell.textContent = `#${msg.channelName}`;
      row.appendChild(channelCell);
      
      const contentCell = document.createElement('td');
      contentCell.className = 'message-content';
      contentCell.textContent = msg.content;
      row.appendChild(contentCell);
      
      const timeCell = document.createElement('td');
      timeCell.textContent = window.dashboardGlobals.getTimeAgo(new Date(msg.timestamp).getTime());
      row.appendChild(timeCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }
};

// addons/dashboard/public/modules/botStatusManager.js
const BotStatusManager = {
  loadBotStatus() {
    const container = document.getElementById('bot-status');
    if (!container) return;
    const panel = container.querySelector('.panel');
    if (!panel) return;
    
    panel.innerHTML = `
      <form id="bot-status-form">
        <div class="form-group">
          <label for="bot-status-select">Status:</label>
          <select id="bot-status-select">
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="dnd">DND</option>
            <option value="invisible">Invisible</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="bot-activity-input">Aktivität (optional):</label>
          <input type="text" id="bot-activity-input" placeholder="z.B. Musik hören..." />
        </div>
        
        <button type="submit" class="submit-button">Status ändern</button>
      </form>
      <div id="bot-status-message"></div>
    `;
    
    const form = document.getElementById('bot-status-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('bot-status-select').value;
      const activity = document.getElementById('bot-activity-input').value;
      
      const statusMsg = document.getElementById('bot-status-message');
      statusMsg.textContent = "Ändere Bot-Status...";
      statusMsg.className = "status-pending";
      
      fetch(`/bot-status?status=${encodeURIComponent(status)}&activity=${encodeURIComponent(activity)}`)
        .then(res => res.json())
        .then(data => {
          statusMsg.textContent = "Bot Status erfolgreich geändert.";
          statusMsg.className = "status-success";
        })
        .catch(err => {
          statusMsg.textContent = "Fehler beim Ändern des Bot Status.";
          statusMsg.className = "status-error";
          console.error(err);
        });
    });
  }
};