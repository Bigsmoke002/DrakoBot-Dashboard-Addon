// addons/dashboard/dashboardAddon.js

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const { MongoClient } = require('mongodb');
const sqlite3 = require('sqlite3').verbose();

// Lade Module
const { setupEndpoints } = require('./modules/endpoints');
const { setupSocketHandlers } = require('./modules/socketHandlers');
const { setupDiscordEvents } = require('./modules/discordEvents');
const { setupIntervals } = require('./modules/intervals');

const defaultConfig = {
  port: 3000,
  host: "127.0.0.1",
  adminRoleId: "ADMIN_ROLE_ID_HERE",
  mongoUri: "mongodb://127.0.0.1:27017",
  mongoDbName: "discord-dashboard",
  socketIoClient: "cdn",
  userStatusUpdateInterval: 10 // in Sekunden
};

module.exports.run = async (client) => {
  const addonDir = __dirname;
  const configPath = path.join(addonDir, 'config.json');

  // Config-Setup
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    console.log("Dashboard Addon: Default config.json created");
  }
  let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // MongoDB-Verbindung
  const mongoUrl = config.mongoUri || "mongodb://127.0.0.1:27017";
  let mongoClient;
  try {
    mongoClient = await MongoClient.connect(mongoUrl, { useUnifiedTopology: true });
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    return;
  }

  const dbMongo = mongoClient.db(config.mongoDbName || 'discord-dashboard');
  const collections = {
    messageLogs: dbMongo.collection('messageLogs'),
    auditLogs: dbMongo.collection('auditLogs'),
    presenceLogs: dbMongo.collection('presenceLogs'),
    memberLogs: dbMongo.collection('memberLogs'),
    users: dbMongo.collection('users'),
    serverStats: dbMongo.collection('serverStats'),
    historicalServers: dbMongo.collection('historicalServers'),
    usernameChanges: dbMongo.collection('usernameChanges'),
    userActivities: dbMongo.collection('userActivities'),
    allUsers: dbMongo.collection('allUsers') // Neue Collection für User-Übersicht
  };

  // SQLite-Verbindung
  const sqliteDbPath = path.join(addonDir, 'userHistory.db');
  const sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
    if (err) console.error("Error connecting to SQLite for user history:", err);
    else console.log("Connected to SQLite for user history");
  });

  // SQLite Tabellen erstellen
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS userHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      old_status TEXT,
      new_status TEXT,
      activities TEXT,
      timestamp TEXT
    )
  `, (err) => {
    if (err) console.error("Error creating userHistory table:", err);
  });

  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS usernameChanges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      old_username TEXT,
      new_username TEXT,
      old_discriminator TEXT,
      new_discriminator TEXT,
      old_nickname TEXT,
      new_nickname TEXT,
      timestamp TEXT
    )
  `, (err) => {
    if (err) console.error("Error creating usernameChanges table:", err);
  });

  // Express-Setup
  const socketIoSourceUrl = config.socketIoClient === "cdn" ?
    "https://cdn.socket.io/4.5.1/socket.io.min.js" :
    "/socket.io/socket.io.js";

  const appServer = express();
  const server = http.createServer(appServer);
  const io = socketIo(server);

  appServer.use(express.json());

  // Gemeinsame Datenstrukturen
  const sharedData = {
    eventLog: [],
    usernameMappings: new Map(),
    performanceHistory: [],
    userStatusUpdateIntervals: new Map() // Für individuelle Update-Intervalle
  };

  // Module initialisieren
  setupEndpoints(appServer, client, collections, sqliteDb, config, configPath, sharedData);
  setupSocketHandlers(io, client, collections, sqliteDb, sharedData);
  setupDiscordEvents(client, collections, sqliteDb, io, sharedData);
  setupIntervals(client, collections, sqliteDb, io, config, sharedData);

  // Statische Dateien
  appServer.use('/static', express.static(path.join(addonDir, 'public')));

  // index.html laden
  appServer.get('/', (req, res) => {
    const indexPath = path.join(addonDir, 'public', 'index.html');
    fs.readFile(indexPath, 'utf-8', (err, data) => {
      if (err) return res.status(500).send("Error loading dashboard.");
      const modifiedData = data.replace('{{socketIoSource}}', socketIoSourceUrl);
      res.send(modifiedData);
    });
  });

  // Server starten
  const serverPort = config.port;
  // Standardmäßig nur lokal erreichbar – das Dashboard hat keinen Login
  const serverHost = config.host || '127.0.0.1';
  server.listen(serverPort, serverHost, function() {
    console.log(`Dashboard Addon running on http://${serverHost}:${serverPort}`);
  });
};