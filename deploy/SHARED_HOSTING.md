# DreamHost Shared Hosting Demo Deploy

This deploy mode serves Fremont Open as a static React site with a cached
Challonge dataset. It does not run FastAPI, login, admin, AI chat, or server
writes. It is intended for the shared-hosting demo path.

## Build locally

From the repo root on your development machine:

```powershell
cd backend
.venv\Scripts\python.exe export_static.py

cd ..\frontend
$env:REACT_APP_STATIC_DATA='true'
$env:COREPACK_HOME='C:\Users\karmi\OneDrive\Documents\fremontopen\.tools\corepack'
..\.tools\node-v24.15.0-win-x64\corepack.cmd yarn build
```

The deployable site is now in:

```text
frontend/build/
```

## Upload to DreamHost shared hosting

Upload the contents of `frontend/build/` into the domain web directory, for
example:

```text
/home/dh_vykniy/fremontopen.com/
```

Make sure hidden files are included. The build contains `.htaccess`, which lets
direct URLs like `/players/Dennis%20Orcollo` load through React Router.

## Refresh data

When you have new Challonge data locally:

```powershell
cd backend
.venv\Scripts\python.exe sync_job.py --force
.venv\Scripts\python.exe export_static.py
```

Then rebuild and upload `frontend/build/` again.
