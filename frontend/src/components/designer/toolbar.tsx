'use client';

import { 
  Plus, 
  Package, 
  MousePointer, 
  Move, 
  RotateCcw, 
  Maximize, 
  Grid3X3,
  Download,
  ZoomIn,
  ZoomOut,
  Home,
  ArrowUp,
  Wand2,
  Cable,
  Ruler,
  Zap,
  FileBox
} from 'lucide-react';

export type Tool = 'select' | 'move' | 'rotate' | 'scale';
export type TransformMode = 'translate' | 'rotate' | 'scale';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  showDistanceX: boolean;
  onToggleDistanceX: () => void;
  showDistanceZ: boolean;
  onToggleDistanceZ: () => void;
  onOpenLibrary: () => void;
  onExport: () => void;
  onResetView: () => void;
  onTopView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  objectCount: number;
  onSmartAlignment?: () => void;
  smartAlignmentActive?: boolean;
  alignmentSuggestions?: number;
  onCableRouting?: () => void;
  cableRoutingActive?: boolean;
  lowQuality?: boolean;
  onToggleLowQuality?: () => void;
  onExportStep?: () => void;
}

function ToolButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  disabled,
  badge,
  variant = 'default'
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  active?: boolean; 
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
  variant?: 'default' | 'primary' | 'accent';
}) {
  const baseClasses = "relative p-2.5 rounded-full transition-all flex items-center justify-center";
  const variantClasses = {
    default: active 
      ? "bg-hearst-green text-slate-900 shadow-sm" 
      : "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
    primary: "bg-hearst-green hover:bg-hearst-green/80 text-slate-900 shadow-sm",
    accent: "bg-purple-500 hover:bg-purple-600 text-white shadow-sm"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={label}
    >
      <Icon className="w-5 h-5" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-slate-200 mx-1" />;
}

export default function Toolbar({
  activeTool,
  onToolChange,
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
  showDistanceX,
  onToggleDistanceX,
  showDistanceZ,
  onToggleDistanceZ,
  onOpenLibrary,
  onExport,
  onResetView,
  onTopView,
  onZoomIn,
  onZoomOut,
  objectCount,
  onSmartAlignment,
  smartAlignmentActive,
  alignmentSuggestions,
  onCableRouting,
  cableRoutingActive,
  lowQuality,
  onToggleLowQuality,
  onExportStep,
}: ToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-1 bg-white rounded-2xl p-2 shadow-xl border border-slate-200">
        {/* Add Object - Primary Action */}
        <ToolButton 
          icon={Plus} 
          label="Add Object (A)" 
          onClick={onOpenLibrary}
          variant="primary"
        />
        
        <ToolButton 
          icon={Package} 
          label="Library (L)" 
          onClick={onOpenLibrary}
          badge={objectCount}
        />

        <Divider />

        {/* Transform Tools */}
        <ToolButton icon={MousePointer} label="Select (V)" active={activeTool === 'select'} onClick={() => onToolChange('select')} />
        <ToolButton icon={Move} label="Move (G)" active={activeTool === 'move'} onClick={() => onToolChange('move')} />
        <ToolButton icon={RotateCcw} label="Rotate (R)" active={activeTool === 'rotate'} onClick={() => onToolChange('rotate')} />
        <ToolButton icon={Maximize} label="Scale" active={activeTool === 'scale'} onClick={() => onToolChange('scale')} />

        <Divider />

        {/* Smart Alignment */}
        {onSmartAlignment && (
          <ToolButton 
            icon={Wand2} 
            label="Smart Alignment" 
            active={smartAlignmentActive}
            onClick={onSmartAlignment}
            variant={alignmentSuggestions && alignmentSuggestions > 0 ? 'accent' : 'default'}
            badge={alignmentSuggestions}
          />
        )}
        
        {/* Cable Routing Tool */}
        {onCableRouting && (
          <ToolButton 
            icon={Cable} 
            label="Câblage Intelligent (C)" 
            active={cableRoutingActive}
            onClick={onCableRouting}
            variant={cableRoutingActive ? 'accent' : 'default'}
          />
        )}

        <Divider />

        {/* View */}
        <ToolButton icon={Home} label="Reset View" onClick={onResetView} />
        <ToolButton icon={ArrowUp} label="Top View" onClick={onTopView} />
        <ToolButton icon={ZoomIn} label="Zoom In" onClick={onZoomIn} />
        <ToolButton icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} />

        <Divider />

        {/* Display */}
        <ToolButton icon={Grid3X3} label="Grid" active={showGrid} onClick={onToggleGrid} />
        <ToolButton icon={Ruler} label="Axes" active={showAxes} onClick={onToggleAxes} />
        
        {/* Distance measurements by axis */}
        <button
          onClick={onToggleDistanceX}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold transition-all ${
            showDistanceX 
              ? 'bg-red-500 text-white shadow-md' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title="Distances X (rouge)"
        >
          <span className="text-[10px]">📏</span> X
        </button>
        <button
          onClick={onToggleDistanceZ}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold transition-all ${
            showDistanceZ 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title="Distances Z (bleu)"
        >
          <span className="text-[10px]">📏</span> Z
        </button>
        
        {/* Low Quality Mode for Performance */}
        {onToggleLowQuality && (
          <button
            onClick={onToggleLowQuality}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold transition-all ${
              lowQuality 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Low Quality Mode (Performance)"
          >
            <Zap className="w-3.5 h-3.5" /> LQ
          </button>
        )}

        <Divider />

        {/* Export */}
        <ToolButton icon={Download} label="Export JSON" onClick={onExport} />
        {onExportStep && (
          <button
            onClick={onExportStep}
            className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            title="Export STEP (CAD Format)"
          >
            <FileBox className="w-3.5 h-3.5" /> STEP
          </button>
        )}
      </div>
    </div>
  );
}
