$date = Get-Date -Format "yyyy-MM-dd"
docker exec axion_mongo mongodump --archive="/data/db/backup_$date.gz" --gzip
Write-Host "Backup realizado: backup_$date.gz"
