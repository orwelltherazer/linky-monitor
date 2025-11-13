import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import mysql from 'mysql2/promise';
import fs from 'fs';

class MigrationService {
  constructor() {
    this.sqliteConfig = {
      dbPath: './old_linky_monitor.db'
    };
    
    this.mysqlConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'linky-monitor',
      charset: 'utf8mb4'
    };
  }

  async migrate() {
    console.log('🚀 Début de la migration SQLite → MySQL...');
    
    try {
      // 1. Connexion à SQLite
      console.log('📦 Connexion à SQLite...');
      const sqliteData = await this.getSQLiteData();
      
      if (sqliteData.consumption.length === 0 && sqliteData.settings.length === 0) {
        console.log('ℹ️  Aucune donnée à migrer');
        return;
      }
      
      console.log(`📊 Données trouvées : ${sqliteData.consumption.length} enregistrements de consommation, ${sqliteData.settings.length} paramètres`);
      
      // 2. Connexion à MySQL et création des tables
      console.log('🗄️  Connexion à MySQL...');
      const mysqlConnection = await mysql.createConnection(this.mysqlConfig);
      
      // 3. Création des tables
      await this.createMySQLTables(mysqlConnection);
      
      // 4. Migration des données
      console.log('📋 Migration des données de consommation...');
      await this.migrateConsumptionData(mysqlConnection, sqliteData.consumption);
      
      console.log('⚙️  Migration des paramètres...');
      await this.migrateSettings(mysqlConnection, sqliteData.settings);
      
      // 5. Fermeture des connexions
      await mysqlConnection.end();
      
      console.log('✅ Migration terminée avec succès !');
      console.log(`📈 ${sqliteData.consumption.length} enregistrements de consommation migrés`);
      console.log(`⚙️  ${sqliteData.settings.length} paramètres migrés`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      throw error;
    }
  }

  async getSQLiteData() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.sqliteConfig.dbPath, async (err) => {
        if (err) {
          if (err.code === 'SQLITE_CANTOPEN') {
            console.log('ℹ️  Base de données SQLite introuvable, aucune donnée à migrer');
            resolve({ consumption: [], settings: [] });
            return;
          }
          reject(err);
          return;
        }

        try {
          const all = promisify(db.all.bind(db));
          
          // Récupérer les données de consommation
          let consumption = [];
          try {
            consumption = await all('SELECT * FROM consumption_data ORDER BY timestamp');
          } catch (error) {
            console.log('ℹ️  Table consumption_data introuvable ou vide');
          }
          
          // Récupérer les paramètres
          let settings = [];
          try {
            settings = await all('SELECT * FROM settings');
          } catch (error) {
            console.log('ℹ️  Table settings introuvable ou vide');
          }
          
          db.close();
          resolve({ consumption, settings });
        } catch (error) {
          db.close();
          reject(error);
        }
      });
    });
  }

  async createMySQLTables(connection) {
    console.log('🏗️  Création des tables MySQL...');
    
    // Table consumption_data
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS consumption_data (
        timestamp VARCHAR(255) PRIMARY KEY,
        papp INT,
        hchc INT,
        hchp INT,
        ptec INT,
        day VARCHAR(255),
        date DATE,
        INDEX idx_consumption_date (date),
        INDEX idx_consumption_day (day),
        INDEX idx_consumption_papp (papp),
        INDEX idx_consumption_hchc (hchc),
        INDEX idx_consumption_hchp (hchp),
        INDEX idx_consumption_ptec (ptec)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Table settings
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Tables MySQL créées');
  }

  async migrateConsumptionData(connection, consumptionData) {
    if (consumptionData.length === 0) return;
    
    console.log(`📊 Migration de ${consumptionData.length} enregistrements de consommation...`);
    
    const stmt = `
      INSERT INTO consumption_data 
      (timestamp, papp, hchc, hchp, ptec, day, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      papp = VALUES(papp),
      hchc = VALUES(hchc),
      hchp = VALUES(hchp),
      ptec = VALUES(ptec),
      day = VALUES(day),
      date = VALUES(date)
    `;
    
    // Traitement par lots pour éviter les problèmes de mémoire
    const batchSize = 1000;
    for (let i = 0; i < consumptionData.length; i += batchSize) {
      const batch = consumptionData.slice(i, i + batchSize);
      
      for (const record of batch) {
        await connection.execute(stmt, [
          record.timestamp,
          record.papp || null,
          record.hchc || null,
          record.hchp || null,
          record.ptec || null,
          record.day || record.timestamp?.split('T')[0],
          record.date || record.timestamp?.split('T')[0]
        ]);
      }
      
      console.log(`📈 ${Math.min(i + batchSize, consumptionData.length)}/${consumptionData.length} enregistrements migrés`);
    }
  }

  async migrateSettings(connection, settingsData) {
    if (settingsData.length === 0) return;
    
    console.log(`⚙️  Migration de ${settingsData.length} paramètres...`);
    
    const stmt = `
      INSERT INTO settings (\`key\`, value) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `;
    
    for (const setting of settingsData) {
      await connection.execute(stmt, [setting.key, setting.value]);
    }
  }

  // Méthode pour créer une sauvegarde avant migration
  async backupSQLite() {
    const backupPath = `./backup_sqlite_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    
    if (fs.existsSync(this.sqliteConfig.dbPath)) {
      fs.copyFileSync(this.sqliteConfig.dbPath, backupPath);
      console.log(`💾 Sauvegarde SQLite créée : ${backupPath}`);
      return backupPath;
    }
    
    return null;
  }
}

export default new MigrationService();