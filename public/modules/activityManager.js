// addons/dashboard/public/modules/activityManager.js

const ActivityManager = {
  setupEventListeners() {
    // Filter-Buttons für Aktivitätsprotokoll
    const applyFiltersBtn = document.getElementById('apply-activity-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => {
        this.updateActivityFilters();
        this.loadUserActivityLog(window.dashboardGlobals.selectedServerId(), true);
      });
    }
    
    const exportActivityBtn = document.getElementById('export-activity-log');
    if (exportActivityBtn) {
      exportActivityBtn.addEventListener('click', () => this.exportUserActivityLog());
    }
    
    const loadMoreActivitiesBtn = document.getElementById('load-more-activities');
    if (loadMoreActivitiesBtn) {
      loadMoreActivitiesBtn.addEventListener('click', () => {
        window.dashboardGlobals.activityPagination.offset += window.dashboardGlobals.activityPagination.limit;
        this.loadUserActivityLog(window.dashboardGlobals.selectedServerId(), false);
      });
    }
  },

  updateActivityFilters() {
    const typeFilter = document.getElementById('activity-filter-type');
    const userFilter = document.getElementById('activity-filter-user');
    const dateFilter = document.getElementById('activity-date-range');
    
    const filters = window.dashboardGlobals.activityFilters;
    filters.type = typeFilter ? typeFilter.value : 'all';
    filters.user = userFilter ? userFilter.value.toLowerCase() : '';
    filters.days = dateFilter ? dateFilter.value : 'all';
    
    window.dashboardGlobals.activityPagination.offset = 0;
  },

  loadUserActivityLog(selectedServerId, reset = true) {
    if (!selectedServerId) return;
    
    const container = document.getElementById('activity-log-container');
    if (!container) return;
    
    if (reset) {
      container.innerHTML = '<div class="loading">Lade Aktivitäten...</div>';
      window.dashboardGlobals.setUserActivityLog([]);
    }
    
    const queryParams = new URLSearchParams({
      offset: window.dashboardGlobals.activityPagination.offset,
      limit: window.dashboardGlobals.activityPagination.limit,
      type: window.dashboardGlobals.activityFilters.type,
      user: window.dashboardGlobals.activityFilters.user,
      days: window.dashboardGlobals.activityFilters.days
    });
    
    fetch(`/user-activities/${selectedServerId}?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (reset) {
          container.innerHTML = '';
        } else {
          const loadingEl = container.querySelector('.loading');
          if (loadingEl) loadingEl.remove();
        }
        
        this.updateActivityStats(data.stats);
        
        if (Array.isArray(data.activities)) {
          if (reset) {
            window.dashboardGlobals.setUserActivityLog(data.activities);
          } else {
            const currentLog = window.dashboardGlobals.userActivityLog();
            window.dashboardGlobals.setUserActivityLog(currentLog.concat(data.activities));
          }
          
          this.renderUserActivities(data.activities, reset);
          
          const loadMoreBtn = document.getElementById('load-more-activities');
          if (loadMoreBtn) {
            loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
          }
        } else {
          container.innerHTML = '<p>Keine Aktivitäten gefunden.</p>';
        }
      })
      .catch(err => {
        console.error("Error loading user activities:", err);
        if (reset) {
          container.innerHTML = '<div class="error">Fehler beim Laden der Aktivitäten: ' + err.message + '</div>';
        }
      });
  },

  renderUserActivities(activities, reset = false) {
    const container = document.getElementById('activity-log-container');
    if (!container) return;
    
    if (reset && (!activities || activities.length === 0)) {
      container.innerHTML = '<p>Keine Aktivitäten gefunden.</p>';
      return;
    }
    
    activities.forEach(activity => {
      const item = this.createActivityItem(activity);
      container.appendChild(item);
    });
  },

  createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const icon = this.createActivityIcon(activity.type);
    item.appendChild(icon);
    
    const content = document.createElement('div');
    content.className = 'activity-content';
    
    const header = document.createElement('div');
    header.className = 'activity-header';
    
    const userSpan = document.createElement('span');
    userSpan.className = 'activity-user';
    userSpan.textContent = activity.user;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'activity-timestamp';
    timeSpan.textContent = window.dashboardGlobals.formatTimestamp(activity.timestamp);
    
    header.appendChild(userSpan);
    header.appendChild(timeSpan);
    content.appendChild(header);
    
    const description = document.createElement('div');
    description.className = 'activity-description';
    description.innerHTML = this.formatActivityDescription(activity);
    content.appendChild(description);
    
    if (activity.details) {
      const details = document.createElement('div');
      details.className = 'activity-details';
      
      if (typeof activity.details === 'string') {
        details.textContent = activity.details;
      } else {
        details.textContent = JSON.stringify(activity.details);
      }
      
      content.appendChild(details);
    }
    
    item.appendChild(content);
    return item;
  },

  createActivityIcon(type) {
    const icon = document.createElement('div');
    icon.className = 'activity-icon';
    
    switch(type) {
      case 'messageCreate':
      case 'messageDelete':
      case 'messageUpdate':
        icon.className += ' activity-icon-message';
        icon.innerHTML = '<i class="message-icon">💬</i>';
        break;
      case 'voiceJoin':
      case 'voiceLeave':
      case 'voiceMove':
      case 'voiceState':
        icon.className += ' activity-icon-voice';
        icon.innerHTML = '<i class="voice-icon">🔊</i>';
        break;
      case 'roleAdd':
      case 'roleRemove':
      case 'roleUpdate':
        icon.className += ' activity-icon-role';
        icon.innerHTML = '<i class="role-icon">🛡️</i>';
        break;
      case 'presenceUpdate':
        icon.className += ' activity-icon-presence';
        icon.innerHTML = '<i class="presence-icon">⚡</i>';
        break;
      case 'usernameChange':
      case 'nicknameChange':
        icon.className += ' activity-icon-username';
        icon.innerHTML = '<i class="username-icon">👤</i>';
        break;
      case 'guildMemberAdd':
      case 'guildMemberRemove':
        icon.className += ' activity-icon-join';
        icon.innerHTML = '<i class="join-icon">🚪</i>';
        break;
      default:
        icon.className += ' activity-icon-message';
        icon.innerHTML = '<i class="default-icon">📝</i>';
    }
    
    return icon;
  },

  formatActivityDescription(activity) {
    let description = '';
    
    switch(activity.type) {
      case 'messageCreate':
        description = `hat eine Nachricht in <span class="activity-target">#${activity.channel}</span> geschrieben`;
        break;
      case 'messageDelete':
        description = `hat eine Nachricht in <span class="activity-target">#${activity.channel}</span> gelöscht`;
        break;
      case 'voiceJoin':
        description = `hat den Voice-Channel <span class="activity-target">${activity.channel}</span> betreten`;
        break;
      case 'voiceLeave':
        description = `hat den Voice-Channel <span class="activity-target">${activity.channel}</span> verlassen`;
        break;
      case 'roleAdd':
        description = `hat die Rolle <span class="activity-target">${activity.role}</span> erhalten`;
        break;
      case 'roleRemove':
        description = `hat die Rolle <span class="activity-target">${activity.role}</span> verloren`;
        break;
      case 'guildMemberAdd':
        description = `ist dem Server beigetreten`;
        break;
      case 'guildMemberRemove':
        description = `hat den Server verlassen`;
        break;
      default:
        description = `hat eine Aktion ausgeführt: ${activity.type}`;
    }
    
    return description;
  },

  updateActivityStats(stats) {
    const totalElement = document.getElementById('total-activities');
    if (totalElement) {
      totalElement.textContent = stats.total || 0;
    }
    
    const messageElement = document.getElementById('message-count');
    if (messageElement) {
      const valueElement = messageElement.querySelector('.breakdown-value');
      if (valueElement) {
        valueElement.textContent = stats.messages || 0;
      }
    }
    
    const voiceElement = document.getElementById('voice-count');
    if (voiceElement) {
      const valueElement = voiceElement.querySelector('.breakdown-value');
      if (valueElement) {
        valueElement.textContent = stats.voice || 0;
      }
    }
    
    const roleElement = document.getElementById('role-count');
    if (roleElement) {
      const valueElement = roleElement.querySelector('.breakdown-value');
      if (valueElement) {
        valueElement.textContent = stats.roles || 0;
      }
    }
    
    const presenceElement = document.getElementById('presence-count');
    if (presenceElement) {
      const valueElement = presenceElement.querySelector('.breakdown-value');
      if (valueElement) {
        valueElement.textContent = stats.presence || 0;
      }
    }
  },

  exportUserActivityLog() {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    if (!selectedServerId) return;
    
    const queryParams = new URLSearchParams({
      type: window.dashboardGlobals.activityFilters.type,
      user: window.dashboardGlobals.activityFilters.user,
      days: window.dashboardGlobals.activityFilters.days,
      export: 'csv'
    });
    
    window.open(`/export-user-activities/${selectedServerId}?${queryParams.toString()}`, '_blank');
  }
};