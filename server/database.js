import mysql from 'mysql2/promise';

import dotenv from 'dotenv';
dotenv.config({ silent: true });

class DatabaseService {
  constructor() {
    this.db = null;
    
    // Vérifier que les variables d'environnement sont bien chargées
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      console.error('❌ Variables d\'environnement manquantes:');
      console.error('DB_HOST:', process.env.DB_HOST);
      console.error('DB_USER:', process.env.DB_USER);
      console.error('DB_NAME:', process.env.DB_NAME);
      throw new Error('Configuration de base de données incomplète dans .env');
    }
    
    this.config = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    };
    

  }

  async init() {
    if (this.db) {
      return this.db;
    }
    
    try {
      this.db = await mysql.createConnection(this.config);

      await this.createTables();
      return this.db;
    } catch (err) {
      console.error('Erreur lors de la connexion à MySQL:', err);
      throw err;
    }
  }

  async createTables() {
    try {
      // Table pour les données de consommation
      await this.db.execute(`
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

      // Table pour les paramètres
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);


    } catch (error) {
      console.error('Erreur lors de la création des tables:', error);
      throw error;
    }
  }

  async saveConsumptionData(data) {
    if (!this.db) {
      await this.init();
    }
    
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
    
    await this.db.execute(stmt, [
      data.timestamp,
      data.papp,
      data.hchc || null,
      data.hchp || null,
      data.ptec || null,
      data.day || data.timestamp.split('T')[0],
      data.timestamp.split('T')[0]
    ]);
  }

  async getConsumptionDataByDateRange(startDate, endDate) {
    if (!this.db) {
      await this.init();
    }
    
    const stmt = `
      SELECT * FROM consumption_data 
      WHERE date BETWEEN ? AND ? 
      ORDER BY timestamp ASC
    `;
    
    const [rows] = await this.db.execute(stmt, [startDate, endDate]);
    return rows;
  }

  async getConsumptionDataByDay(date) {
    if (!this.db) {
      await this.init();
    }
    
    let dayPrefix;
    if (typeof date === 'string') {
      dayPrefix = date;
    } else {
      dayPrefix = date.toISOString().split('T')[0];
    }
    
    const stmt = `
      SELECT * FROM consumption_data 
      WHERE day = ? 
      ORDER BY timestamp ASC
    `;
    
    const [rows] = await this.db.execute(stmt, [dayPrefix]);
    return rows;
  }

  async getAllData() {
    if (!this.db) {
      await this.init();
    }
    
    const stmt = 'SELECT * FROM consumption_data ORDER BY timestamp ASC';
    const [rows] = await this.db.execute(stmt);
    return rows;
  }

  async countRecords() {
    if (!this.db) {
      await this.init();
    }
    
    const [rows] = await this.db.execute('SELECT COUNT(*) as count FROM consumption_data');
    return rows[0].count;
  }

  async getPaginatedData(offset, limit) {
    if (!this.db) {
      await this.init();
    }
    
    const stmt = `
      SELECT * FROM consumption_data 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await this.db.execute(stmt, [limit, offset]);
    return rows;
  }

  async saveSetting(key, value) {
    if (!this.db) {
      await this.init();
    }
    
    const stmt = `
      INSERT INTO settings (\`key\`, value) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `;
    await this.db.execute(stmt, [key, JSON.stringify(value)]);
  }

  async getSetting(key) {
    if (!this.db) {
      await this.init();
    }
    
    const [rows] = await this.db.execute('SELECT value FROM settings WHERE `key` = ?', [key]);
    return rows.length > 0 ? JSON.parse(rows[0].value) : null;
  }

  async close() {
    if (this.db) {
      await this.db.end();

    }
  }
}

export default new DatabaseService();