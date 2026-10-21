// addons/dashboard/public/modules/userStatusManager.js

const UserStatusManager = {
  setupEventListeners() {
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
      userSearch.addEventListener('input', () => {
        this.renderUserList(window.dashboardGlobals.currentUserList(), window.dashboardGlobals.openHistoryPanels);
      });
    }
    
    const userSort = document.getElementById('user-sort');
    if (userSort) {
      userSort.addEventListener('change', () => {
        this.renderUserList(window.dashboardGlobals.currentUserList(), window.dashboardGlobals.openHistoryPanels);
      });
    }
  },

  renderUserList(currentUserList, openHistoryPanels) {
    const list = document.getElementById('user-status-list');
    list.innerHTML = '';
    const searchQuery = (document.getElementById('user-search')?.value || '').toLowerCase();
    let filtered = currentUserList.filter(u => {
      const tag = (u.tag || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      const status = (u.status || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const nickname = (u.nickname || '').toLowerCase();
      return tag.includes(searchQuery) || 
             id.includes(searchQuery) || 
             status.includes(searchQuery) || 
             username.includes(searchQuery) || 
             nickname.includes(searchQuery);
    });
    
    const sortVal = document.getElementById('user-sort')?.value || 'name-asc';
    filtered.sort((a, b) => {
      switch (sortVal) {
        case 'name-asc':   return a.tag.localeCompare(b.tag);
        case 'name-desc':  return b.tag.localeCompare(a.tag);
        case 'status-asc': return (a.status || '').localeCompare(b.status || '');
        case 'status-desc':return (b.status || '').localeCompare(a.status || '');
        default:           return a.tag.localeCompare(b.tag);
      }
    });
    
    filtered.forEach(user => {
      const card = this.createUserCard(user, openHistoryPanels);
      list.appendChild(card);
      
      // History-Panels hinzufügen
      this.createHistoryPanels(user, list, openHistoryPanels);
    });
  },

  createUserCard(user, openHistoryPanels) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'user-avatar-container';
    const avatarImg = document.createElement('img');
    avatarImg.className = 'user-avatar';
    avatarImg.src = user.avatar;
    const dot = document.createElement('div');
    dot.classList.add('status-dot');
    switch (user.status) {
      case 'online': dot.classList.add('status-online'); break;
      case 'idle':   dot.classList.add('status-idle'); break;
      case 'dnd':    dot.classList.add('status-dnd'); break;
      default:       dot.classList.add('status-offline');
    }
    avatarContainer.appendChild(avatarImg);
    avatarContainer.appendChild(dot);
    
    const info = document.createElement('div');
    info.className = 'user-info';
    const userTag = document.createElement('div');
    userTag.className = 'user-tag';
    userTag.textContent = user.tag;
    const statusDiv = document.createElement('div');
    statusDiv.className = 'user-status';
    statusDiv.textContent = `Status: ${user.status}`;
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'user-details';
    usernameDiv.textContent = `Username: ${user.username}`;
    const nicknameDiv = document.createElement('div');
    nicknameDiv.className = 'user-details';
    nicknameDiv.textContent = `Nickname: ${user.nickname || 'Nicht gesetzt'}`;
    
    if (user.isBot) {
      const botBadge = document.createElement('div');
      botBadge.className = 'bot-badge user-details';
      botBadge.textContent = '🤖 BOT';
      info.appendChild(botBadge);
    }
    
    info.appendChild(userTag);
    info.appendChild(statusDiv);
    info.appendChild(usernameDiv);
    info.appendChild(nicknameDiv);
    
    if (user.activities && user.activities.length > 0) {
      const activitiesDiv = document.createElement('div');
      activitiesDiv.className = 'activities';
      activitiesDiv.textContent = 'Aktivitäten: ' + user.activities.join(', ');
      info.appendChild(activitiesDiv);
    }
    
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    const histButton = document.createElement('button');
    histButton.textContent = 'Status History';
    histButton.className = 'action-button status-history-btn';
    histButton.addEventListener('click', () => { 
      UserHistoryManager.toggleUserHistory(user.id, 'status', openHistoryPanels); 
    });

    const nameHistButton = document.createElement('button');
    nameHistButton.textContent = 'Username History';
    nameHistButton.className = 'action-button username-history-btn';
    nameHistButton.addEventListener('click', () => { 
      UserHistoryManager.toggleUserHistory(user.id, 'username', openHistoryPanels); 
    });
    
    actions.appendChild(histButton);
    actions.appendChild(nameHistButton);
    card.appendChild(avatarContainer);
    card.appendChild(info);
    card.appendChild(actions);
    
    return card;
  },

  createHistoryPanels(user, list, openHistoryPanels) {
    // Status History Panel
    let statusHistoryPanel = document.getElementById(`status-history-${user.id}`);
    if (!statusHistoryPanel) {
      statusHistoryPanel = document.createElement('div');
      statusHistoryPanel.className = 'user-history';
      statusHistoryPanel.id = `status-history-${user.id}`;
    }
    list.appendChild(statusHistoryPanel);

    // Username History Panel
    let usernameHistoryPanel = document.getElementById(`username-history-${user.id}`);
    if (!usernameHistoryPanel) {
      usernameHistoryPanel = document.createElement('div');
      usernameHistoryPanel.className = 'user-history';
      usernameHistoryPanel.id = `username-history-${user.id}`;
    }
    list.appendChild(usernameHistoryPanel);
    
    // Panel-Sichtbarkeit basierend auf openHistoryPanels
    if (openHistoryPanels[`status-${user.id}`]) {
      statusHistoryPanel.style.display = 'block';
      UserHistoryManager.loadUserStatusHistory(user.id);
    } else {
      statusHistoryPanel.style.display = 'none';
    }
    
    if (openHistoryPanels[`username-${user.id}`]) {
      usernameHistoryPanel.style.display = 'block';
      UserHistoryManager.loadUserUsernameHistory(user.id);
    } else {
      usernameHistoryPanel.style.display = 'none';
    }
  }
};