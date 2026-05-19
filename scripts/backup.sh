#!/bin/bash
# Script de Backup Automatizado para AXION Enterprise
# Executa dump do MongoDB, faz o tar dos uploads e gerencia rotação.

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="axion_mongo"
DB_NAME="Axion"
MAX_DAILY=7
MAX_WEEKLY=4

mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"

echo "Iniciando processo de backup ($TIMESTAMP)..."

# 0. Verificação de Espaço em Disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "⚠️ ALERTA CRÍTICO: Espaço em disco acima de 90%! ($DISK_USAGE%)"
  # Aqui pode-se adicionar uma chamada curl para o webhook do Discord se necessário.
fi

# 1. Backup do Banco de Dados
echo "Realizando mongodump do container $DB_CONTAINER..."
docker exec $DB_CONTAINER mongodump --db $DB_NAME --archive=/data/db/axion_dump.gz --gzip
docker cp $DB_CONTAINER:/data/db/axion_dump.gz "$BACKUP_DIR/daily/db_$TIMESTAMP.gz"

# 2. Backup dos Uploads (Fotos)
echo "Compactando pasta de uploads..."
tar -czf "$BACKUP_DIR/daily/uploads_$TIMESTAMP.tar.gz" "./uploads" 2>/dev/null

# Opcional: Criptografia GPG (Descomente se tiver chave configurada)
# gpg --encrypt --recipient "admin@axion.com" "$BACKUP_DIR/daily/db_$TIMESTAMP.gz"
# gpg --encrypt --recipient "admin@axion.com" "$BACKUP_DIR/daily/uploads_$TIMESTAMP.tar.gz"

# 3. Rotação (Deletar diários antigos)
echo "Rotacionando backups diários (mantendo últimos $MAX_DAILY)..."
ls -tp "$BACKUP_DIR/daily/" | grep -v '/$' | tail -n +$(($MAX_DAILY + 1)) | xargs -I {} rm -- "$BACKUP_DIR/daily/{}" 2>/dev/null

# Promover backup para semanal se for Domingo (dia 0)
DAY_OF_WEEK=$(date +%w)
if [ "$DAY_OF_WEEK" -eq 0 ]; then
  echo "Promovendo backup para semanal..."
  cp "$BACKUP_DIR/daily/db_$TIMESTAMP.gz" "$BACKUP_DIR/weekly/"
  cp "$BACKUP_DIR/daily/uploads_$TIMESTAMP.tar.gz" "$BACKUP_DIR/weekly/"
  
  # Rotação Semanal
  ls -tp "$BACKUP_DIR/weekly/" | grep -v '/$' | tail -n +$(($MAX_WEEKLY + 1)) | xargs -I {} rm -- "$BACKUP_DIR/weekly/{}" 2>/dev/null
fi

echo "✅ Backup finalizado com sucesso em $BACKUP_DIR/daily/"
