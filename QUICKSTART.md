# Quick Start Guide

## The Problem
If you see `zsh: command not found: uvicorn`, it means uvicorn isn't in your PATH. This happens because uvicorn is installed in the virtual environment, not globally.

## Solution

### Option 1: Use the Run Script (Easiest)
```bash
./run.sh
```
This script automatically activates the virtual environment and starts the server.

### Option 2: Manual Activation

1. **Activate the virtual environment first:**
   ```bash
   source .venv/bin/activate
   ```
   You should see `(.venv)` appear in your terminal prompt.

2. **Then run uvicorn:**
   ```bash
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

3. **When you're done, deactivate:**
   ```bash
   deactivate
   ```

## Verify Installation

To check if everything is set up correctly:

```bash
# Activate venv
source .venv/bin/activate

# Check uvicorn is available
which uvicorn
# Should show: /path/to/LookLabs/.venv/bin/uvicorn

# Check version
uvicorn --version
```

## Troubleshooting

**If the virtual environment doesn't exist:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**If dependencies are missing:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Important Notes

- **Always activate the virtual environment** before running uvicorn manually
- The `.venv` folder is already in `.gitignore`, so it won't be committed
- The run script (`./run.sh`) handles activation automatically
