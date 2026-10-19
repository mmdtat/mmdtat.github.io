import os
import glob
import shutil
import subprocess

def find_git_exe():
    """Finds the git executable on the system, with automatic detection for GitHub Desktop."""
    git_in_path = shutil.which("git")
    if git_in_path:
        return git_in_path

    # Check GitHub Desktop installations (picks latest version)
    gh_pattern = os.path.expandvars(r"%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe")
    gh_matches = sorted(glob.glob(gh_pattern), reverse=True)
    if gh_matches and os.path.isfile(gh_matches[0]):
        return gh_matches[0]

    # Check standard Git for Windows locations
    standard_paths = [
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files\Git\bin\git.exe",
        r"C:\Program Files (x86)\Git\cmd\git.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Git\cmd\git.exe")
    ]
    for p in standard_paths:
        if os.path.isfile(p):
            return p

    return None

def get_git_status(repo_path):
    git_exe = find_git_exe()
    if not git_exe:
        return {"ok": False, "error": "git_not_found"}
    if not os.path.isdir(repo_path):
        return {"ok": False, "error": f"Repo folder not found: {repo_path}"}

    try:
        res = subprocess.run(
            [git_exe, "status", "--short"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        return {
            "ok": True,
            "has_changes": bool(res.stdout.strip()),
            "status_output": res.stdout.strip()
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

def get_windows_github_token():
    """Reads cached GitHub OAuth token from Windows Credential Manager if present."""
    try:
        import ctypes
        from ctypes import wintypes
        class CREDENTIAL(ctypes.Structure):
            _fields_ = [
                ('Flags', wintypes.DWORD),
                ('Type', wintypes.DWORD),
                ('TargetName', wintypes.LPWSTR),
                ('Comment', wintypes.LPWSTR),
                ('LastWritten', wintypes.FILETIME),
                ('CredentialBlobSize', wintypes.DWORD),
                ('CredentialBlob', ctypes.POINTER(ctypes.c_byte)),
                ('Persist', wintypes.DWORD),
                ('AttributeCount', wintypes.DWORD),
                ('Attributes', ctypes.c_void_p),
                ('TargetAlias', wintypes.LPWSTR),
                ('UserName', wintypes.LPWSTR),
            ]
        CredRead = ctypes.windll.advapi32.CredReadW
        CredRead.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(ctypes.POINTER(CREDENTIAL))]
        CredRead.restype = wintypes.BOOL
        pcred = ctypes.POINTER(CREDENTIAL)()
        if CredRead('GitHub - https://api.github.com/mmdtat', 1, 0, ctypes.byref(pcred)):
            return bytes(pcred.contents.CredentialBlob[:pcred.contents.CredentialBlobSize]).decode('utf-8', errors='ignore').strip()
    except Exception:
        pass
    return None

def commit_and_push(repo_path, commit_message="Update site content from MMDT Admin"):
    git_exe = find_git_exe()
    if not git_exe:
        return {"ok": False, "error": "git_not_found"}

    if not os.path.isdir(repo_path):
        return {"ok": False, "error": f"Repo folder not found: {repo_path}"}

    try:
        # 1. git add -A
        add_res = subprocess.run(
            [git_exe, "add", "-A"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        if add_res.returncode != 0:
            return {"ok": False, "error": f"git add error: {add_res.stderr}"}

        # 2. Check if there are changes staged
        status_res = subprocess.run(
            [git_exe, "status", "--short"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        if not status_res.stdout.strip():
            return {
                "ok": True,
                "already_up_to_date": True,
                "message": "Нет новых изменений для коммита. Репозиторий уже актуален!"
            }

        # 3. git commit
        commit_res = subprocess.run(
            [git_exe, "commit", "-m", commit_message],
            cwd=repo_path,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        if commit_res.returncode != 0:
            return {"ok": False, "error": f"git commit error: {commit_res.stderr}"}

        # 4. git push with token if available to avoid hanging credentials prompts
        token = get_windows_github_token()
        remote_dest = f"https://x-access-token:{token}@github.com/mmdtat/mmdtat.github.io.git" if token else "origin"

        push_res = subprocess.run(
            [git_exe, "push", remote_dest, "master"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        if push_res.returncode != 0:
            # Fallback to plain push
            push_res2 = subprocess.run(
                [git_exe, "push", "origin", "master"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                encoding="utf-8"
            )
            if push_res2.returncode != 0:
                return {
                    "ok": False,
                    "error": f"git push error: {push_res2.stderr or push_res.stderr}"
                }

        # Update tracking ref
        subprocess.run([git_exe, "fetch", "origin", "master"], cwd=repo_path, capture_output=True)

        return {
            "ok": True,
            "already_up_to_date": False,
            "commit_output": commit_res.stdout.strip(),
            "message": "Изменения успешно закоммичены и отправлены на GitHub Pages!"
        }

    except Exception as e:
        return {"ok": False, "error": str(e)}
