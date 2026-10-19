import os
import sys
import json
import shutil
import cgi
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

admin_dir = os.path.dirname(os.path.abspath(__file__))
deploy_root = os.path.dirname(admin_dir)
data_dir = os.path.join(deploy_root, "data")

sys.path.insert(0, admin_dir)
import builder
import uploader
import git_helper

class AdminHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=deploy_root, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Redirect /admin or /admin/ to /admin/index.html
        if path in ("/admin", "/admin/"):
            self.send_response(302)
            self.send_header("Location", "/admin/index.html")
            self.end_headers()
            return

        # API: get data
        if path == "/api/data":
            file_name = query.get("file", [""])[0]
            if not file_name:
                self.send_error(400, "Missing 'file' parameter")
                return
            data = builder.load_json(file_name)
            if data is None:
                self.send_error(404, f"Data file '{file_name}' not found")
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            return

        # API: list all data files
        if path == "/api/data/all":
            all_data = {}
            for fn in ["events", "classes", "news", "settings", "projects", "festivals"]:
                all_data[fn] = builder.load_json(fn)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(all_data, ensure_ascii=False).encode("utf-8"))
            return
        # API: get git status
        if path == "/api/git/status":
            settings = builder.load_json("settings") or {}
            target_repo = settings.get("repo_path", r"D:\Алексей\01_Рабочие_проекты\mmdtat\GitHub\MMDT_AT")
            status_info = git_helper.get_git_status(target_repo)
            status_info["git_exe"] = git_helper.find_git_exe()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(status_info, ensure_ascii=False).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API: save data and rebuild
        if path == "/api/data":
            file_name = query.get("file", [""])[0]
            if not file_name:
                self.send_error(400, "Missing 'file' parameter")
                return

            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length)
            try:
                data = json.loads(raw_body.decode("utf-8"))
            except Exception as e:
                self.send_error(400, f"Invalid JSON: {e}")
                return

            builder.save_json(file_name, data)

            # Automatically rebuild relevant page
            if file_name == "events":
                builder.build_events_page()
            elif file_name == "classes":
                builder.build_classes_page()
            elif file_name == "news":
                builder.build_news_page()
            elif file_name == "projects":
                builder.build_projects_page()
            elif file_name == "festivals":
                builder.build_festivals_page()
            elif file_name == "settings":
                builder.build_index_page()

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "saved": file_name}).encode("utf-8"))
            return

        # API: rebuild all
        if path == "/api/build":
            results = builder.build_all()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "results": results}).encode("utf-8"))
            return

        # API: upload image
        if path == "/api/upload":
            ctype, pdict = cgi.parse_header(self.headers.get('Content-Type', ''))
            if ctype != 'multipart/form-data':
                self.send_error(400, "Must be multipart/form-data")
                return

            # Parse multipart
            pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
            pdict['CONTENT-LENGTH'] = int(self.headers.get('Content-Length', 0))
            fields = cgi.parse_multipart(self.rfile, pdict)

            file_bytes_list = fields.get('file', [])
            if not file_bytes_list:
                self.send_error(400, "No file provided")
                return
            file_bytes = file_bytes_list[0]

            filename_list = fields.get('filename', ['upload.jpg'])
            filename = filename_list[0]
            if isinstance(filename, bytes):
                filename = filename.decode('utf-8', errors='ignore')

            subpath_list = fields.get('subpath', ['pages/events'])
            subpath = subpath_list[0]
            if isinstance(subpath, bytes):
                subpath = subpath.decode('utf-8', errors='ignore')

            is_cover = bool(fields.get('is_cover', [False])[0])

            try:
                res = uploader.optimize_and_save_image(file_bytes, subpath, filename, is_cover)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "image": res}).encode("utf-8"))
            except Exception as e:
                self.send_error(500, f"Error processing image: {e}")
            return

        # API: save generated HTML or text file
        if path == "/api/save-file":
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except Exception as e:
                self.send_error(400, f"Invalid JSON: {e}")
                return

            rel_path = payload.get("path", "").strip().lstrip("/\\")
            content = payload.get("content", "")
            if not rel_path or ".." in rel_path:
                self.send_error(400, "Invalid file path")
                return

            dest = os.path.normpath(os.path.join(deploy_root, rel_path))
            if not dest.startswith(deploy_root):
                self.send_error(400, "Path traversal forbidden")
                return

            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8") as f:
                f.write(content)

            # Mirror to parent workspace root
            workspace_root = os.path.dirname(deploy_root)
            root_dest = os.path.normpath(os.path.join(workspace_root, rel_path))
            if root_dest != dest and root_dest.startswith(workspace_root):
                try:
                    os.makedirs(os.path.dirname(root_dest), exist_ok=True)
                    with open(root_dest, "w", encoding="utf-8") as f:
                        f.write(content)
                except Exception:
                    pass

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "path": rel_path}).encode("utf-8"))
            return

        # API: sync to git repo
        if path == "/api/publish":
            settings = builder.load_json("settings") or {}
            target_repo = settings.get("repo_path", r"D:\Алексей\01_Рабочие_проекты\mmdtat\GitHub\MMDT_AT")

            if not os.path.isdir(target_repo):
                self.send_error(400, f"Target repo path does not exist: {target_repo}")
                return

            # First rebuild all pages
            builder.build_all()

            # Copy files from Deploy to target repo
            copied_files = []
            for root, dirs, files in os.walk(deploy_root):
                dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git", ".idea")]
                for f in files:
                    if f.endswith((".pyc", ".tmp")):
                        continue
                    src_file = os.path.join(root, f)
                    rel = os.path.relpath(src_file, deploy_root)
                    dest_file = os.path.join(target_repo, rel)
                    os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                    shutil.copy2(src_file, dest_file)
                    copied_files.append(rel.replace("\\", "/"))

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "synced_files_count": len(copied_files),
                "target_repo": target_repo
            }).encode("utf-8"))
            return

        # API: sync AND git commit & push in 1 click
        if path == "/api/git/push":
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                body_json = json.loads(raw_body.decode("utf-8")) if raw_body else {}
            except Exception:
                body_json = {}

            commit_msg = body_json.get("message", "").strip() or "Update site content from MMDT Admin"

            settings = builder.load_json("settings") or {}
            target_repo = settings.get("repo_path", r"D:\Алексей\01_Рабочие_проекты\mmdtat\GitHub\MMDT_AT")

            if not os.path.isdir(target_repo):
                self.send_error(400, f"Target repo path does not exist: {target_repo}")
                return

            # 1. Rebuild all pages
            builder.build_all()

            # 2. Copy files to target repo (including admin and data, excluding __pycache__)
            copied_files = []
            for root, dirs, files in os.walk(deploy_root):
                dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git", ".idea")]
                for f in files:
                    if f.endswith((".pyc", ".tmp")):
                        continue
                    src_file = os.path.join(root, f)
                    rel = os.path.relpath(src_file, deploy_root)
                    dest_file = os.path.join(target_repo, rel)
                    os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                    shutil.copy2(src_file, dest_file)
                    copied_files.append(rel.replace("\\", "/"))

            # 3. Run git commit & push
            git_res = git_helper.commit_and_push(target_repo, commit_msg)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": git_res.get("ok", False),
                "synced_files_count": len(copied_files),
                "git_result": git_res
            }, ensure_ascii=False).encode("utf-8"))
            return

        self.send_error(404, "Endpoint not found")

def run(port=5500):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, AdminHandler)
    print(f"MMDT Admin Server running at http://localhost:{port}/admin/")
    print(f"Serving Deploy root: {deploy_root}")
    httpd.serve_forever()

if __name__ == '__main__':
    port = 5500
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run(port)
