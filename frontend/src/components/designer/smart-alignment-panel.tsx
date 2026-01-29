'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Wand2, 
  AlignLeft, 
  AlignCenter, 
  Space, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Target,
  Sparkles,
  X
} from 'lucide-react';
import { 
  analyzeScene, 
  applyAlignment, 
  applyAllAutoAlignments,
  AlignmentSuggestion, 
  SceneObject,
  ELECTRICAL_RULES 
} from '@/lib/smart-alignment';

interface SmartAlignmentPanelProps {
  objects: SceneObject[];
  onUpdateObjects: (objects: SceneObject[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

function SuggestionCard({ 
  suggestion, 
  onApply,
  onPreview,
  isPreview
}: { 
  suggestion: AlignmentSuggestion; 
  onApply: () => void;
  onPreview: () => void;
  isPreview: boolean;
}) {
  const priorityColors = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-amber-300 bg-amber-50',
    low: 'border-blue-300 bg-blue-50',
  };
  
  const priorityIcons = {
    high: <AlertTriangle className="w-4 h-4 text-red-500" />,
    medium: <Zap className="w-4 h-4 text-amber-500" />,
    low: <AlignCenter className="w-4 h-4 text-blue-500" />,
  };
  
  const typeIcons: Record<string, React.ReactNode> = {
    position: <Target className="w-4 h-4" />,
    alignment: <AlignLeft className="w-4 h-4" />,
    spacing: <Space className="w-4 h-4" />,
    connection: <Zap className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
  };

  return (
    <div 
      className={`rounded-xl border-2 p-3 transition-all ${priorityColors[suggestion.priority]} ${isPreview ? 'ring-2 ring-hearst-green scale-[1.02]' : ''}`}
      onMouseEnter={onPreview}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {priorityIcons[suggestion.priority]}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-900 truncate">
            {suggestion.title}
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            {suggestion.description}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-white/60 rounded-full text-[10px] font-medium text-slate-600 flex items-center gap-1">
              {typeIcons[suggestion.type]}
              {suggestion.type}
            </span>
            {suggestion.autoApply && (
              <span className="px-2 py-0.5 bg-hearst-green/20 rounded-full text-[10px] font-medium text-green-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Auto
              </span>
            )}
          </div>
        </div>
        
        {suggestion.suggestedPosition && (
          <button
            onClick={onApply}
            className="p-2 bg-hearst-green hover:bg-hearst-green/80 text-slate-900 rounded-lg transition-colors"
            title="Appliquer"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SmartAlignmentPanel({ 
  objects, 
  onUpdateObjects,
  onClose,
  isOpen
}: SmartAlignmentPanelProps) {
  const [previewSuggestionId, setPreviewSuggestionId] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [showRules, setShowRules] = useState(false);
  
  // Analyser la scène
  const suggestions = useMemo(() => {
    if (!isOpen) return [];
    return analyzeScene(objects);
  }, [objects, isOpen]);
  
  const highPriority = suggestions.filter(s => s.priority === 'high');
  const mediumPriority = suggestions.filter(s => s.priority === 'medium');
  const lowPriority = suggestions.filter(s => s.priority === 'low');
  const autoApplicable = suggestions.filter(s => s.autoApply);
  
  const handleApply = (suggestion: AlignmentSuggestion) => {
    const updated = applyAlignment(objects, suggestion);
    onUpdateObjects(updated);
    setAppliedCount(prev => prev + 1);
  };
  
  const handleApplyAll = () => {
    const updated = applyAllAutoAlignments(objects);
    onUpdateObjects(updated);
    setAppliedCount(prev => prev + autoApplicable.length);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 max-h-[80vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500 rounded-lg">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Smart Alignment</h3>
            <p className="text-[10px] text-slate-500">{suggestions.length} suggestions</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      
      {/* Quick Actions */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <button
            onClick={handleApplyAll}
            disabled={autoApplicable.length === 0}
            className="flex-1 py-2 px-3 bg-hearst-green hover:bg-hearst-green/80 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Tout aligner ({autoApplicable.length})
          </button>
          
          <button
            onClick={() => setShowRules(!showRules)}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
            title="Voir les règles"
          >
            {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        {appliedCount > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            {appliedCount} alignement(s) appliqué(s)
          </div>
        )}
      </div>
      
      {/* Rules Reference (collapsible) */}
      {showRules && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-xs">
          <h4 className="font-semibold text-slate-700 mb-2">Seuils critiques</h4>
          <div className="space-y-1 text-slate-600">
            <p>• Collision: détection automatique</p>
            <p>• PDU → Container: max {ELECTRICAL_RULES.PDU_TO_CONTAINER_MAX}m</p>
            <p>• TRF → Container: max {ELECTRICAL_RULES.TRANSFORMER_TO_CONTAINER_MAX}m</p>
            <p>• Espacement min: {ELECTRICAL_RULES.CONTAINER_MIN_SPACING}m</p>
            <p>• Allée pompiers: {ELECTRICAL_RULES.FIRE_ACCESS_MIN}m minimum</p>
          </div>
        </div>
      )}
      
      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-hearst-green mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Parfait !</p>
            <p className="text-sm text-slate-500">Tous les objets sont bien alignés</p>
          </div>
        ) : (
          <>
            {/* High Priority */}
            {highPriority.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Critique ({highPriority.length})
                </h4>
                <div className="space-y-2">
                  {highPriority.map(s => (
                    <SuggestionCard 
                      key={s.id} 
                      suggestion={s} 
                      onApply={() => handleApply(s)}
                      onPreview={() => setPreviewSuggestionId(s.id)}
                      isPreview={previewSuggestionId === s.id}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Medium Priority */}
            {mediumPriority.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Recommandé ({mediumPriority.length})
                </h4>
                <div className="space-y-2">
                  {mediumPriority.map(s => (
                    <SuggestionCard 
                      key={s.id} 
                      suggestion={s} 
                      onApply={() => handleApply(s)}
                      onPreview={() => setPreviewSuggestionId(s.id)}
                      isPreview={previewSuggestionId === s.id}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Low Priority */}
            {lowPriority.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlignCenter className="w-3 h-3" />
                  Optimisation ({lowPriority.length})
                </h4>
                <div className="space-y-2">
                  {lowPriority.map(s => (
                    <SuggestionCard 
                      key={s.id} 
                      suggestion={s} 
                      onApply={() => handleApply(s)}
                      onPreview={() => setPreviewSuggestionId(s.id)}
                      isPreview={previewSuggestionId === s.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{objects.length} objets analysés</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {highPriority.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {mediumPriority.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {lowPriority.length}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
