// addons/dashboard/public/client.js

// Import der Module (diese werden als separate Dateien erstellt)
// In der Browser-Umgebung müssen diese über script-Tags geladen werden

if (typeof window === 'undefined') {
  console.error("client.js should only be run in the browser.");
} else {
  // Globale Variablen
  const socket = io();
  let selectedServerId = null;
  let currentUserList = [];
  let allUsersList = [];
  let allUsersPagination = { offset: 0, limit: 50 };
  const openHistoryPanels = {};
  const userLiveStreams = {};

  // Globale Variablen für Aktivitätsprotokoll
  let userActivityLog = [];
  let activityPagination = { offset: 0, limit: 20 };
  let activityFilters = { type: 'all', user: '', days: 'all' };

  // Hauptinitialisierung
  document.addEventListener("DOMContentLoaded", () => {
    initializeTabs();
    setupEventListeners();
    initializeSocketHandlers();
  });

  // Tab-Initialisierung
  function initializeTabs() {
    const tabs = document.querySelectorAll(".tab-menu li");
    const panels = document.querySelectorAll(".tab-panel");
    
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const panelId = tab.getAttribute("data-tab");
        document.getElementById(panelId).classList.add("active");
        
        // Tab-spezifische Lade-Funktionen
        handleTabSwitch(panelId);
      });
    });
  }

  // Tab-Wechsel Handler
  function handleTabSwitch(panelId) {
    switch(panelId) {
      case "channels": 
        ChannelManager.loadChannels(selectedServerId); 
        break;
      case "server-stats": 
        ServerStatsManager.loadServerStats(selectedServerId); 
        break;
      case "active": 
        ActiveUsersManager.loadActive(selectedServerId); 
        break;
      case "bot-status": 
        BotStatusManager.loadBotStatus(); 
        break;
      case "old-servers": 
        HistoricalServersManager.loadHistoricalServers(); 
        break;
      case "user-activity-log": 
        ActivityManager.loadUserActivityLog(selectedServerId, true); 
        break;
      case "config-editor": 
        ConfigManager.loadConfigEditor(); 
        break;
      case "all-users": 
        AllUsersManager.loadAllUsers(true); 
        break;
    }
  }

  // Event-Listener Setup
  function setupEventListeners() {
    // Server Selector
    document.getElementById('server-selector').addEventListener('change', (e) => {
      selectedServerId = e.target.value;
      clearPanels();
      UserHistoryManager.unsubscribeAll(socket, userLiveStreams);
    });

    // Update-Intervall
    const updateIntervalSelect = document.getElementById('update-interval');
    if (updateIntervalSelect) {
      updateIntervalSelect.addEventListener('change', (e) => {
        const interval = parseInt(e.target.value);
        if (selectedServerId) {
          socket.emit('setUpdateInterval', { guildId: selectedServerId, interval });
        }
      });
    }

    // Aktivitätsprotokoll Event-Listener
    ActivityManager.setupEventListeners(activityFilters, activityPagination);
    
    // User-Filter Event-Listener
    UserStatusManager.setupEventListeners();

    // Alle Benutzer Event-Listener
    AllUsersManager.setupEventListeners(allUsersPagination);

    // Gespeicherte Logs Event-Listener
    StoredLogsManager.setupEventListeners(selectedServerId);
  }

  // Socket-Handler Initialisierung
  function initializeSocketHandlers() {
    // Server-Liste Updates
    socket.on('serverListUpdate', (servers) => {
      ServerManager.handleServerListUpdate(servers, selectedServerId);
      // Update selectedServerId if it was changed
      if (!selectedServerId && servers.length > 0) {
        const activeServers = servers.filter(server => server.active);
        if (activeServers.length > 0) {
          selectedServerId = activeServers[0].id;
        }
      }
    });

    // User Status Updates
    socket.on('userStatusUpdate', (data) => {
      if (!selectedServerId || data.guildId !== selectedServerId) return;
      currentUserList = data.users;
      UserStatusManager.renderUserList(currentUserList, openHistoryPanels);
    });

    // Live Events
    socket.on('initialLog', (events) => {
      LiveEventsManager.handleInitialLog(events, selectedServerId);
    });

    socket.on('newEvent', (event) => {
      if (!selectedServerId || event.guild_id !== selectedServerId) return;
      LiveEventsManager.renderEventCard(event, true);
    });

    // Performance Updates
    socket.on('performanceUpdate', (data) => {
      PerformanceManager.handlePerformanceUpdate(data);
    });

    // Task Manager Updates
    socket.on('taskManagerUpdate', (tasks) => {
      PerformanceManager.handleTaskManagerUpdate(tasks);
    });

    // Update-Intervall Bestätigung
    socket.on('updateIntervalSet', (data) => {
      if (data.success) {
        console.log(`Update interval for guild ${data.guildId} set to ${data.interval} seconds`);
      }
    });

    // Live-Updates für User History
    UserHistoryManager.setupSocketHandlers(socket, selectedServerId, openHistoryPanels);

    // Weitere Socket-Events
    setupAdditionalSocketHandlers();

    // Socket-Event für Connect
    socket.on('connect', () => {
      console.log('Socket connected, requesting data if needed');
      if (selectedServerId && document.getElementById('active').classList.contains('active')) {
        console.log('Requesting active data on socket connect');
        socket.emit('requestActiveUpdate', { guildId: selectedServerId });
      }
    });
  }

  // Zusätzliche Socket-Handler
  function setupAdditionalSocketHandlers() {
    // Rollen-Updates
    socket.on('rolesUpdate', (data) => {
      if (!selectedServerId || data.guildId !== selectedServerId) return;
      RolesManager.handleRolesUpdate(data.roles);
    });

    // Audit Log Updates
    socket.on('auditLogUpdate', (data) => {
      if (!selectedServerId || data.guildId !== selectedServerId) return;
      AuditLogManager.handleAuditLogUpdate(data.entries);
    });
  }

  // Panels löschen
  function clearPanels() {
    document.getElementById('log-list').innerHTML = '';
    document.getElementById('user-status-list').innerHTML = '';
    document.getElementById('roles-list').innerHTML = '';
    document.getElementById('audit-log-list').innerHTML = '';
    document.getElementById('channels-list').innerHTML = '';
    document.getElementById('server-stats-data').innerHTML = '';
    document.getElementById('voice-activity-table').innerHTML = '';
    document.getElementById('chat-activity-table').innerHTML = '';
    const activityContainer = document.getElementById('activity-log-container');
    if (activityContainer) activityContainer.innerHTML = '';
    const configEditor = document.getElementById('config-editor');
    if (configEditor) configEditor.innerHTML = '';
  }

  // Hilfsfunktionen
  function formatTimestamp(ts) {
    return new Date(ts).toLocaleString();
  }

  function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'gerade eben';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      return new Date(timestamp).toLocaleString();
    }
  }

  // Globale Variablen für andere Module verfügbar machen
  window.dashboardGlobals = {
    socket,
    selectedServerId: () => selectedServerId,
    setSelectedServerId: (id) => { selectedServerId = id; },
    currentUserList: () => currentUserList,
    setCurrentUserList: (list) => { currentUserList = list; },
    allUsersList: () => allUsersList,
    setAllUsersList: (list) => { allUsersList = list; },
    allUsersPagination,
    openHistoryPanels,
    userLiveStreams,
    userActivityLog: () => userActivityLog,
    setUserActivityLog: (log) => { userActivityLog = log; },
    activityPagination,
    activityFilters,
    formatTimestamp,
    getTimeAgo
  };
}