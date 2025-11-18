# Deployment Guide

This guide covers the deployment of the ZMCK Time Tracking System on-premise.

## System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended) or Windows Server
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: Minimum 20GB free space
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+

## Pre-Deployment Checklist

- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (ports 80, 443, 5432)
- [ ] SSL certificates prepared (optional but recommended)
- [ ] Backup strategy defined
- [ ] Environment variables configured

## Installation Steps

### 1. Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy the Application

```bash
# Clone or copy the application files
cd /opt/zmck-time-tracking

# Make scripts executable
chmod +x install.sh backup.sh

# Run installation
./install.sh
```

### 3. Configure Environment

Edit `.env` file with production values:

```env
POSTGRES_USER=zmck_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=zmck_timetracking
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
```

### 4. SSL Configuration (Optional)

To enable HTTPS:

1. Place SSL certificates in `nginx/ssl/`
2. Update `nginx/nginx.conf` to use SSL
3. Restart nginx: `docker-compose restart nginx`

## Maintenance

### Starting Services
```bash
docker-compose up -d
```

### Stopping Services
```bash
docker-compose down
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Database Backup
```bash
./backup.sh
```

### Database Restore
```bash
# Extract backup
tar -xzf backups/zmck_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore database
docker-compose exec -T postgres psql -U zmck_user zmck_timetracking < backup.sql

# Restore files
tar -xzf backup_files.tar.gz
```

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d

# Run migrations if needed
docker-compose run --rm backend npm run migrate
```

## Monitoring

### Health Check
```bash
curl http://localhost/health
```

### Database Connection
```bash
docker-compose exec postgres psql -U zmck_user -d zmck_timetracking
```

## Troubleshooting

### Services Not Starting
1. Check logs: `docker-compose logs`
2. Verify Docker is running: `docker ps`
3. Check port conflicts: `netstat -tulpn | grep :80`

### Database Connection Issues
1. Verify PostgreSQL is running: `docker-compose ps postgres`
2. Check database credentials in `.env`
3. Review database logs: `docker-compose logs postgres`

### File Upload Issues
1. Verify upload directory permissions: `ls -la data/uploads`
2. Check disk space: `df -h`
3. Review file size limits in `.env`

## Security Considerations

1. **Change Default Passwords**: Update all default credentials
2. **Firewall**: Restrict access to necessary ports only
3. **SSL/TLS**: Enable HTTPS for production
4. **Regular Backups**: Schedule automated backups
5. **Updates**: Keep Docker and system packages updated
6. **Access Control**: Limit SSH and database access

## Performance Tuning

### Database
- Adjust PostgreSQL connection pool size in `knexfile.ts`
- Monitor query performance
- Consider indexing frequently queried columns

### Application
- Adjust Nginx worker processes
- Monitor memory usage
- Scale containers if needed

## Backup Strategy

Recommended backup schedule:
- **Daily**: Automated database backups
- **Weekly**: Full system backup (database + files)
- **Monthly**: Archive old backups

Set up cron job for automated backups:
```bash
# Add to crontab
0 2 * * * /opt/zmck-time-tracking/backup.sh
```

## Support

For deployment issues, contact the development team.

