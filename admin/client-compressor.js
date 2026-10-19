// ============================================================
// MMDT Client-Side Image Compressor (Canvas API)
// Compresses heavy photos right in the browser without server
// ============================================================

window.MMDTCompressor = {
    /**
     * Resizes and compresses an image File to JPEG base64 & Blob
     * @param {File} file - Original file from input
     * @param {number} maxDimension - 1920 for galleries, 2200 for hero/cover
     * @param {number} quality - 0.84 default
     * @returns {Promise<{base64: string, blob: Blob, width: number, height: number, sizeBytes: number}>}
     */
    compressImage: function(file, maxDimension = 1920, quality = 0.84) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = function(e) {
                const img = new Image();
                img.onerror = reject;
                img.onload = function() {
                    let w = img.width;
                    let h = img.height;

                    if (Math.max(w, h) > maxDimension) {
                        if (w >= h) {
                            h = Math.round(h * (maxDimension / w));
                            w = maxDimension;
                        } else {
                            w = Math.round(w * (maxDimension / h));
                            h = maxDimension;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');

                    // High quality rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, w, h);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    canvas.toBlob((blob) => {
                        // Extract pure base64 (without data:image/jpeg;base64,)
                        const base64Content = dataUrl.split(',')[1];
                        resolve({
                            dataUrl: dataUrl,
                            base64: base64Content,
                            blob: blob,
                            width: w,
                            height: h,
                            sizeBytes: blob.size
                        });
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
};
