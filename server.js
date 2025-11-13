import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import DatabaseService from "./server/database.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware pour JSON
app.use(express.json());

// Initialiser la base de données
try {
  await DatabaseService.init();
  console.log('Base de données initialisée avec succès');
} catch (error) {
  console.error('Erreur d\'initialisation de la base:', error);
  process.exit(1);
}

// Routes API pour les données de consommation
app.get("/api/consumption", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let data;
    
    if (startDate && endDate) {
      data = await DatabaseService.getConsumptionDataByDateRange(startDate, endDate);
    } else {
      data = await DatabaseService.getAllData();
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/consumption/day/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const data = await DatabaseService.getConsumptionDataByDay(date);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/consumption", async (req, res) => {
  try {
    const data = req.body;
    await DatabaseService.saveConsumptionData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/consumption/count", async (req, res) => {
  try {
    const count = await DatabaseService.countRecords();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/consumption/paginated", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const data = await DatabaseService.getPaginatedData(offset, parseInt(limit));
    const totalCount = await DatabaseService.countRecords();
    
    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes API pour les paramètres
app.get("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const value = await DatabaseService.getSetting(key);
    res.json(value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await DatabaseService.saveSetting(key, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route de réinitialisation de la base de données
app.post("/api/reset-database", async (req, res) => {
  try {
    await DatabaseService.close();
    
    // Vider la table consumption_data
    await DatabaseService.init();
    await DatabaseService.db.execute('DELETE FROM consumption_data');
    await DatabaseService.db.execute('DELETE FROM settings');
    
    res.json({ success: true, message: "Base de données MySQL réinitialisée" });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route de statut
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", database: "mysql" });
});

// Fichiers statiques du frontend
app.use(express.static(join(__dirname, "dist")));
app.get("*", (_, res) => res.sendFile(join(__dirname, "dist", "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('📌 Utilisez le cron externe pour la mise à jour des données');
});
