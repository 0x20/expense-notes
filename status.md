# Debugging Status - 2026-01-10

## Problem
Expense form submission fails with "Failed to submit expense". POST to `/api/expenses/` returns 405 from nginx (frontend) instead of being routed to the backend.

## Root Cause (Suspected)
Traefik runs with `network_mode: host` but doesn't know which Docker network IP to use for routing to containers on the `traefik_public` bridge network.

**Note: This worked before.** Something may have changed:
- Traefik restarted/updated?
- Docker network recreated (containers got new IPs)?
- Traefik config modified?

Check on server:
```bash
# When was Traefik last restarted?
docker inspect traefik --format '{{.State.StartedAt}}'

# Check if traefik.yml was recently modified
ls -la /root/apps/traefik/traefik.yml

# Check Traefik logs from startup
docker logs traefik 2>&1 | head -100
```

## Fix Required
Edit `/root/apps/traefik/traefik.yml` on the Azure VM and add `network: traefik_public` to the docker provider:

```yaml
providers:
  file:
    directory: "/dynamic"
    watch: true
  docker:
    exposedByDefault: false
    network: traefik_public    # <-- ADD THIS LINE
```

Then restart Traefik:
```bash
docker restart traefik
```

## Azure VM Access
```bash
ssh azureuser@74.178.90.56
cd ~/apps/expense-notes
```

## Verified Working
- Backend container is running and responds on `http://172.22.0.2:8000/docs`
- Backend is connected to `traefik_public` network
- Traefik labels are correct on the backend container
- hsg-bot `/expenses` command works (generates links)

## Other Fixed Issues Today
1. **hsg-bot import error** - Changed relative import to absolute in `hsg-bot/commands/expenses.py` (pushed to main)
2. **Ventoy insecure package** - Updated `ventoy-1.1.07` to `ventoy-1.1.10` in `flake.nix`
3. **azure-cli** - Added to nixtop packages in `nixos-config/machines/nixtop/config.nix`
