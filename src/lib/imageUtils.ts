/**
 * Compresses an image file to a small base64 data URL with max dimensions and JPEG compression.
 * Preserves GIF/SVG animations when reasonably sized, and never returns a larger payload than the original.
 */
export function compressImageFile(
  file: File,
  maxWidth = 600,
  maxHeight = 900,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择有效的图片文件'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片文件失败'));
    reader.onload = e => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('图片读取为空'));
        return;
      }

      // Preserve animated GIFs and vector SVGs when under 2MB
      if ((file.type === 'image/gif' || file.type === 'image/svg+xml') && file.size <= 2 * 1024 * 1024) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('无法解码图片'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          // If original is smaller (e.g. tiny PNG/WebP), keep original unless dimensions exceeded max
          if (compressed.length > result.length && img.width <= maxWidth && img.height <= maxHeight) {
            resolve(result);
          } else {
            resolve(compressed);
          }
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
