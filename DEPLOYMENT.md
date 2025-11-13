# Déploiement de Linky Monitor

## Instructions de déploiement

### Option 1 : Script automatique

**Windows :**
```bash
deploy.bat
```

**Linux/Mac :**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 2 : Manuel

1. **Installation des dépendances**
   ```bash
   npm ci
   ```

2. **Build du frontend**
   ```bash
   npm run build
   ```

3. **Démarrage du serveur**
   ```bash
   npm start
   ```

### Option 3 : Commande unique
```bash
npm run deploy
```

## Fichiers générés

- `dist/` : Frontend buildé
- `linky_monitor.db` : Base de données SQLite (créée au premier démarrage)

## Configuration de production

L'application est configurée pour :
- Servir le frontend buildé depuis le dossier `dist/`
- Utiliser SQLite comme base de données
- Écouter sur le port 3000 (ou variable d'environnement `PORT`)

## Déploiement sur serveur distant

1. Copier tous les fichiers sur le serveur
2. Configurer la base de données MySQL :
   ```bash
   mysql -u root -p
   CREATE DATABASE `linky-monitor` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Créer le fichier `.env` avec la configuration MySQL
4. Exécuter `npm ci --production`
5. **Migration des données (si vous avez des données SQLite existantes)** :
   ```bash
   npm run migrate
   ```
6. Lancer `npm run build`
7. Démarrer avec `npm start`

Pour un déploiement robuste, utilisez un process manager comme PM2 :
```bash
npm install -g pm2
pm2 start server.js --name "linky-monitor"
```

## Migration SQLite → MySQL

Le script de migration :
- Crée automatiquement les tables MySQL
- Transfère toutes les données de consommation
- Migre les paramètres
- Crée une sauvegarde SQLite avant migration
- Traite les données par lots pour éviter les timeouts

```bash
npm run migrate
```