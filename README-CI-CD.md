# MSPK Apps – CI/CD with Jenkin

## Flow
1. Push to `test`
2. Build + deploy test
3. Auto merge to `main`
4. Deploy production
5. Rollback on failure
6. Email notifications

## Requirements
- Docker
- Docker Compose v2
- Cloudflared Tunnel
- Jenkin (Docker)

## Env Files
Stored at `/opt/envs`

## Reuse
This setup works for ANY Docker app by:
- Adding service to docker-compose.base.yml
- Adding env file
- Updating Jenkinsfile
