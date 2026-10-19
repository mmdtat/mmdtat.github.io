import os
import io
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None

deploy_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img_root = os.path.join(deploy_root, "img")

def optimize_and_save_image(file_bytes, target_subpath, filename, is_cover=False):
    """
    Saves and compresses an image to Deploy/img/{target_subpath}/{filename}.
    Returns the relative path from Deploy root ('img/...') and from pages ('../img/...').
    """
    dest_dir = os.path.join(img_root, target_subpath)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, filename)

    base, ext = os.path.splitext(filename)
    ext_lower = ext.lower()

    with Image.open(io.BytesIO(file_bytes)) as im:
        im = ImageOps.exif_transpose(im)

        max_dim = 2200 if is_cover else 1920
        w, h = im.size
        if max(w, h) > max_dim:
            if w >= h:
                new_w = max_dim
                new_h = int(round(h * (max_dim / w)))
            else:
                new_h = max_dim
                new_w = int(round(w * (max_dim / h)))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        if ext_lower in (".jpg", ".jpeg", ".jfif"):
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGB")
            elif im.mode != "RGB":
                im = im.convert("RGB")
            im.save(dest_path, format="JPEG", quality=84, optimize=True, progressive=True)

        elif ext_lower == ".png":
            im.save(dest_path, format="PNG", optimize=True)

        elif ext_lower == ".webp":
            im.save(dest_path, format="WEBP", quality=85)

        elif ext_lower == ".gif":
            # Keep GIF animations as-is or save first frame
            with open(dest_path, "wb") as f:
                f.write(file_bytes)
        else:
            # Fallback
            with open(dest_path, "wb") as f:
                f.write(file_bytes)

    rel_root = f"img/{target_subpath}/{filename}".replace("\\", "/").replace("//", "/")
    rel_pages = f"../img/{target_subpath}/{filename}".replace("\\", "/").replace("//", "/")

    # Mirror to parent workspace root
    workspace_root = os.path.dirname(deploy_root)
    if workspace_root and os.path.isdir(workspace_root) and workspace_root != deploy_root:
        try:
            ws_dest_dir = os.path.join(workspace_root, "img", target_subpath)
            os.makedirs(ws_dest_dir, exist_ok=True)
            import shutil
            shutil.copy2(dest_path, os.path.join(ws_dest_dir, filename))
        except Exception:
            pass

    # Mirror to target git repo if present
    target_git_repo = r"D:\Алексей\01_Рабочие_проекты\mmdtat\GitHub\MMDT_AT"
    if os.path.isdir(target_git_repo):
        try:
            git_dest_dir = os.path.join(target_git_repo, "img", target_subpath)
            os.makedirs(git_dest_dir, exist_ok=True)
            import shutil
            shutil.copy2(dest_path, os.path.join(git_dest_dir, filename))
        except Exception:
            pass

    return {
        "rel_root": rel_root,
        "rel_pages": rel_pages,
        "file_size": os.path.getsize(dest_path)
    }
