# Debugging Status - 2026-01-10

## ALL RESOLVED

- **Expense Submission**: Fixed with `docker restart traefik`
- **Mattermost DM**: Working
- **Email**: Wrong password (known issue)

---

## Previous Problem (RESOLVED)
Expense form submission failed with "Failed to submit expense". POST to `/api/expenses/` returned 405 from nginx (frontend) instead of being routed to the backend.

Cause was Traefik needed a restart to pick up the new container IPs after redeployment.

## Other Fixed Issues Today
1. **hsg-bot import error** - Changed relative import to absolute in `hsg-bot/commands/expenses.py` (pushed to main)
2. **Ventoy insecure package** - Updated `ventoy-1.1.07` to `ventoy-1.1.10` in `flake.nix`
3. **azure-cli** - Added to nixtop packages in `nixos-config/machines/nixtop/config.nix`
