# How to Run the Setup Script

## Windows PowerShell

### Method 1: Run from PowerShell (Recommended)

1. Open PowerShell (as Administrator if needed)
2. Navigate to the backend directory:
   ```powershell
   cd C:\Users\tayaw\Desktop\effycionv2\backend
   ```
3. Run the script:
   ```powershell
   .\scripts\setup-env-and-seed.ps1
   ```

### Method 2: If you get an execution policy error

If you see an error like:
```
cannot be loaded because running scripts is disabled on this system
```

Run this command first to allow script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the script again:
```powershell
.\scripts\setup-env-and-seed.ps1
```

### Method 3: Run with bypass (one-time)

If you don't want to change the execution policy permanently:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-env-and-seed.ps1
```

## Quick Start

1. Open PowerShell
2. Navigate to backend folder:
   ```powershell
   cd backend
   ```
3. Run:
   ```powershell
   .\scripts\setup-env-and-seed.ps1
   ```

The script will:
- Ask for your Supabase credentials
- Ask for admin passwords
- Create `.env` and `.env.staging` files
- Seed the admin user

## Troubleshooting

### "File cannot be loaded" error
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Or use Method 3 above

### "Script not found" error
- Make sure you're in the `backend` directory
- Check that the file exists: `ls scripts\setup-env-and-seed.ps1`

