// addons/dashboard/public/modules/allUsersManager.js
const AllUsersManager = {
  setupEventListeners(allUsersPagination) {
    const allUsersSearch = document.getElementById('all-users-search');
    const searchAllUsersBtn = document.getElementById('search-all-users');
    if (allUsersSearch && searchAllUsersBtn) {
      searchAllUsersBtn.addEventListener('click', () => {
        allUsersPagination.offset = 0;
        this.loadAllUsers(true);
      });
      
      allUsersSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          allUsersPagination.offset = 0;
          this.loadAllUsers(true);
        }
      });
    }

    const loadMoreUsersBtn = document.getElementById('load-more-users');
    if (loadMoreUsersBtn) {
      loadMoreUsersBtn.addEventListener('click', () => {
        allUsersPagination.offset += allUsersPagination.limit;
        this.loadAllUsers(false);
      });
    }
  },

  loadAllUsers(reset = true) {
    const container = document.getElementById('all-users-container');
    const searchQuery = document.getElementById('all-users-search')?.value || '';
    const allUsersPagination = window.dashboardGlobals.allUsersPagination;
    
    if (reset) {
      container.innerHTML = '<div class="loading">Lade Benutzer...</div>';
      window.dashboardGlobals.setAllUsersList([]);
    }
    
    const queryParams = new URLSearchParams({
      search: searchQuery,
      offset: allUsersPagination.offset,
      limit: allUsersPagination.limit
    });
    
    fetch(`/all-users?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (reset) {
          container.innerHTML = '';
          window.dashboardGlobals.setAllUsersList(data.users);
        } else {
          const currentList = window.dashboardGlobals.allUsersList();
          window.dashboardGlobals.setAllUsersList(currentList.concat(data.users));
        }
        
        // Aktualisiere Gesamtzahl
        document.getElementById('total-users-count').textContent = data.totalCount;
        
        // Rendere Benutzer
        this.renderAllUsers(data.users, reset);
        
        // Lade-mehr-Button
        const loadMoreBtn = document.getElementById('load-more-users');
        if (loadMoreBtn) {
          loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
        }
      })
      .catch(err => {
        console.error("Error loading all users:", err);
        if (reset) {
          container.innerHTML = '<div class="error">Fehler beim Laden der Benutzer</div>';
        }
      });
  },

  renderAllUsers(users, reset = false) {
    const container = document.getElementById('all-users-container');
    
    if (reset && (!users || users.length === 0)) {
      container.innerHTML = '<p>Keine Benutzer gefunden.</p>';
      return;
    }
    
    if (reset) {
      container.innerHTML = '';
    }
    
    users.forEach(user => {
      const userCard = this.createAllUserCard(user);
      container.appendChild(userCard);
    });
  },

  createAllUserCard(user) {
    const userCard = document.createElement('div');
    userCard.className = 'all-user-card';
    
    const avatar = document.createElement('img');
    avatar.className = 'all-user-avatar';
    avatar.src = user.avatar;
    avatar.alt = user.username;
    userCard.appendChild(avatar);
    
    const info = document.createElement('div');
    info.className = 'all-user-info';
    
    const username = document.createElement('div');
    username.className = 'all-user-username';
    username.textContent = user.tag || `${user.username}#${user.discriminator}`;
    info.appendChild(username);
    
    const userId = document.createElement('div');
    userId.className = 'all-user-id';
    userId.textContent = `ID: ${user.userId}`;
    info.appendChild(userId);
    
    const details = document.createElement('div');
    details.className = 'all-user-details';
    
    const nameChanges = document.createElement('span');
    nameChanges.className = 'name-changes';
    nameChanges.textContent = `Namensänderungen: ${user.nameChangeCount || 0}`;
    details.appendChild(nameChanges);
    
    const servers = document.createElement('span');
    servers.className = 'user-servers';
    servers.textContent = `Server: ${user.serverNames ? user.serverNames.join(', ') : 'Unbekannt'}`;
    details.appendChild(servers);
    
    const status = document.createElement('span');
    status.className = `user-status status-${user.status || 'offline'}`;
    status.textContent = `Status: ${user.status || 'offline'}`;
    details.appendChild(status);
    
    const lastSeen = document.createElement('span');
    lastSeen.className = 'last-seen';
    lastSeen.textContent = `Zuletzt gesehen: ${window.dashboardGlobals.formatTimestamp(user.lastSeen)}`;
    details.appendChild(lastSeen);
    
    const firstSeen = document.createElement('span');
    firstSeen.className = 'first-seen';
    firstSeen.textContent = `In DB seit: ${window.dashboardGlobals.formatTimestamp(user.firstSeen)}`;
    details.appendChild(firstSeen);
    
    if (user.isBot) {
      const botBadge = document.createElement('span');
      botBadge.className = 'bot-badge';
      botBadge.textContent = 'BOT';
      details.appendChild(botBadge);
    }
    
    info.appendChild(details);
    userCard.appendChild(info);
    return userCard;
  }
};

// addons/dashboard/public/modules/configManager.js
const ConfigManager = {
  loadConfigEditor() {
    const container = document.getElementById('config-editor');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Lade Konfiguration...</div>';
    
    fetch('/get-config')
      .then(res => res.json())
      .then(config => {
        const configEditor = document.createElement('div');
        configEditor.className = 'config-editor-container';
        
        const jsonEditor = document.createElement('textarea');
        jsonEditor.id = 'config-json-editor';
        jsonEditor.className = 'config-json-editor';
        jsonEditor.rows = 15;
        jsonEditor.value = JSON.stringify(config, null, 2);
        
        const saveBtn = document.createElement('button');
        saveBtn.id = 'save-config';
        saveBtn.className = 'submit-button';
        saveBtn.textContent = 'Konfiguration speichern';
        
        const statusMsg = document.createElement('div');
        statusMsg.id = 'config-status-message';
        statusMsg.className = 'config-status';
        
        configEditor.appendChild(jsonEditor);
        configEditor.appendChild(saveBtn);
        configEditor.appendChild(statusMsg);
        
        container.innerHTML = '';
        container.appendChild(configEditor);
        
        document.getElementById('save-config').addEventListener('click', () => this.saveConfiguration());
      })
      .catch(err => {
        console.error("Error loading configuration:", err);
        container.innerHTML = '<p class="error">Fehler beim Laden der Konfiguration.</p>';
      });
  },

  saveConfiguration() {
    const jsonEditor = document.getElementById('config-json-editor');
    const statusMsg = document.getElementById('config-status-message');
    
    if (!jsonEditor) return;
    
    let configData;
    try {
      configData = JSON.parse(jsonEditor.value);
      statusMsg.textContent = "Speichere Konfiguration...";
      statusMsg.className = "config-status status-pending";
    } catch (err) {
      statusMsg.textContent = "Ungültiges JSON Format: " + err.message;
      statusMsg.className = "config-status status-error";
      return;
    }
    
    fetch('/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          statusMsg.textContent = "Konfiguration erfolgreich gespeichert!";
          statusMsg.className = "config-status status-success";
        } else {
          statusMsg.textContent = "Fehler beim Speichern: " + (data.error || "Unbekannter Fehler");
          statusMsg.className = "config-status status-error";
        }
      })
      .catch(err => {
        statusMsg.textContent = "Fehler beim Speichern: " + err.message;
        statusMsg.className = "config-status status-error";
      });
  }
};

// addons/dashboard/public/modules/historicalServersManager.js
const HistoricalServersManager = {
  loadHistoricalServers() {
    fetch('/historical-servers')
      .then(res => res.json())
      .then(servers => {
        const inactiveServers = servers.filter(server => server.left);
        this.renderOldServers(inactiveServers);
      })
      .catch(err => {
        console.error("Error loading historical servers:", err);
        const container = document.getElementById('old-servers-list');
        if (container) {
          container.innerHTML = '<p>Fehler beim Laden der historischen Server.</p>';
        }
      });
  },

  renderOldServers(servers) {
    const container = document.getElementById('old-servers-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (servers.length === 0) {
      const noServers = document.createElement('p');
      noServers.textContent = 'Keine alten Server gefunden.';
      container.appendChild(noServers);
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'old-servers-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Name', 'Server ID', 'Verlassen am', 'Letzte Mitgliederzahl'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    servers.forEach(server => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.textContent = server.name;
      row.appendChild(nameCell);
      
      const idCell = document.createElement('td');
      idCell.textContent = server.id;
      row.appendChild(idCell);
      
      const leftAtCell = document.createElement('td');
      leftAtCell.textContent = new Date(server.leftAt).toLocaleString();
      row.appendChild(leftAtCell);
      
      const memberCountCell = document.createElement('td');
      memberCountCell.textContent = server.memberCount || 'Unbekannt';
      row.appendChild(memberCountCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    container.appendChild(table);
  }
};

// addons/dashboard/public/modules/storedLogsManager.js
const StoredLogsManager = {
  setupEventListeners() {
    document.getElementById('load-stored-logs').addEventListener('click', () => {
      const selectedServerId = window.dashboardGlobals.selectedServerId();
      if (!selectedServerId) return;
      const logType = document.getElementById('stored-log-type').value;
      this.loadStoredLogs(selectedServerId, logType);
    });

    document.getElementById('export-logs').addEventListener('click', () => {
      const selectedServerId = window.dashboardGlobals.selectedServerId();
      if (!selectedServerId) return;
      const logType = document.getElementById('stored-log-type').value;
      window.open(`/export-logs/${selectedServerId}/${logType}`, '_blank');
    });
  },

  loadStoredLogs(selectedServerId, logType) {
    fetch(`/logs/${selectedServerId}/${logType}`)
      .then(res => res.json())
      .then(logs => {
        const storedLogList = document.getElementById('stored-log-list');
        storedLogList.innerHTML = '';
        logs.forEach(event => {
          const li = document.createElement('li');
          const timestampSpan = document.createElement('span');
          timestampSpan.className = 'log-timestamp';
          timestampSpan.textContent = window.dashboardGlobals.formatTimestamp(event.timestamp);
          const eventSpan = document.createElement('span');
          eventSpan.className = 'log-event';
          eventSpan.textContent = `${event.event_type || logType}: ${JSON.stringify(event.data || event)}`;
          li.appendChild(timestampSpan);
          li.appendChild(eventSpan);
          storedLogList.appendChild(li);
        });
      })
      .catch(err => console.error("Error loading stored logs:", err));
  }
};

// addons/dashboard/public/modules/liveEventsManager.js
const LiveEventsManager = {
  handleInitialLog(events, selectedServerId) {
    const logList = document.getElementById('log-list');
    logList.innerHTML = '';
    events.forEach(event => {
      if (!selectedServerId || event.guild_id !== selectedServerId) return;
      this.renderEventCard(event, false);
    });
  },

  renderEventCard(event, prepend = false) {
    const logList = document.getElementById('log-list');
    const card = document.createElement('div');
    card.className = 'event-card';
    
    let title = '';
    let description = '';
    
    switch (event.event_type) {
      case 'messageCreate':
        title = 'Neue Nachricht';
        description = `<strong>${event.data.author}</strong> schrieb in <em>${event.data.channel}</em>: ${event.data.content}`;
        break;
      case 'messageDelete':
        title = 'Nachricht gelöscht';
        description = `Nachricht von <strong>${event.data.author}</strong> in <em>${event.data.channel}</em> wurde gelöscht.`;
        break;
      case 'guildMemberAdd':
        title = 'Mitglied beigetreten';
        description = `<strong>${event.data.user}</strong> ist dem Server beigetreten.`;
        break;
      case 'guildMemberRemove':
        title = 'Mitglied verlassen';
        description = `<strong>${event.data.user}</strong> hat den Server verlassen.`;
        break;
      case 'presenceUpdate':
        title = 'Statusänderung';
        description = `<strong>${event.data.user}</strong> änderte seinen Status von <em>${event.data.oldStatus}</em> zu <em>${event.data.newStatus}</em>.`;
        if (event.data.activities && event.data.activities.length > 0) {
          description += `<br>Aktivitäten: ${event.data.activities.join(', ')}`;
        }
        break;
      case 'voiceJoin':
        title = 'Voice Channel betreten';
        description = `<strong>${event.data.user}</strong> hat den Voice-Channel <em>${event.data.channel}</em> betreten.`;
        break;
      case 'voiceLeave':
        title = 'Voice Channel verlassen';
        description = `<strong>${event.data.user}</strong> hat den Voice-Channel <em>${event.data.channel}</em> verlassen.`;
        break;
      default:
        title = event.event_type;
        description = JSON.stringify(event.data);
    }
    
    const header = document.createElement('h4');
    header.textContent = title;
    const timeP = document.createElement('p');
    timeP.textContent = window.dashboardGlobals.formatTimestamp(event.timestamp);
    timeP.className = 'event-time';
    const descP = document.createElement('p');
    descP.innerHTML = description;
    
    card.appendChild(header);
    card.appendChild(timeP);
    card.appendChild(descP);
    
    if (prepend) logList.prepend(card);
    else logList.appendChild(card);
  }
};