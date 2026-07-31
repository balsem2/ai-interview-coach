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
- Import du dataset de questions dans PostgreSQL.
- Selection du domaine, difficulte et duree d'entretien.
- Questions aleatoires depuis la base de donnees.
- Chat avec feedback IA via Ollama.
- Fallback local si Ollama est trop lent, pour eviter `Request failed`.
- Score automatique apres chaque reponse.
- Sauvegarde des reponses et scores dans PostgreSQL.
- Generation de rapport.
- Export PDF.
- Reponse par texte ou par dictee vocale.
- Integration webcam dans la salle d'entretien.
- Zone video et zone de reponse organisees pour simuler un vrai entretien.
- Docker Compose pour lancer tous les services localement.
- Images Docker frontend/backend poussees sur GitHub Container Registry.
- Deploiement sur K3s avec manifests Kubernetes.
- Automatisation avec Ansible.
- Acces local via `http://ai-interview.local`.
- Health checks backend avec probes Kubernetes.
- Supervision avec Prometheus et Grafana.
- Dashboard Grafana `AI Interview Monitoring`.

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

La partie analyse faciale est prevue pour mesurer des indicateurs comme l'attention, la confiance ou l'engagement a partir de la camera. Cette partie est dans le perimetre du projet et sera renforcee dans les prochaines etapes.

## Structure du projet

```text
ai-interview-coach/
  backend/              FastAPI API
  frontend/             React frontend
  database/             Dataset public des questions
  k8s/                  Manifests Kubernetes
  ansible/              Inventory et playbooks Ansible
  monitoring/           Configuration Prometheus/Grafana et dashboards
  docker-compose.yml    Lancement local avec Docker Compose
  DOCKER.md             Notes Docker
  setup-env.ps1         Creation automatique du fichier backend/.env
```

## Prerequis

Pour lancer le projet en local avec Docker Compose:

- Docker Desktop
- Git
- Ollama image via Docker Compose

Pour le deploiement Kubernetes:

- Une VM Ubuntu
- K3s installe
- Ansible installe dans WSL ou Linux
- Acces SSH vers la VM
- Docker/GHCR pour publier les images

## Lancement local avec Docker Compose

Depuis la racine du projet:

```powershell
.\setup-env.ps1
docker compose up --build
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
- charge automatiquement le dashboard `AI Interview Monitoring`.

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

## Prochaines etapes

- Ajouter alertes.
- Ajouter scan de securite des images.
- Renforcer l'analyse faciale avec de vrais indicateurs webcam.
- Ameliorer l'analyse vocale et la transcription.
- Ameliorer la documentation d'installation.
