// addons/dashboard/public/modules/userHistoryManager.js

const UserHistoryManager = {
  setupSocketHandlers(socket, selectedServerId, openHistoryPanels) {
    // Presence Updates
    socket.on('presenceUpdate', (data) => {
      if (!selectedServerId || data.guildId !== selectedServerId) return;
      const userId = data.userId;
      
      if (openHistoryPanels[`status-${userId}`]) {
        const panel = document.getElementById(`status-history-${userId}`);
        if (panel) {
          const table = panel.querySelector('table');
          if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${window.dashboardGlobals.formatTimestamp(data.timestamp)}</td>
                <td>${data.change.oldStatus || 'offline'}</td>
                <td>${data.change.newStatus || 'offline'}</td>
                <td>${(data.change.activities ? data.change.activities.join(', ') : '')}</td>
              `;
              tbody.insertBefore(row, tbody.firstChild);
            }
          }
        }
      }
    });

    // Username Changes
    socket.on('usernameChange', (data) => {
      if (!selectedServerId || data.guildId !== selectedServerId) return;
      const userId = data.userId;
      
      if (openHistoryPanels[`username-${userId}`]) {
        const panel = document.getElementById(`username-history-${userId}`);
        if (panel) {
          const table = panel.querySelector('table');
          if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) {
              const row = document.createElement('tr');
              
              const oldUsername = data.change.oldUsername || '';
              const newUsername = data.change.newUsername || '';
              const oldDiscriminator = data.change.oldDiscriminator || '';
              const newDiscriminator = data.change.newDiscriminator || '';
              const oldNickname = data.change.oldNickname || 'Keiner';
              const newNickname = data.change.newNickname || 'Keiner';
              
              row.innerHTML = `
                <td>${window.dashboardGlobals.formatTimestamp(data.timestamp)}</td>
                <td>${oldUsername}#${oldDiscriminator} → ${newUsername}#${newDiscriminator}</td>
                <td>${oldNickname} → ${newNickname}</td>
              `;
              tbody.insertBefore(row, tbody.firstChild);
            }
          }
        }
      }
    });
  },

  toggleUserHistory(userId, type, openHistoryPanels) {
    const key = `${type}-${userId}`;
    openHistoryPanels[key] = !openHistoryPanels[key];
    
    const panel = document.getElementById(`${key}`);
    if (!panel) return;

    if (openHistoryPanels[key]) {
      panel.style.display = 'block';
      if (type === 'status') {
        this.loadUserStatusHistory(userId);
      } else if (type === 'username') {
        this.loadUserUsernameHistory(userId);
      }
    } else {
      panel.style.display = 'none';
      
      const userLiveStreams = window.dashboardGlobals.userLiveStreams;
      if (userLiveStreams[key]) {
        window.dashboardGlobals.socket.emit('unsubscribeFromUserHistory', userLiveStreams[key]);
        userLiveStreams[key] = null;
      }
    }
  },

  loadUserStatusHistory(userId) {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    const panel = document.getElementById(`status-history-${userId}`);
    if (!panel) return;
    
    panel.innerHTML = '<div class="loading">Lade History...</div>';
    
    fetch(`/presence-history/${selectedServerId}/${userId}`)
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text) });
        }
        return res.json();
      })
      .then(rows => { 
        panel.innerHTML = this.createStatusHistoryTable(rows);
        
        const streamKey = `status-${userId}`;
        const userLiveStreams = window.dashboardGlobals.userLiveStreams;
        userLiveStreams[streamKey] = {
          guildId: selectedServerId,
          userId: userId
        };
        window.dashboardGlobals.socket.emit('subscribeToUserHistory', userLiveStreams[streamKey]);
      })
      .catch(err => { 
        console.error("Error fetching user history for user", userId, err); 
        panel.innerHTML = `<div class="error">Fehler beim Laden der User History: ${err.message}</div>`;
      });
  },

  loadUserUsernameHistory(userId) {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    const panel = document.getElementById(`username-history-${userId}`);
    if (!panel) return;
    
    panel.innerHTML = '<div class="loading">Lade Username History...</div>';
    
    fetch(`/username-changes/${selectedServerId}/${userId}`)
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text) });
        }
        return res.json();
      })
      .then(rows => { 
        panel.innerHTML = this.createUsernameHistoryTable(rows);
        
        const streamKey = `username-${userId}`;
        const userLiveStreams = window.dashboardGlobals.userLiveStreams;
        userLiveStreams[streamKey] = {
          guildId: selectedServerId,
          userId: userId
        };
        window.dashboardGlobals.socket.emit('subscribeToUserHistory', userLiveStreams[streamKey]);
      })
      .catch(err => { 
        console.error("Error fetching username history for user", userId, err); 
        panel.innerHTML = `<div class="error">Fehler beim Laden der Username History: ${err.message}</div>`;
      });
  },

  createStatusHistoryTable(rows) {
    if (!rows || rows.length === 0) return `<p>Keine alten Status gefunden.</p>`;
    let html = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Alter Status</th>
            <th>Neuer Status</th>
            <th>Aktivitäten</th>
          </tr>
        </thead>
        <tbody>
    `;
    rows.forEach(r => {
      const data = r;
      html += `
        <tr>
          <td>${window.dashboardGlobals.formatTimestamp(data.timestamp)}</td>
          <td>${data.old_status || 'offline'}</td>
          <td>${data.new_status || 'offline'}</td>
          <td>${(data.activities ? JSON.parse(data.activities).join(', ') : '')}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  },

  createUsernameHistoryTable(rows) {
    if (!rows || rows.length === 0) return `<p>Keine Namensänderungen gefunden.</p>`;
    let html = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Username</th>
            <th>Nickname</th>
          </tr>
        </thead>
        <tbody>
    `;
    rows.forEach(r => {
      const data = r;
      html += `
        <tr>
          <td>${window.dashboardGlobals.formatTimestamp(data.timestamp)}</td>
          <td>${data.old_username || ''}#${data.old_discriminator || ''} → ${data.new_username || ''}#${data.new_discriminator || ''}</td>
          <td>${data.old_nickname || 'Keiner'} → ${data.new_nickname || 'Keiner'}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    return html;
  },

  unsubscribeAll(socket, userLiveStreams) {
    Object.keys(userLiveStreams).forEach(key => {
      if (userLiveStreams[key]) {
        socket.emit('unsubscribeFromUserHistory', userLiveStreams[key]);
        userLiveStreams[key] = null;
      }
    });
  }
};