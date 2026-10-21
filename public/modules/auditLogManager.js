// addons/dashboard/public/modules/auditLogManager.js

const AuditLogManager = {
  handleAuditLogUpdate(entries) {
    const list = document.getElementById('audit-log-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!entries || entries.length === 0) {
      list.innerHTML = '<p>Keine Audit-Log-Einträge gefunden.</p>';
      return;
    }
    
    entries.forEach(entry => {
      const auditEntry = this.renderAuditEntry(entry);
      list.appendChild(auditEntry);
    });
  },

  renderAuditEntry(entry) {
    const container = document.createElement('div');
    container.className = 'audit-entry';
    
    // Avatar
    const avatar = document.createElement('img');
    avatar.className = 'audit-avatar';
    avatar.src = entry.executorAvatar;
    avatar.alt = entry.executor;
    avatar.onerror = () => {
      avatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; // Fallback Avatar
    };
    
    // Info Container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'audit-info';
    
    // Haupt-Text
    const mainText = document.createElement('p');
    mainText.innerHTML = `<strong>${this.escapeHtml(entry.executor)}</strong> ${this.auditActionText(entry)}`;
    mainText.className = 'audit-main-text';
    
    // Zeit
    const timeDiv = document.createElement('div');
    timeDiv.className = 'audit-time';
    timeDiv.textContent = window.dashboardGlobals.formatTimestamp(entry.createdAt);
    
    // Grund
    const reasonP = document.createElement('p');
    reasonP.className = 'audit-reason';
    const reason = entry.reason && entry.reason !== 'Kein Grund angegeben' ? entry.reason : null;
    reasonP.innerHTML = reason ? 
      `<strong>Grund:</strong> ${this.escapeHtml(reason)}` : 
      '<em>Kein Grund angegeben</em>';
    
    // Änderungen (falls vorhanden)
    if (entry.changes && entry.changes.length > 0) {
      const changesDiv = this.createChangesDisplay(entry.changes);
      infoDiv.appendChild(mainText);
      infoDiv.appendChild(timeDiv);
      infoDiv.appendChild(reasonP);
      infoDiv.appendChild(changesDiv);
    } else {
      infoDiv.appendChild(mainText);
      infoDiv.appendChild(timeDiv);
      infoDiv.appendChild(reasonP);
    }
    
    container.appendChild(avatar);
    container.appendChild(infoDiv);
    
    return container;
  },

  createChangesDisplay(changes) {
    const changesDiv = document.createElement('div');
    changesDiv.className = 'audit-changes';
    
    const changesTitle = document.createElement('h6');
    changesTitle.textContent = 'Änderungen:';
    changesTitle.style.marginTop = '10px';
    changesTitle.style.marginBottom = '5px';
    changesDiv.appendChild(changesTitle);
    
    const changesList = document.createElement('ul');
    changesList.className = 'changes-list';
    
    changes.forEach(change => {
      const changeItem = document.createElement('li');
      changeItem.innerHTML = this.formatChange(change);
      changesList.appendChild(changeItem);
    });
    
    changesDiv.appendChild(changesList);
    return changesDiv;
  },

  formatChange(change) {
    const key = change.key;
    const oldValue = change.old_value;
    const newValue = change.new_value;
    
    // Übersetze Schlüssel
    const translatedKey = this.translateChangeKey(key);
    
    if (oldValue !== undefined && newValue !== undefined) {
      return `<strong>${translatedKey}:</strong> ${this.escapeHtml(oldValue)} → ${this.escapeHtml(newValue)}`;
    } else if (newValue !== undefined) {
      return `<strong>${translatedKey}:</strong> ${this.escapeHtml(newValue)} <em>(hinzugefügt)</em>`;
    } else if (oldValue !== undefined) {
      return `<strong>${translatedKey}:</strong> ${this.escapeHtml(oldValue)} <em>(entfernt)</em>`;
    } else {
      return `<strong>${translatedKey}</strong> wurde geändert`;
    }
  },

  translateChangeKey(key) {
    const translations = {
      'name': 'Name',
      'nick': 'Nickname',
      'permissions': 'Berechtigungen',
      'color': 'Farbe',
      'hoist': 'Separat anzeigen',
      'mentionable': 'Erwähnbar',
      'topic': 'Thema',
      'nsfw': 'NSFW',
      'rate_limit_per_user': 'Slow Mode',
      'bitrate': 'Bitrate',
      'user_limit': 'Benutzerlimit',
      'permission_overwrites': 'Kanalberechtigungen',
      'owner_id': 'Besitzer',
      'region': 'Region',
      'afk_channel_id': 'AFK-Kanal',
      'afk_timeout': 'AFK-Timeout',
      'mfa_level': 'MFA-Level',
      'verification_level': 'Verifizierungslevel',
      'explicit_content_filter': 'Inhaltsfilter',
      'default_message_notifications': 'Standard-Benachrichtigungen'
    };
    
    return translations[key] || key;
  },

  auditActionText(entry) {
    const action = entry.action;
    const target = entry.target;
    
    switch (action) {
      case 'GUILD_UPDATE':
        return `hat die Server-Einstellungen aktualisiert.`;
      case 'CHANNEL_CREATE':
        return `hat den Kanal <em>${this.escapeHtml(target)}</em> erstellt.`;
      case 'CHANNEL_UPDATE':
        return `hat den Kanal <em>${this.escapeHtml(target)}</em> bearbeitet.`;
      case 'CHANNEL_DELETE':
        return `hat den Kanal <em>${this.escapeHtml(target)}</em> gelöscht.`;
      case 'CHANNEL_OVERWRITE_CREATE':
        return `hat Kanalberechtigungen für <em>${this.escapeHtml(target)}</em> erstellt.`;
      case 'CHANNEL_OVERWRITE_UPDATE':
        return `hat Kanalberechtigungen für <em>${this.escapeHtml(target)}</em> aktualisiert.`;
      case 'CHANNEL_OVERWRITE_DELETE':
        return `hat Kanalberechtigungen für <em>${this.escapeHtml(target)}</em> gelöscht.`;
      case 'MEMBER_KICK':
        return `hat <em>${this.escapeHtml(target)}</em> vom Server gekickt.`;
      case 'MEMBER_PRUNE':
        return `hat inaktive Mitglieder entfernt.`;
      case 'MEMBER_BAN_ADD':
        return `hat <em>${this.escapeHtml(target)}</em> vom Server gebannt.`;
      case 'MEMBER_BAN_REMOVE':
        return `hat den Bann von <em>${this.escapeHtml(target)}</em> aufgehoben.`;
      case 'MEMBER_UPDATE':
        return `hat die Mitgliedsdaten von <em>${this.escapeHtml(target)}</em> aktualisiert.`;
      case 'MEMBER_ROLE_UPDATE':
        return `hat die Rollen von <em>${this.escapeHtml(target)}</em> aktualisiert.`;
      case 'MEMBER_MOVE':
        return `hat <em>${this.escapeHtml(target)}</em> zwischen Voice-Kanälen verschoben.`;
      case 'MEMBER_DISCONNECT':
        return `hat <em>${this.escapeHtml(target)}</em> vom Voice-Kanal getrennt.`;
      case 'ROLE_CREATE':
        return `hat die Rolle <em>${this.escapeHtml(target)}</em> erstellt.`;
      case 'ROLE_DELETE':
        return `hat die Rolle <em>${this.escapeHtml(target)}</em> gelöscht.`;
      case 'INVITE_CREATE':
        return `hat eine Einladung erstellt.`;
      case 'INVITE_UPDATE':
        return `hat eine Einladung aktualisiert.`;
      case 'INVITE_DELETE':
        return `hat eine Einladung gelöscht.`;
      case 'WEBHOOK_CREATE':
        return `hat einen Webhook erstellt.`;
      case 'WEBHOOK_UPDATE':
        return `hat einen Webhook aktualisiert.`;
      case 'WEBHOOK_DELETE':
        return `hat einen Webhook gelöscht.`;
      case 'EMOJI_CREATE':
        return `hat das Emoji <em>${this.escapeHtml(target)}</em> hinzugefügt.`;
      case 'EMOJI_UPDATE':
        return `hat das Emoji <em>${this.escapeHtml(target)}</em> bearbeitet.`;
      case 'EMOJI_DELETE':
        return `hat das Emoji <em>${this.escapeHtml(target)}</em> gelöscht.`;
      case 'MESSAGE_DELETE':
        return `hat Nachrichten gelöscht (Ziel: ${this.escapeHtml(target)}).`;
      case 'MESSAGE_BULK_DELETE':
        return `hat mehrere Nachrichten gelöscht.`;
      case 'MESSAGE_PIN':
        return `hat eine Nachricht angeheftet.`;
      case 'MESSAGE_UNPIN':
        return `hat eine Nachricht gelöst.`;
      case 'INTEGRATION_CREATE':
        return `hat eine Integration erstellt.`;
      case 'INTEGRATION_UPDATE':
        return `hat eine Integration aktualisiert.`;
      case 'INTEGRATION_DELETE':
        return `hat eine Integration gelöscht.`;
      default:
        return `hat die Aktion "${action}" ausgeführt (Ziel: ${this.escapeHtml(target)}).`;
    }
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  getActionIcon(action) {
    const icons = {
      'GUILD_UPDATE': '⚙️',
      'CHANNEL_CREATE': '📝',
      'CHANNEL_UPDATE': '✏️',
      'CHANNEL_DELETE': '🗑️',
      'MEMBER_KICK': '👢',
      'MEMBER_BAN_ADD': '🔨',
      'MEMBER_BAN_REMOVE': '🔓',
      'MEMBER_UPDATE': '👤',
      'ROLE_CREATE': '🛡️',
      'ROLE_UPDATE': '✏️',
      'ROLE_DELETE': '🗑️',
      'MESSAGE_DELETE': '💬',
      'EMOJI_CREATE': '😀',
      'EMOJI_UPDATE': '✏️',
      'EMOJI_DELETE': '🗑️'
    };
    
    return icons[action] || '📋';
  },

  exportAuditLog() {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    if (!selectedServerId) {
      alert('Bitte wählen Sie zuerst einen Server aus.');
      return;
    }
    
    window.open(`/export-logs/${selectedServerId}/auditLog`, '_blank');
  }
};