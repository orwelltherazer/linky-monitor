import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';

class DatabaseBackup {
  constructor() {
    this.dbPath = './linky_monitor.db';
    this.backupDir = './backups';
  }

  async createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.backupDir}/linky_monitor_backup_${timestamp}.db`;

    return new Promise((resolve, reject) => {
      const source = new sqlite3.Database(this.dbPath);
      const backup = new sqlite3.Database(backupPath);

      source.backup(backup, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Sauvegarde créée: ${backupPath}`);
          resolve(backupPath);
        }
        source.close();
        backup.close();
      });
    });
  }

  async restoreBackup(backupPath) {
    return new Promise((resolve, reject) => {
      const backup = new sqlite3.Database(backupPath);
      const target = new sqlite3.Database(this.dbPath);

      backup.backup(target, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Base de données restaurée depuis: ${backupPath}`);
          resolve();
        }
        backup.close();
        target.close();
      });
    });
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }
    
    return fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('linky_monitor_backup_') && file.endsWith('.db'))
      .sort()
      .reverse();
  }
}

export default new DatabaseBackup();