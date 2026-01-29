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
  Wand2
} from 'lucide-react';

export type Tool = 'select' | 'move' | 'rotate' | 'scale';
export type TransformMode = 'translate' | 'rotate' | 'scale';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
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
  const baseClasses = "relative p-2.5 rounded-xl transition-all flex items-center justify-center";
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

        <Divider />

        {/* View */}
        <ToolButton icon={Home} label="Reset View" onClick={onResetView} />
        <ToolButton icon={ArrowUp} label="Top View" onClick={onTopView} />
        <ToolButton icon={ZoomIn} label="Zoom In" onClick={onZoomIn} />
        <ToolButton icon={ZoomOut} label="Zoom Out" onClick={onZoomOut} />

        <Divider />

        {/* Display */}
        <ToolButton icon={Grid3X3} label="Grid" active={showGrid} onClick={onToggleGrid} />

        <Divider />

        {/* Export */}
        <ToolButton icon={Download} label="Export" onClick={onExport} />
      </div>
    </div>
  );
}
