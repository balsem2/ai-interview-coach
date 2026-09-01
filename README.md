# AI Interview Coach

AI Interview Coach est une application web qui simule un entretien avec un assistant IA.  
L'utilisateur choisit un domaine, une difficulte et une duree, puis repond a des questions. L'application sauvegarde les reponses, calcule un score, donne un feedback et peut generer un rapport.

## Objectif DevOps

Ce projet est utilise comme cas d'etude DevOps pour mettre en place une chaine complete:

```text
Application AI Interview
        |
        v
Docker images
        |
        v
GitHub Container Registry
        |
        v
Ansible
        |
        v
K3s / Kubernetes
        |
        v
Deploiement automatise
```

L'objectif final est de deployer et superviser une application conteneurisee avec Docker, Kubernetes/K3s, Ansible, CI/CD, Prometheus et Grafana.

## Architecture

Le projet est compose de 4 services principaux:

| Service | Role |
| --- | --- |
| Frontend | Interface React servie par Nginx |
| Backend | API FastAPI |
| PostgreSQL | Base de donnees utilisateurs, questions, reponses et scores |
| Ollama | Moteur IA local avec le modele `llama3.2:1b` |

## Fonctionnalites deja realisees

- Authentification utilisateur avec JWT.
- Creation de compte avec sauvegarde dans PostgreSQL.
- Login/logout.
- Protection du dashboard par token.
- Renouvellement automatique du JWT avec refresh token.
- Import du dataset de questions dans PostgreSQL.
- Selection du domaine, difficulte et duree d'entretien.
- Questions aleatoires sans repetition pendant une meme session.
- Chat avec feedback IA via Ollama.
- Fallback local si Ollama est trop lent, pour eviter `Request failed`.
- Score automatique apres chaque reponse.
- Sauvegarde des reponses et scores dans PostgreSQL.
- Enregistrement des questions ignorees avec le statut `skipped`.
- Historique des entretiens avec ouverture du rapport de chaque session.
- Generation et mise en cache du rapport final.
- Rapport isole par session d'entretien avec detail question par question.
- Export PDF.
- Reponse par texte ou par dictee vocale.
- Dictee vocale en anglais, francais ou arabe.
- Integration webcam dans la salle d'entretien.
- Sauvegarde des moyennes de contact visuel, confiance et engagement par session.
- Dashboard et page Analytics alimentes par les donnees PostgreSQL reelles.
- Zone video et zone de reponse organisees pour simuler un vrai entretien.
- Docker Compose pour lancer tous les services localement.
- Images Docker frontend/backend poussees sur GitHub Container Registry.
- Verification automatique du backend, lint et build frontend avant publication des images.
- Deploiement sur K3s avec manifests Kubernetes.
- Automatisation avec Ansible.
- Acces local via `http://ai-interview.local`.
- Health checks backend avec probes Kubernetes.
- Supervision avec Prometheus et Grafana.
- Dashboard Grafana `AI Interview Monitoring`.
- Alertes Prometheus pour detecter les pannes et redemarrages des pods.
- Metriques applicatives FastAPI et temps de generation IA sur `/metrics`.
- Migrations de base de donnees avec Alembic.
- Sauvegarde PostgreSQL quotidienne par CronJob Kubernetes.
- Scan Trivy, tags Docker par commit et rollback automatique dans la CI/CD.

## Experience entretien

L'application ne se limite pas a un simple formulaire de questions/reponses.  
Elle fournit une interface proche d'un vrai entretien:

- affichage de la webcam du candidat;
- bouton micro pour dicter la reponse au lieu de l'ecrire;
- bouton d'envoi de reponse;
- suivi du temps d'entretien;
- progression question par question;
- feedback apres chaque reponse;
- sauvegarde des reponses pour le rapport final.

L'analyse faciale MediaPipe s'execute localement dans le navigateur. Elle mesure le contact visuel, la confiance et l'engagement sans envoyer la video au backend; seules les moyennes numeriques de la session sont sauvegardees.

## Structure du projet

```text
ai-interview-coach/
  backend/              FastAPI API
  frontend/             React frontend
  database/             Dataset public des questions
  k8s/                  Manifests Kubernetes
  ansible/              Inventory et playbooks Ansible
  monitoring/           Configuration Prometheus/Grafana et dashboards
  backend/alembic/      Migrations versionnees de PostgreSQL
  docker-compose.yml    Lancement local avec Docker Compose
  DOCKER.md             Notes Docker
  setup-env.ps1         Creation automatique du fichier backend/.env
```

## Prerequis & Documentation

### Local Development

- Docker Desktop
- Git
- Ollama image via Docker Compose
- Python 3.10+
- Node.js 18+

**See:** [Complete Installation Guide](docs/INSTALLATION_GUIDE.md)

### Production Deployment (Kubernetes)

- Une VM Ubuntu 20.04+
- K3s installe
- Ansible installe dans WSL ou Linux
- Acces SSH vers la VM
- Docker/GHCR pour publier les images

**See:** [K3s Deployment Guide](docs/INSTALLATION_GUIDE.md#kubernetes-k3s-production-deployment)

## Lancement local avec Docker Compose

Depuis la racine du projet:

```powershell
.\setup-env.ps1
docker compose up --build
```

Le conteneur backend execute automatiquement `alembic upgrade head` avant de lancer FastAPI.

Pour un lancement du backend sans Docker:

```powershell
cd backend
.\venv\Scripts\alembic.exe upgrade head
.\venv\Scripts\python.exe -m uvicorn main:app --port 8001
```

Puis ouvrir:

```text
http://localhost:3000
```

La premiere fois, telecharger le modele Ollama:

```powershell
docker exec -it ai-interview-ollama ollama pull llama3.2:1b
```

Importer les questions dans PostgreSQL:

```powershell
docker compose exec backend python scripts/import_questions.py
```

## Deploiement Kubernetes/K3s

Les fichiers Kubernetes sont dans `k8s/`:

```text
00-namespace.yml
01-postgres.yml
02-backend.yml
03-ollama.yml
04-frontend.yml
05-ollama-model-job.yml
06-import-questions-job.yml
07-ingress.yml
08-postgres-backup.yml
```

Deploiement avec Ansible:

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbooks/03-deploy-app.yml
```

Verifier les pods:

```bash
ansible k3s_servers -i ansible/inventory.ini -m shell -a "kubectl get pods -n ai-interview" --become
```

Configurer le fichier Windows hosts:

```text
127.0.0.1 ai-interview.local
```

Puis ouvrir:

```text
http://ai-interview.local
```

## Monitoring Prometheus/Grafana

La supervision est decrite dans le dossier `monitoring/`:

```text
monitoring/
  values.yml
  dashboards/
    ai-interview-monitoring.json
  alerts/
    ai-interview-alerts.yml
```

Installation ou mise a jour avec Ansible:

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbooks/04-install-monitoring.yml
```

Ce playbook:

- installe Helm si necessaire;
- ajoute le repo Helm `prometheus-community`;
- installe ou met a jour `kube-prometheus-stack`;
- expose Grafana sur le NodePort `30300`;
- charge automatiquement le dashboard `AI Interview Monitoring`;
- applique les regles d'alertes Prometheus.

Ouvrir Grafana:

```text
http://192.168.56.101:30300
```

Recuperer le mot de passe admin:

```bash
ssh balsem@192.168.56.101
sudo kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d; echo
```

Le dashboard suit:

- etat des pods du namespace `ai-interview`;
- CPU par pod;
- memoire par pod;
- redemarrages des pods.
- volume et duree des requetes backend;
- duree et erreurs de generation Ollama/OpenAI.

Les alertes Prometheus suivent:

- backend indisponible;
- frontend indisponible;
- PostgreSQL indisponible;
- Ollama indisponible;
- redemarrage d'un pod;
- CPU eleve par pod;
- memoire elevee par pod.
- taux eleve d'erreurs HTTP;
- echecs repetes de generation IA.

## Sauvegarde PostgreSQL

Le manifeste `k8s/08-postgres-backup.yml` cree un CronJob qui execute `pg_dump` chaque jour a 02:00. Les sauvegardes compressees sont conservees sept jours dans le PVC `postgres-backups-pvc`.

Verifier les executions de sauvegarde:

```bash
kubectl get cronjob postgres-backup -n ai-interview
kubectl get jobs -n ai-interview | grep postgres-backup
```

La restauration doit etre testee dans un environnement hors production avant de remplacer la base active.

## Securite CI/CD

Avant publication, GitHub Actions execute les tests backend, ESLint, le build frontend et un scan Trivy des deux images. Les images valides recoivent `latest` et le SHA du commit. Le deploiement utilise le SHA immutable, attend la fin du rollout et restaure la revision precedente en cas d'echec.

Verifier les alertes installees:

```bash
ansible k3s_servers -i ansible/inventory.ini -m shell -a "kubectl get prometheusrule -n monitoring ai-interview-alerts" --become
```

## Secrets et environnement

Le fichier `backend/.env` ne doit pas etre pousse sur GitHub.

Un exemple est fourni:

```text
backend/.env.example
```

Les secrets Kubernetes sont crees par Ansible avec:

```bash
ansible/playbooks/02-create-secrets.yml
```

Des exemples non appliques automatiquement sont disponibles dans `docs/production/` pour activer TLS avec cert-manager et les notifications Alertmanager. Il faut remplacer le domaine et injecter les credentials depuis un gestionnaire de secrets avant de les utiliser.

Les URLs MediaPipe peuvent aussi etre remplacees au build du frontend avec `VITE_MEDIAPIPE_WASM_URL` et `VITE_MEDIAPIPE_MODEL_URL` afin d'heberger le modele localement au lieu d'utiliser les CDN publics.

## Images Docker

Les images publiees sont:

```text
ghcr.io/balsem2/ai-interview-backend:latest
ghcr.io/balsem2/ai-interview-frontend:latest
```

## Etat actuel

L'application fonctionne actuellement sur K3s avec:

- frontend running
- backend running
- postgres running
- ollama running
- import questions completed
- modele Ollama `llama3.2:1b` installe automatiquement par Job Kubernetes
- monitoring Prometheus/Grafana installe
- dashboard `AI Interview Monitoring` disponible
- alertes Prometheus `ai-interview-alerts` installees

## Documentation

Comprehensive guides for all aspects of the project:

| Guide | Purpose |
|-------|---------|
| [Installation Guide](docs/INSTALLATION_GUIDE.md) | Local development, Docker Compose, K3s deployment |
| [Alertmanager Setup](docs/production/ALERTMANAGER_SETUP.md) | Email, Slack, Teams notifications |
| [Webcam Analysis](docs/production/WEBCAM_ANALYSIS.md) | Privacy, metrics, enhancement roadmap |
| [Docker Notes](DOCKER.md) | Container troubleshooting |

## Troubleshooting & Maintenance

If Docker Desktop or services stop unexpectedly:

```powershell
# Restart Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 10

# Restart services
docker compose up -d

# Load Ollama model
docker compose exec ollama ollama pull llama3.2:1b
```

**See:** [Full Troubleshooting Guide](docs/INSTALLATION_GUIDE.md#troubleshooting)



- Configure Alertmanager for production notifications
- Enable TLS with cert-manager
- Implement enhanced webcam analysis
- Externaliser les sauvegardes vers un stockage objet hors cluster
- Renforcer l'analyse faciale avec de vrais indicateurs webcam
- Ajouter une transcription serveur pour les navigateurs sans Web Speech API
