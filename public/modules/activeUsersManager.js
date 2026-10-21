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
      const row = this.createVoiceUserRow(user);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  },

  createVoiceUserRow(user) {
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
    
    return row;
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
      const row = this.createChatMessageRow(msg);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  },

  createChatMessageRow(msg) {
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
    
    return row;
  }
};