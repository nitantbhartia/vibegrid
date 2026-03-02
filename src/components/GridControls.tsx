"use client";

interface GridControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export default function GridControls({
  onZoomIn,
  onZoomOut,
  onResetView,
}: GridControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
      <div className="flex items-center bg-gray-800/80 backdrop-blur-sm rounded-lg overflow-hidden">
        <button
          onClick={onZoomIn}
          className="px-2.5 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={onZoomOut}
          className="px-2.5 py-1.5 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
          title="Zoom out"
        >
          -
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={onResetView}
          className="px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
          title="Reset view"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
