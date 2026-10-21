// addons/dashboard/public/modules/liveEventsManager.js

const LiveEventsManager = {
  handleInitialLog(events, selectedServerId) {
    const logList = document.getElementById('log-list');
    if (!logList) return;
    
    logList.innerHTML = '';
    events.forEach(event => {
      if (!selectedServerId || event.guild_id !== selectedServerId) return;
      this.renderEventCard(event, false);
    });
  },

  renderEventCard(event, prepend = false) {
    const logList = document.getElementById('log-list');
    if (!logList) return;
    
    const card = this.createEventCard(event);
    
    if (prepend) {
      logList.prepend(card);
    } else {
      logList.appendChild(card);
    }
    
    // Begrenze die Anzahl der angezeigten Events
    this.limitDisplayedEvents(logList);
  },

  createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';
    
    const { title, description } = this.formatEventData(event);
    
    const header = document.createElement('h4');
    header.textContent = title;
    
    const timeP = document.createElement('p');
    timeP.textContent = window.dashboardGlobals.formatTimestamp(event.timestamp);
    timeP.className = 'event-time';
    
    const descP = document.createElement('p');
    descP.innerHTML = description;
    descP.className = 'event-description';
    
    card.appendChild(header);
    card.appendChild(timeP);
    card.appendChild(descP);
    
    return card;
  },

  formatEventData(event) {
    const eventType = event.event_type;
    const data = event.data;
    
    let title = '';
    let description = '';
    
    switch (eventType) {
      case 'messageCreate':
        title = 'Neue Nachricht';
        description = `<strong>${this.escapeHtml(data.author)}</strong> schrieb in <em>#${this.escapeHtml(data.channel)}</em>: ${this.escapeHtml(data.content)}`;
        break;
        
      case 'messageDelete':
        title = 'Nachricht gelöscht';
        description = `Nachricht von <strong>${this.escapeHtml(data.author)}</strong> in <em>#${this.escapeHtml(data.channel)}</em> wurde gelöscht.`;
        break;
        
      case 'messageUpdate':
        title = 'Nachricht bearbeitet';
        description = `<strong>${this.escapeHtml(data.author)}</strong> hat eine Nachricht in <em>#${this.escapeHtml(data.channel)}</em> bearbeitet.`;
        break;
        
      case 'guildMemberAdd':
        title = 'Mitglied beigetreten';
        description = `<strong>${this.escapeHtml(data.user)}</strong> ist dem Server beigetreten.`;
        break;
        
      case 'guildMemberRemove':
        title = 'Mitglied verlassen';
        description = `<strong>${this.escapeHtml(data.user)}</strong> hat den Server verlassen.`;
        break;
        
      case 'presenceUpdate':
        title = 'Statusänderung';
        description = `<strong>${this.escapeHtml(data.user)}</strong> änderte seinen Status von <em>${data.oldStatus}</em> zu <em>${data.newStatus}</em>.`;
        if (data.activities && data.activities.length > 0) {
          description += `<br>Aktivitäten: ${data.activities.map(a => this.escapeHtml(a)).join(', ')}`;
        }
        break;
        
      case 'voiceJoin':
        title = 'Voice Channel betreten';
        description = `<strong>${this.escapeHtml(data.user)}</strong> hat den Voice-Channel <em>${this.escapeHtml(data.channel)}</em> betreten.`;
        break;
        
      case 'voiceLeave':
        title = 'Voice Channel verlassen';
        description = `<strong>${this.escapeHtml(data.user)}</strong> hat den Voice-Channel <em>${this.escapeHtml(data.channel)}</em> verlassen.`;
        break;
        
      case 'voiceMove':
        title = 'Voice Channel gewechselt';
        description = `<strong>${this.escapeHtml(data.user)}</strong> wechselte von <em>${this.escapeHtml(data.oldChannel)}</em> zu <em>${this.escapeHtml(data.newChannel)}</em>.`;
        break;
        
      case 'roleAdd':
        title = 'Rolle hinzugefügt';
        description = `<strong>${this.escapeHtml(data.user)}</strong> erhielt die Rolle <em>${this.escapeHtml(data.role)}</em>.`;
        break;
        
      case 'roleRemove':
        title = 'Rolle entfernt';
        description = `<strong>${this.escapeHtml(data.user)}</strong> verlor die Rolle <em>${this.escapeHtml(data.role)}</em>.`;
        break;
        
      case 'usernameChange':
        title = 'Namensänderung';
        description = `<strong>${this.escapeHtml(data.oldUsername)}</strong> → <strong>${this.escapeHtml(data.newUsername)}</strong>`;
        break;
        
      case 'auditLog':
        title = 'Audit Log';
        description = `<strong>${this.escapeHtml(data.executor)}</strong> führte Aktion aus: ${this.escapeHtml(data.action)}`;
        break;
        
      default:
        title = eventType || 'Unbekanntes Event';
        description = this.escapeHtml(JSON.stringify(data));
    }
    
    return { title, description };
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  limitDisplayedEvents(logList, maxEvents = 100) {
    const events = logList.children;
    if (events.length > maxEvents) {
      // Entferne die ältesten Events
      for (let i = events.length - 1; i >= maxEvents; i--) {
        logList.removeChild(events[i]);
      }
    }
  },

  clearEvents() {
    const logList = document.getElementById('log-list');
    if (logList) {
      logList.innerHTML = '';
    }
  },

  getEventIcon(eventType) {
    const icons = {
      'messageCreate': '💬',
      'messageDelete': '🗑️',
      'messageUpdate': '✏️',
      'guildMemberAdd': '👋',
      'guildMemberRemove': '👋',
      'presenceUpdate': '🟢',
      'voiceJoin': '🔊',
      'voiceLeave': '🔇',
      'voiceMove': '🔄',
      'roleAdd': '🛡️',
      'roleRemove': '❌',
      'usernameChange': '👤',
      'auditLog': '📋'
    };
    
    return icons[eventType] || '📝';
  }
};