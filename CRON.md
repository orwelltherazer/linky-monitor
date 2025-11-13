# Configuration du cron externe pour Linky Monitor

## 📋 Présentation

Ce document explique comment configurer un cron système externe pour mettre à jour automatiquement les données de Linky Monitor.

## 🚀 Scripts disponibles

Le projet inclut un script standalone `cron-updater.js` qui peut être appelé directement depuis votre cron système :

### Mise à jour des données récentes
```bash
node cron-updater.js update
# ou via npm
npm run cron:update
```

### Mise à jour de l'historique complet
```bash
node cron-updater.js historical
# ou via npm
npm run cron:historical
```

## ⚙️ Configuration du cron

### Sur Linux/macOS (crontab)

1. Ouvrir l'éditeur crontab :
```bash
crontab -e
```

2. Ajouter les lignes suivantes :
```bash
# Mettre à jour les données toutes les 5 minutes
*/5 * * * * cd /chemin/vers/votre/projet/linky-monitor && npm run cron:update >> /var/log/linky-monitor.log 2>&1

# Mettre à jour l'historique toutes les heures
0 * * * * cd /chemin/vers/votre/projet/linky-monitor && npm run cron:historical >> /var/log/linky-monitor.log 2>&1
```

### Sur Windows (Task Scheduler)

1. Ouvrir le "Planificateur de tâches"
2. Créer une nouvelle tâche
3. Configurer les actions :
   - Programme : `node`
   - Arguments : `cron-updater.js update`
   - Dossier de départ : `C:\chemin\vers\votre\projet\linky-monitor`

4. Configurer le déclencheur :
   - Pour les données récentes : toutes les 5 minutes
   - Pour l'historique : toutes les heures

## 📝 Logs

Les scripts génèrent des logs détaillés :
- ✅ Succès : mise à jour effectuée
- ⚠️ Avertissements : seuils dépassés
- ❌ Erreurs : problèmes de connexion ou de traitement

## 🔧 Prérequis

1. **Node.js** installé sur le serveur
2. **Variables d'environnement** configurées (fichier `.env`)
3. **Base de données** initialisée
4. **URL API ThingSpeak** configurée dans les paramètres de l'application

## 🛠️ Dépannage

### Vérifier la configuration
```bash
# Tester manuellement
npm run cron:update
npm run cron:historical
```

### Vérifier les logs
```bash
# Sur Linux/macOS
tail -f /var/log/linky-monitor.log

# Sur Windows
Get-Content -Path "C:\chemin\vers\logs\linky-monitor.log" -Wait
```

### Erreurs communes
- **URL API non configurée** : Configurez l'URL ThingSpeak dans l'interface web
- **Problèmes de permissions** : Vérifiez que l'utilisateur du cron a les droits d'écriture
- **Base de données inaccessible** : Vérifiez que la base de données est bien démarrée

## 📊 Fréquences recommandées

- **Données récentes** : toutes les 5-10 minutes
- **Historique complet** : 1-2 fois par jour
- **Sauvegarde** : une fois par jour (script backup existant)

## 🔄 Désactivation du cron intégré

Si vous utilisez le cron externe, vous pouvez désactiver le cron intégré en commentant ces lignes dans `server.js` :

```javascript
// setTimeout(startCronJobs, 2000);
```