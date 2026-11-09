import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-react';

interface CoverCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function CoverCropModal({ imageSrc, onConfirm, onCancel }: CoverCropModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef(1);

  // Standard 2:3 book aspect ratio preview box
  const CROP_WIDTH = 220;
  const CROP_HEIGHT = 330;

  // Load natural image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
    imgRef.current = img;
  }, [imageSrc]);

  // Compute base scaling so image covers the crop area
  const isRotated90 = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotated90 ? naturalSize.height : naturalSize.width;
  const effectiveHeight = isRotated90 ? naturalSize.width : naturalSize.height;

  const baseScale = effectiveWidth > 0 && effectiveHeight > 0
    ? Math.max(CROP_WIDTH / effectiveWidth, CROP_HEIGHT / effectiveHeight)
    : 1;

  const currentScale = baseScale * zoom;

  // Drag handlers (Mouse & Touch)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDistRef.current;
      const newZoom = Math.min(Math.max(initialZoomRef.current * factor, 0.8), 4);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.8), 4));
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  // Reset positioning and zoom
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Export cropped image to 600x900 JPEG
  const handleConfirm = () => {
    if (!imgRef.current) return;

    const OUTPUT_WIDTH = 600;
    const OUTPUT_HEIGHT = 900;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Ratio between output canvas and preview crop area
    const canvasScale = OUTPUT_WIDTH / CROP_WIDTH;

    ctx.save();
    // Move to center of output canvas
    ctx.translate(OUTPUT_WIDTH / 2, OUTPUT_HEIGHT / 2);
    // Apply user panning scaled to output size
    ctx.translate(offset.x * canvasScale, offset.y * canvasScale);
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Scaled dimensions of natural image
    const drawWidth = naturalSize.width * baseScale * zoom * canvasScale;
    const drawHeight = naturalSize.height * baseScale * zoom * canvasScale;

    // Draw centered
    ctx.drawImage(imgRef.current, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    try {
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.84);
      onConfirm(croppedBase64);
    } catch (err) {
      console.error('Failed to export canvas:', err);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-100 flex items-center gap-2">
              <Move size={18} className="text-indigo-400" />
              调整封面裁剪区域
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              拖动图片移动位置，滑动缩放或旋转以选取最佳封面
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 min-h-[360px] p-4 flex flex-col items-center justify-center bg-gray-950 overflow-hidden select-none relative">
          {imageLoaded ? (
            <div
              className="relative cursor-grab active:cursor-grabbing border-2 border-indigo-500 rounded-lg shadow-2xl overflow-hidden bg-black touch-none"
              style={{ width: `${CROP_WIDTH}px`, height: `${CROP_HEIGHT}px` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {/* Image transform wrapper */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px)`
                }}
              >
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="max-w-none origin-center"
                  style={{
                    width: `${naturalSize.width * currentScale}px`,
                    height: `${naturalSize.height * currentScale}px`,
                    transform: `rotate(${rotation}deg)`
                  }}
                />
              </div>

              {/* 3x3 Grid Overlay (Rule of thirds) */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-r border-b border-white/30" />
                <div className="border-b border-white/30" />
                <div className="border-r border-white/30" />
                <div className="border-r border-white/30" />
                <div />
              </div>

              {/* Aspect Ratio Badge */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-gray-200 px-1.5 py-0.5 rounded font-mono pointer-events-none">
                2 : 3
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">正在载入图片...</div>
          )}
        </div>

        {/* Toolbar & Controls */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col gap-3 shrink-0">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.8))}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0.8"
              max="3.5"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 3.5))}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              title="放大"
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-xs font-mono text-gray-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCw size={14} className="text-indigo-400" />
                旋转 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                居中重置
              </button>
            </div>
            <span className="text-[11px] text-gray-500">双指可捏合缩放</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-98"
            >
              <Check size={16} />
              确定设为封面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
