# Complete Installation Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Kubernetes (K3s) Production Deployment](#kubernetes-production-deployment)
4. [Troubleshooting](#troubleshooting)
5. [Performance Tuning](#performance-tuning)

---

## Local Development Setup

### Prerequisites

- **Windows 10/11 with WSL2** or **Linux/macOS**
- **Git** (https://git-scm.com)
- **Python 3.10+** (https://www.python.org)
- **Node.js 18+** (https://nodejs.org)
- **Docker Desktop** (https://www.docker.com/products/docker-desktop)
- **Ollama** (https://ollama.ai)

### Step 1: Clone Repository

```bash
git clone https://github.com/balsem2/ai-interview-coach.git
cd ai-interview-coach
```

### Step 2: Backend Setup (Python FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-extra.txt

# Setup environment variables
copy .env.example .env
# Edit .env with your configuration
```

### Step 3: Database Setup (PostgreSQL)

Option A: Using Docker (Recommended)

```bash
docker run -d \
  --name ai-interview-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_interview_db \
  -p 5434:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

# Wait for database to be ready
docker exec ai-interview-postgres pg_isready -U postgres
```

Option B: Local PostgreSQL Installation

```bash
# Windows: Use PostgreSQL installer
# https://www.postgresql.org/download/windows/

# Linux:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql
```

Initialize database:

```bash
cd backend
./venv/Scripts/alembic.exe upgrade head  # Windows
# OR
source venv/bin/activate && alembic upgrade head  # Linux/macOS
```

### Step 4: Ollama Setup

```bash
# Install Ollama from https://ollama.ai

# In a new terminal, run Ollama daemon
ollama serve

# In another terminal, pull the model
ollama pull llama3.2:1b

# Verify model is loaded
ollama list
```

### Step 5: Frontend Setup (React)

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
copy .env.example .env.local
# Edit .env.local if needed
```

### Step 6: Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
python -m uvicorn main:app --port 8001 --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 3 - Ollama** (if not running as service):

```bash
ollama serve
```

### Step 7: Access Application

Open your browser:

```
http://localhost:5173  # Frontend (Vite default port)
http://localhost:8001  # Backend API
```

**First Time:**

1. Register a new account
2. Click "Dashboard"
3. Start an interview

---

## Docker Compose Deployment

### Prerequisites

- Docker Desktop installed and running
- 4+ GB RAM available
- 5+ GB disk space

### Quick Start

```powershell
# From project root
.\setup-env.ps1

# Build and start all services
docker compose up --build

# In another terminal, load the model
docker compose exec ollama ollama pull llama3.2:1b

# Import interview questions
docker compose exec backend python scripts/import_questions.py
```

### Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | User interface |
| Backend API | http://localhost:8001 | REST API |
| PostgreSQL | localhost:5434 | Database |
| Ollama API | http://localhost:11434 | LLM inference |

### Service Monitoring

```bash
# View all containers
docker compose ps

# View logs
docker compose logs -f backend      # Backend logs
docker compose logs -f frontend     # Frontend logs
docker compose logs -f ollama       # Ollama logs
docker compose logs -f postgres     # Database logs

# Stop services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### Environment Variables

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_interview_db
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:1b
APP_ENV=development
AI_PROVIDER=ollama
DATASET_PATH=/app/data/Mock_interview_questions.json
JWT_SECRET_KEY=your-secret-key-here-min-32-chars
```

### Common Issues

**Issue: "Port 5434 already in use"**

```bash
# Find process using port
netstat -ano | findstr :5434  # Windows
lsof -i :5434                 # Linux/macOS

# Change port in docker-compose.yml:
# Change: "5434:5432"
# To:     "5435:5432"
```

**Issue: "Ollama model not found"**

```bash
# Check what's loaded
docker compose exec ollama ollama list

# Pull the model
docker compose exec ollama ollama pull llama3.2:1b

# Wait for it to complete (1-5 minutes depending on internet)
```

**Issue: "Backend crashes immediately"**

```bash
# Check logs
docker compose logs backend

# Common causes:
# 1. Database not ready - wait 10 seconds
# 2. Invalid .env file - check format
# 3. Port 8001 already in use - change in docker-compose.yml
```

---

## Kubernetes (K3s) Production Deployment

### Prerequisites

- **Ubuntu 20.04+ VM** with root/sudo access
- **2+ vCPU, 4+ GB RAM, 20+ GB disk**
- **Static IP address** (for persistence)
- **SSH access** from your machine
- **Ansible installed** locally (WSL2 on Windows)

### Step 1: Infrastructure Setup

#### 1a. Create Ubuntu VM

**On Hyper-V:**

```powershell
# Windows PowerShell (Admin)
$vm_name = "k3s-server"
$vm_mem = 4GB
$vm_cpu = 2

New-VM -Name $vm_name -MemoryStartupBytes $vm_mem -ProcessorCount $vm_cpu
Set-VMProcessor -VMName $vm_name -ExposeVirtualizationExtensions $true
Add-VMNetworkAdapter -VMName $vm_name -SwitchName "Default Switch"
Start-VM -Name $vm_name
```

#### 1b. Ubuntu Configuration

```bash
# After Ubuntu installation, update system
sudo apt update && sudo apt upgrade -y

# Enable required kernel modules
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Install Docker (optional, but useful for testing)
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER

# Allow SSH
sudo apt install -y openssh-server openssh-client
sudo systemctl enable ssh
sudo systemctl start ssh

# Get IP address
ip addr show | grep "inet " | grep -v 127.0.0.1
```

### Step 2: Configure Ansible

#### 2a. Setup Ansible (on your local machine)

```bash
# On Windows (WSL2):
sudo apt install -y ansible

# On macOS:
brew install ansible

# On Linux:
sudo apt install -y ansible
```

#### 2b. Configure SSH Access

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# Copy public key to VM
ssh-copy-id -i ~/.ssh/id_rsa ubuntu@192.168.1.100  # Replace with your VM IP

# Test SSH
ssh ubuntu@192.168.1.100 "echo 'SSH working!'"
```

#### 2c. Update Ansible Inventory

Edit `ansible/inventory.ini`:

```ini
[k3s_servers]
k3s_server ansible_host=192.168.1.100 ansible_user=ubuntu ansible_become=yes

[k3s_servers:vars]
ansible_python_interpreter=/usr/bin/python3
kubernetes_version=latest
```

### Step 3: Deploy K3s with Ansible

```bash
# From project root

# 1. Setup server and install K3s
ansible-playbook -i ansible/inventory.ini ansible/playbooks/01-setup-server.yml -k -K

# 2. Create secrets
ansible-playbook -i ansible/inventory.ini ansible/playbooks/02-create-secrets.yml -k -K

# 3. Install K3s
ansible-playbook -i ansible/inventory.ini ansible/playbooks/02-install-k3s.yml -k -K

# 4. Deploy application
ansible-playbook -i ansible/inventory.ini ansible/playbooks/03-deploy-app.yml -k -K

# 5. Setup monitoring (Prometheus/Grafana)
ansible-playbook -i ansible/inventory.ini ansible/playbooks/04-install-monitoring.yml -k -K
```

### Step 4: Verify Deployment

```bash
# SSH into VM
ssh ubuntu@192.168.1.100

# Check K3s status
sudo kubectl cluster-info
sudo kubectl get nodes
sudo kubectl get pods -n ai-interview

# Check services
sudo kubectl get svc -n ai-interview

# Port forward to access services
sudo kubectl port-forward -n ai-interview svc/frontend 8080:80 &
sudo kubectl port-forward -n ai-interview svc/backend 8001:8001 &
```

### Step 5: Configure DNS & Access

**Option A: Local Network Access**

```bash
# On your local machine, add to /etc/hosts (Linux/macOS) or 
# C:\Windows\System32\drivers\etc\hosts (Windows):
192.168.1.100 ai-interview.local
```

**Option B: Public Domain (Production)**

- Update your DNS A record to point to your public IP
- Use cert-manager for automatic TLS certificates

### Step 6: Monitoring Setup

Access Grafana:

```bash
# Get Grafana password
sudo kubectl get secret -n monitoring monitoring-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d; echo

# Access via:
# http://192.168.1.100:30300
# Username: admin
# Password: (from above command)
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Error

```
Error: could not translate host name "postgres" to address
```

**Solution:**

```bash
# Check if postgres pod is running
kubectl get pods -n ai-interview | grep postgres

# Check postgres logs
kubectl logs -n ai-interview deployment/postgres

# Restart deployment
kubectl rollout restart deployment/postgres -n ai-interview
```

#### 2. Ollama Timeout

```
Error: Ollama took too long to respond
```

**Solution:**

```bash
# Check Ollama status
kubectl logs -n ai-interview deployment/ollama

# Increase timeout in backend/main.py:
OLLAMA_TIMEOUT = 120  # seconds

# Or use a smaller model:
OLLAMA_MODEL = llama2:7b-chat  # or smaller
```

#### 3. Frontend Can't Connect to Backend

```
Error: Failed to fetch http://localhost:8001
```

**Solution:**

```bash
# Check backend service is accessible
kubectl get svc -n ai-interview backend

# Port forward if needed
kubectl port-forward -n ai-interview svc/backend 8001:8001

# Check backend logs
kubectl logs -n ai-interview deployment/backend
```

#### 4. Out of Disk Space

```
Error: No space left on device
```

**Solution:**

```bash
# Check disk usage
df -h

# Clean Docker images
docker system prune -a

# Clean Ollama cache
docker exec ollama rm -rf /root/.ollama/tmp/*
```

#### 5. Memory Issues

```
Error: OOMKilled
```

**Solution:**

```bash
# Increase pod memory limits in k8s/02-backend.yml
resources:
  limits:
    memory: "1Gi"  # Increase from 512Mi

# Restart deployment
kubectl rollout restart deployment/backend -n ai-interview
```

### Debug Commands

```bash
# General cluster health
kubectl get nodes
kubectl get pods -n ai-interview
kubectl get events -n ai-interview --sort-by='.lastTimestamp'

# Service connectivity
kubectl get svc -n ai-interview
kubectl describe svc backend -n ai-interview

# Pod inspection
kubectl describe pod <pod-name> -n ai-interview
kubectl logs <pod-name> -n ai-interview --tail=100
kubectl exec -it <pod-name> -n ai-interview -- /bin/bash

# Network debugging
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
# Inside container:
# nslookup backend.ai-interview.svc.cluster.local
# wget -O- http://backend:8001/health
```

---

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_interview_session_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_answer_session_id ON interview_answers(interview_session_id);
CREATE INDEX idx_question_category ON questions(category);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM interview_sessions WHERE user_id = 1;
```

### Ollama Optimization

```yaml
# In k8s/03-ollama.yml, increase resources:
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"

# Set environment variables:
env:
  - name: OLLAMA_KEEP_ALIVE
    value: "30m"  # Keep model in memory for 30 minutes
  - name: OLLAMA_NUM_THREAD
    value: "4"    # Use 4 CPU threads
```

### Frontend Optimization

```javascript
// In vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mediapipe': ['@mediapipe/tasks-vision'],
          'vendor': ['react', 'react-dom'],
        }
      }
    }
  }
}

// Reduce MediaPipe frame rate
const FRAME_RATE = 15;  // 15 FPS instead of 30
```

### Network Optimization

```yaml
# Enable caching headers in nginx (frontend Dockerfile)
location / {
  expires 1h;
  add_header Cache-Control "public, must-revalidate";
}

# Compress responses
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
```

---

## Support & Documentation

- **Deployment Issues?** Check the README.md
- **Container Problems?** See DOCKER.md
- **Kubernetes Questions?** Review k8s/ directory
- **Monitoring Help?** Check monitoring/README.md

For more details, visit: https://github.com/balsem2/ai-interview-coach
