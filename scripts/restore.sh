#!/bin/bash
# Script de Restore para AXION Enterprise

if [ -z "$1" ]; then
  echo "Uso: ./restore.sh <nome_do_arquivo_de_backup_db.gz>"
  echo "Exemplo: ./restore.sh db_20260510_120000.gz"
  exit 1
fi

BACKUP_FILE=$1
DB_CONTAINER="axion_mongo"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erro: Arquivo $BACKUP_FILE não encontrado."
  exit 1
fi

echo "Copiando backup para o container..."
docker cp "$BACKUP_FILE" $DB_CONTAINER:/data/db/restore_temp.gz

echo "Restaurando banco de dados (isso sobrescreverá os dados atuais)..."
docker exec $DB_CONTAINER mongorestore --gzip --archive=/data/db/restore_temp.gz --drop

echo "Limpando arquivo temporário..."
docker exec $DB_CONTAINER rm /data/db/restore_temp.gz

echo "✅ Restore do Banco de Dados concluído!"
echo "ATENÇÃO: Se necessário, extraia o arquivo uploads_*.tar.gz manualmente na pasta ./uploads"
