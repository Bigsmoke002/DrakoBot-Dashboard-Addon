// addons/dashboard/public/modules/performanceManager.js
const PerformanceManager = {
  handlePerformanceUpdate(data) {
    const perfDiv = document.getElementById('performance-data');
    if (!perfDiv) return;
    
    const current = data.current;
    const summary = data.summary;
    const dbInfo = data.dbInfo;
    const maxMem = 1024;
    const usedMem = current.memoryUsage.rss / 1024 / 1024;
    const maxLoad = 2.0;
    const usedLoad = current.loadAvg[0];
    
    const performanceContainer = document.createElement('div');
    performanceContainer.className = 'performance-dashboard';
    
    // Memory and CPU Bars
    const metricsSection = this.createMetricsSection(current, usedMem, maxMem, usedLoad, maxLoad);
    performanceContainer.appendChild(metricsSection);
    
    // Database Info
    const databaseSection = this.createDatabaseSection(dbInfo);
    performanceContainer.appendChild(databaseSection);
    
    perfDiv.innerHTML = "";
    perfDiv.appendChild(performanceContainer);
  },

  createMetricsSection(current, usedMem, maxMem, usedLoad, maxLoad) {
    const metricsSection = document.createElement('div');
    metricsSection.className = 'metrics-section';
    
    const memorySection = document.createElement('div');
    memorySection.className = 'metric-item';
    memorySection.innerHTML = `
      <h4>Memory Usage</h4>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${Math.min(100, (usedMem / maxMem) * 100)}%"></div>
        <div class="progress-text">${usedMem.toFixed(2)} MB / ${maxMem} MB</div>
      </div>
      <div class="metric-details">
        <div>RSS: ${(current.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB</div>
        <div>Heap: ${(current.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB</div>
      </div>
    `;
    metricsSection.appendChild(memorySection);
    
    const cpuSection = document.createElement('div');
    cpuSection.className = 'metric-item';
    cpuSection.innerHTML = `
      <h4>CPU Load</h4>
      <div class="progress-container">
        <div class="progress-bar ${usedLoad > maxLoad ? 'critical' : usedLoad > maxLoad * 0.8 ? 'warning' : ''}" 
             style="width: ${Math.min(100, (usedLoad / maxLoad) * 100)}%"></div>
        <div class="progress-text">${usedLoad.toFixed(2)} / ${maxLoad.toFixed(1)}</div>
      </div>
      <div class="metric-details">
        <div>Load Avg (1, 5, 15 min): ${current.loadAvg.map(n => n.toFixed(2)).join(', ')}</div>
        <div>User: ${(current.cpuUsage.user / 1000000).toFixed(2)}s, System: ${(current.cpuUsage.system / 1000000).toFixed(2)}s</div>
      </div>
    `;
    metricsSection.appendChild(cpuSection);
    
    return metricsSection;
  },

  createDatabaseSection(dbInfo) {
    const databaseSection = document.createElement('div');
    databaseSection.className = 'database-section';
    
    const mongoSection = document.createElement('div');
    mongoSection.className = 'db-item';
    mongoSection.innerHTML = `
      <h4>MongoDB Status</h4>
      <div class="db-metrics">
        <div class="db-metric">
          <span class="metric-label">Log Einträge:</span>
          <span class="metric-value">${dbInfo.mongodb.logCount}</span>
        </div>
        <div class="db-metric">
          <span class="metric-label">User Einträge:</span>
          <span class="metric-value">${dbInfo.mongodb.userCount}</span>
        </div>
        <div class="db-metric">
          <span class="metric-label">Server Stats:</span>
          <span class="metric-value">${dbInfo.mongodb.serverStatsCount}</span>
        </div>
        <div class="db-metric">
          <span class="metric-label">Alle Benutzer:</span>
          <span class="metric-value">${dbInfo.mongodb.allUsersCount || 0}</span>
        </div>
      </div>
    `;
    databaseSection.appendChild(mongoSection);
    
    const sqliteSection = document.createElement('div');
    sqliteSection.className = 'db-item';
    
    if (dbInfo.sqlite.error) {
      sqliteSection.innerHTML = `
        <h4>SQLite Status (User History)</h4>
        <div class="error-message">${dbInfo.sqlite.error}</div>
      `;
    } else {
      sqliteSection.innerHTML = `
        <h4>SQLite Status (User History)</h4>
        <div class="db-metrics">
          <div class="db-metric">
            <span class="metric-label">File Size:</span>
            <span class="metric-value">${dbInfo.sqlite.fileSize ? (dbInfo.sqlite.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</span>
          </div>
          <div class="db-metric">
            <span class="metric-label">Einträge:</span>
            <span class="metric-value">${dbInfo.sqlite.rowCount || 0}</span>
          </div>
        </div>
      `;
    }
    databaseSection.appendChild(sqliteSection);
    
    return databaseSection;
  },

  handleTaskManagerUpdate(tasks) {
    const tableBody = document.getElementById('task-manager-list');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    tasks.forEach(task => {
      const tr = document.createElement('tr');
      const tdIndex = document.createElement('td');
      tdIndex.textContent = task.index;
      const tdType = document.createElement('td');
      tdType.textContent = task.type;
      tr.appendChild(tdIndex);
      tr.appendChild(tdType);
      tableBody.appendChild(tr);
    });
  }
};

// addons/dashboard/public/modules/rolesManager.js
const RolesManager = {
  handleRolesUpdate(roles) {
    const list = document.getElementById('roles-list');
    list.innerHTML = '';
    roles.forEach(role => {
      const card = this.createRoleCard(role);
      list.appendChild(card);
    });
  },

  createRoleCard(role) {
    const card = document.createElement('div');
    card.className = 'role-card';
    
    const header = document.createElement('h4');
    header.textContent = role.name;
    
    const info = document.createElement('p');
    info.textContent = `ID: ${role.id}`;
    
    const permList = document.createElement('ul');
    role.permissions.forEach(perm => {
      const li = document.createElement('li');
      li.textContent = perm;
      permList.appendChild(li);
    });
    
    card.appendChild(header);
    card.appendChild(info);
    card.appendChild(permList);
    
    return card;
  }
};

// addons/dashboard/public/modules/auditLogManager.js
const AuditLogManager = {
  handleAuditLogUpdate(entries) {
    const list = document.getElementById('audit-log-list');
    list.innerHTML = '';
    entries.forEach(entry => {
      const auditEntry = this.renderAuditEntry(entry);
      list.appendChild(auditEntry);
    });
  },

  renderAuditEntry(entry) {
    const container = document.createElement('div');
    container.className = 'audit-entry';
    
    const avatar = document.createElement('img');
    avatar.className = 'audit-avatar';
    avatar.src = entry.executorAvatar;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'audit-info';
    
    let mainText = `<strong>${entry.executor}</strong> `;
    mainText += this.auditActionText(entry);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'audit-time';
    timeDiv.textContent = window.dashboardGlobals.formatTimestamp(entry.createdAt);
    
    const reasonP = document.createElement('p');
    reasonP.textContent = (entry.reason && entry.reason !== 'Kein Grund angegeben')
      ? `Grund: ${entry.reason}`
      : 'Grund: Kein Grund angegeben';
    
    infoDiv.innerHTML = `<p>${mainText}</p>`;
    infoDiv.appendChild(timeDiv);
    infoDiv.appendChild(reasonP);
    
    container.appendChild(avatar);
    container.appendChild(infoDiv);
    
    return container;
  },

  auditActionText(entry) {
    switch (entry.action) {
      case 'MESSAGE_DELETE':
        return `hat Nachrichten gelöscht (Ziel: ${entry.target}).`;
      case 'MEMBER_ROLE_UPDATE':
        return `hat die Rollen von ${entry.target} aktualisiert.`;
      case 'CHANNEL_OVERWRITE_CREATE':
        return `hat Channel Overwrites erstellt für ${entry.target}.`;
      default:
        return `hat die Aktion "${entry.action}" ausgeführt (Ziel: ${entry.target}).`;
    }
  }
};