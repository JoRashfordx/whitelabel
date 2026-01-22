
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Image as ImageIcon, Type as TypeIcon, Smile, Layout, 
  Download, Layers, Trash2, Lock, Unlock, Eye, EyeOff, 
  Move, RotateCw, Wand2, Loader2, Undo2, Redo2,
  ChevronDown, ChevronUp, Maximize, Palette, Crop, Sliders,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Plus, Minus, ChevronsUp, ChevronsDown, Save, FilePlus, FolderOpen,
  Monitor, Smartphone, User as UserIcon, Grid, Square, Circle, Triangle,
  MousePointer2, Hand
} from 'lucide-react';
import { User, ThumbnailLayer, CanvasConfig, FilterState, DesignType, DesignProject } from '../types';
import { supabase } from '../services/supabase';
import { removeBackground } from '../services/photoroom';
import { useToast } from '../contexts/ToastContext';
import Tooltip from './Tooltip';

interface ThumbnailStudioProps {
  user: User;
  onClose: () => void;
  onSave: (url: string) => void;
  initialType?: DesignType;
  relatedId?: string;
  initialProject?: DesignProject | null;
}

const FONTS = [
  { name: 'Impact', family: 'Impact, sans-serif' },
  { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif' },
  { name: 'Bangers', family: '"Bangers", cursive' },
  { name: 'Anton', family: '"Anton", sans-serif' },
  { name: 'Archivo Black', family: '"Archivo Black", sans-serif' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif' },
  { name: 'Roboto', family: '"Roboto", sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif' },
  { name: 'Poppins', family: '"Poppins", sans-serif' },
  { name: 'Oswald', family: '"Oswald", sans-serif' },
  { name: 'Russo One', family: '"Russo One", sans-serif' },
  { name: 'Luckiest Guy', family: '"Luckiest Guy", cursive' },
  { name: 'Permanent Marker', family: '"Permanent Marker", cursive' },
  { name: 'Pacifico', family: '"Pacifico", cursive' },
  { name: 'Lobster', family: '"Lobster", cursive' },
  { name: 'Fredoka', family: '"Fredoka", sans-serif' },
  { name: 'Righteous', family: '"Righteous", cursive' },
  { name: 'Orbitron', family: '"Orbitron", sans-serif' },
  { name: 'Press Start 2P', family: '"Press Start 2P", cursive' },
  { name: 'Creepster', family: '"Creepster", cursive' },
  { name: 'Special Elite', family: '"Special Elite", cursive' },
  { name: 'Monoton', family: '"Monoton", cursive' },
  { name: 'Abril Fatface', family: '"Abril Fatface", cursive' },
  { name: 'Playfair Display', family: '"Playfair Display", serif' },
  { name: 'Merriweather', family: '"Merriweather", serif' },
  { name: 'Cinzel', family: '"Cinzel", serif' },
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Courier', family: 'Courier New, monospace' },
];

const CANVAS_PRESETS: Record<DesignType, { w: number, h: number, label: string }> = {
  thumbnail: { w: 1280, h: 720, label: 'Video Thumbnail' },
  hero: { w: 1920, h: 1080, label: 'Series Hero Banner' },
  series_cover: { w: 1280, h: 1920, label: 'Series Cover' },
  banner: { w: 1500, h: 500, label: 'Profile Banner' },
  avatar: { w: 512, h: 512, label: 'Avatar' },
  post: { w: 1080, h: 1080, label: 'Community Post' }
};

const DEFAULT_FILTERS: FilterState = {
  brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0
};

// Corner handles for resizing
const HANDLE_SIZE = 10;

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({ user, onClose, onSave, initialType = 'thumbnail', relatedId, initialProject }) => {
  const { addToast } = useToast();
  
  // UI State
  const [activeTool, setActiveTool] = useState<'add' | 'layers' | 'edit' | 'project'>('add');
  const [activeDesignType, setActiveDesignType] = useState<DesignType>(initialType);
  const [currentProject, setCurrentProject] = useState<DesignProject | null>(initialProject || null);
  const [projectsList, setProjectsList] = useState<DesignProject[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  
  // Canvas State
  const [layers, setLayers] = useState<ThumbnailLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({ 
    width: CANVAS_PRESETS[initialType].w, 
    height: CANVAS_PRESETS[initialType].h, 
    backgroundColor: '#000000' 
  });
  
  const [zoom, setZoom] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [bgRemovalLoading, setBgRemovalLoading] = useState(false);
  
  // History
  const [history, setHistory] = useState<ThumbnailLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Interaction State
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'scale_tl' | 'scale_tr' | 'scale_bl' | 'scale_br' | 'rotate'>('none');
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [initialLayerState, setInitialLayerState] = useState<ThumbnailLayer | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    // Only set default if no project loaded
    if (!currentProject) {
        const preset = CANVAS_PRESETS[activeDesignType];
        setCanvasConfig(prev => ({ ...prev, width: preset.w, height: preset.h }));
    }
    fetchProjects();
  }, [activeDesignType]);

  useEffect(() => {
      if (initialProject) {
          loadProject(initialProject);
      }
  }, [initialProject]);

  // When selection changes, switch to edit tab if something is selected
  useEffect(() => {
    if (selectedId) {
        setActiveTool('edit');
    } else {
        // If nothing selected, go back to add or layers
        if (activeTool === 'edit') setActiveTool('add');
    }
  }, [selectedId]);

  const fetchProjects = async () => {
    const { data } = await supabase.from('design_projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (data) setProjectsList(data as DesignProject[]);
  };

  // --- FONT AUTO-LOADING ---
  // This ensures fonts are loaded whenever layer properties change (e.g. resizing)
  useEffect(() => {
    let isMounted = true;
    const checkAndLoadFonts = async () => {
      let needsRender = false;
      const textLayers = layers.filter(l => l.type === 'text');
      
      for (const layer of textLayers) {
        if (layer.fontFamily) {
           // Construct the font string exactly as Canvas uses it
           const style = layer.fontStyle || 'normal';
           const weight = layer.fontWeight || 'normal';
           const size = Math.round(layer.fontSize || 80);
           const fontString = `${style} ${weight} ${size}px ${layer.fontFamily}`;
           
           // Check if font is ready. If not, load it.
           if (!document.fonts.check(fontString)) {
               try {
                   await document.fonts.load(fontString);
                   needsRender = true;
               } catch (e) {
                   console.warn(`Failed to load font: ${fontString}`, e);
               }
           }
        }
      }
      
      // If we loaded any new fonts, trigger a redraw
      if (needsRender && isMounted) {
          renderCanvas();
      }
    };

    checkAndLoadFonts();
    return () => { isMounted = false; };
  }, [layers]); // Re-run when layers change

  // --- RENDER ENGINE ---
  // We use a ref to store loaded images to avoid flickering/reloading
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and Fill Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = canvasConfig.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Layers
    layers.forEach(layer => {
      if (!layer.visible) return;

      ctx.save();
      // Transform
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scaleX, layer.scaleY);
      ctx.globalAlpha = layer.opacity;

      if (layer.type === 'image') {
        let img = imageCache.current[layer.content];
        if (!img) {
            img = new Image();
            img.crossOrigin = "anonymous"; // CRITICAL FOR EXPORT
            img.src = layer.content;
            imageCache.current[layer.content] = img;
            // Force re-render when loaded
            img.onload = () => renderCanvas();
        }
        
        if (img.complete) {
            if (layer.filters) {
              const f = layer.filters;
              ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%)`;
            }
            ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
      } 
      else if (layer.type === 'text') {
        // Ensure defaults to prevent invalid font string
        const fontStyle = layer.fontStyle || 'normal';
        const fontWeight = layer.fontWeight || 'normal';
        const fontSize = Math.round(layer.fontSize || 80); // Ensure integer for stability
        const fontFamily = layer.fontFamily || 'Impact, sans-serif';

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = layer.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        if (layer.shadowBlur && layer.shadowBlur > 0) {
          ctx.shadowColor = layer.shadowColor || 'black';
          ctx.shadowBlur = layer.shadowBlur;
          ctx.shadowOffsetX = layer.shadowOffsetX || 0;
          ctx.shadowOffsetY = layer.shadowOffsetY || 0;
        }

        if (layer.strokeWidth && layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor || 'black';
          ctx.lineWidth = layer.strokeWidth;
          ctx.strokeText(layer.content, 0, 0);
        }

        ctx.fillStyle = layer.color || 'white';
        ctx.fillText(layer.content, 0, 0);
      }
      else if (layer.type === 'shape') {
        ctx.fillStyle = layer.color || 'white';
        if (layer.content === 'rect') {
          ctx.fillRect(-layer.width/2, -layer.height/2, layer.width, layer.height);
        } else if (layer.content === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, layer.width/2, 0, Math.PI * 2);
          ctx.fill();
        } else if (layer.content === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -layer.height/2);
            ctx.lineTo(layer.width/2, layer.height/2);
            ctx.lineTo(-layer.width/2, layer.height/2);
            ctx.closePath();
            ctx.fill();
        }
      }

      ctx.restore();
    });

    // Draw Selection Box & Handles (Only if selected)
    if (selectedId) {
      const selected = layers.find(l => l.id === selectedId);
      if (selected && selected.visible) {
        ctx.save();
        ctx.translate(selected.x, selected.y);
        ctx.rotate((selected.rotation * Math.PI) / 180);
        
        const w = selected.width * selected.scaleX;
        const h = selected.height * selected.scaleY;
        
        // Border
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(-w/2, -h/2, w, h);
        
        // Handles
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#ff007f';
        const hs = HANDLE_SIZE / zoom; // Handle size adjusted for zoom

        const drawHandle = (x: number, y: number) => {
          ctx.beginPath();
          ctx.rect(x - hs/2, y - hs/2, hs, hs);
          ctx.fill();
          ctx.stroke();
        };

        drawHandle(-w/2, -h/2); // TL
        drawHandle(w/2, -h/2);  // TR
        drawHandle(-w/2, h/2);  // BL
        drawHandle(w/2, h/2);   // BR
        
        // Rotate Handle (Top Center)
        ctx.beginPath();
        ctx.moveTo(0, -h/2);
        ctx.lineTo(0, -h/2 - (20/zoom));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -h/2 - (20/zoom), hs/1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff007f';
        ctx.fill();

        ctx.restore();
      }
    }

  }, [layers, selectedId, canvasConfig, zoom]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // --- ACTIONS ---

  const addLayer = (layer: Omit<ThumbnailLayer, 'id' | 'visible' | 'locked' | 'filters'>) => {
    const newLayer: ThumbnailLayer = {
      ...layer,
      id: Math.random().toString(36).substr(2, 9),
      visible: true,
      locked: false,
      filters: layer.type === 'image' ? { ...DEFAULT_FILTERS } : undefined
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setSelectedId(newLayer.id);
    pushHistory(newLayers);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        // Fit large images to canvas
        if (w > canvasConfig.width * 0.8) {
          const ratio = (canvasConfig.width * 0.8) / w;
          w *= ratio;
          h *= ratio;
        }
        addLayer({
          type: 'image',
          name: 'Image Layer',
          x: canvasConfig.width / 2,
          y: canvasConfig.height / 2,
          width: w,
          height: h,
          content: ev.target?.result as string,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveBackground = async () => {
    if (!selectedId) return;
    const layer = layers.find(l => l.id === selectedId);
    if (!layer || layer.type !== 'image') return;

    setBgRemovalLoading(true);
    try {
      const processedUrl = await removeBackground(layer.content);
      
      // Update cache
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = processedUrl;
      img.onload = () => {
          imageCache.current[processedUrl] = img;
          setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, content: processedUrl } : l));
          setBgRemovalLoading(false);
          addToast({ type: 'success', message: 'Background removed!' });
      };
    } catch (err: any) {
      addToast({ type: 'error', title: 'AI Error', message: err.message });
      setBgRemovalLoading(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    // 1. Deselect to hide handles
    setSelectedId(null);
    
    // 2. Wait for render cycle to clear handles
    setTimeout(async () => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.toBlob(async (blob) => {
            if (!blob) {
                throw new Error("Canvas is empty");
            }
            const fileName = `${user.id}/exports/${activeDesignType}_${Date.now()}.png`;
            
            // 3. Upload to Supabase
            const { error: uploadError } = await supabase.storage.from('design-exports').upload(fileName, blob);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('design-exports').getPublicUrl(fileName);
            
            // 4. Save Project State
            await saveProject(true);

            onSave(data.publicUrl);
            addToast({ type: 'success', message: 'Design exported successfully!' });
            onClose();
          }, 'image/png');
        } catch (err: any) {
          console.error(err);
          addToast({ type: 'error', message: 'Export failed. Check console.' });
          setIsProcessing(false);
        }
      }
    }, 200); // 200ms delay to ensure canvas clears handles
  };

  // --- CANVAS INTERACTIONS (DRAG, RESIZE) ---

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Check if point is inside a rotated rectangle
  const isPointInLayer = (px: number, py: number, layer: ThumbnailLayer) => {
      // Translate point back to origin relative to layer center
      const dx = px - layer.x;
      const dy = py - layer.y;
      
      // Rotate point backwards
      const angle = -layer.rotation * (Math.PI / 180);
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

      const w = layer.width * layer.scaleX;
      const h = layer.height * layer.scaleY;

      return Math.abs(rx) < w / 2 && Math.abs(ry) < h / 2;
  };

  // Hit detection for handles
  const getHitHandle = (px: number, py: number, layer: ThumbnailLayer) => {
      const dx = px - layer.x;
      const dy = py - layer.y;
      const angle = -layer.rotation * (Math.PI / 180);
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);

      const w = layer.width * layer.scaleX;
      const h = layer.height * layer.scaleY;
      const hs = (HANDLE_SIZE / zoom) * 1.5; // Hit area slightly larger

      // Top Left
      if (Math.abs(rx - (-w/2)) < hs && Math.abs(ry - (-h/2)) < hs) return 'scale_tl';
      // Top Right
      if (Math.abs(rx - (w/2)) < hs && Math.abs(ry - (-h/2)) < hs) return 'scale_tr';
      // Bottom Left
      if (Math.abs(rx - (-w/2)) < hs && Math.abs(ry - (h/2)) < hs) return 'scale_bl';
      // Bottom Right
      if (Math.abs(rx - (w/2)) < hs && Math.abs(ry - (h/2)) < hs) return 'scale_br';
      // Rotate (Top Center extended)
      if (Math.abs(rx) < hs && Math.abs(ry - (-h/2 - 20/zoom)) < hs) return 'rotate';

      return null;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    
    // 1. Check handles of currently selected layer first
    if (selectedId) {
        const layer = layers.find(l => l.id === selectedId);
        if (layer) {
            const handle = getHitHandle(coords.x, coords.y, layer);
            if (handle) {
                setDragMode(handle as any);
                setDragStart(coords);
                setInitialLayerState({ ...layer });
                return;
            }
        }
    }

    // 2. Check Layer Hit (Reverse order for z-index)
    for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        if (!l.visible || l.locked) continue;
        
        if (isPointInLayer(coords.x, coords.y, l)) {
            setSelectedId(l.id);
            setDragMode('move');
            setDragStart(coords);
            setInitialLayerState({ ...l });
            return;
        }
    }

    // 3. Clicked empty space
    setSelectedId(null);
    setDragMode('none');
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart || !selectedId || dragMode === 'none' || !initialLayerState) return;
    
    const coords = getCanvasCoords(e);
    const layer = layers.find(l => l.id === selectedId);
    if (!layer) return;

    // Calculate delta from start
    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (dragMode === 'move') {
        const newLayer = { ...layer, x: initialLayerState.x + dx, y: initialLayerState.y + dy };
        setLayers(prev => prev.map(l => l.id === selectedId ? newLayer : l));
    } 
    else if (dragMode === 'rotate') {
        // Calculate angle between center and mouse
        const cx = layer.x;
        const cy = layer.y;
        const angle = Math.atan2(coords.y - cy, coords.x - cx) * (180 / Math.PI);
        // Offset by -90 deg because handle is at top
        const newRotation = angle + 90;
        setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, rotation: newRotation } : l));
    }
    else if (dragMode.startsWith('scale')) {
        // Simple scaling based on distance from center
        // This avoids complex matrix math for rotated scaling in this simplified version
        const initialDist = Math.sqrt(Math.pow(dragStart.x - initialLayerState.x, 2) + Math.pow(dragStart.y - initialLayerState.y, 2));
        const currentDist = Math.sqrt(Math.pow(coords.x - initialLayerState.x, 2) + Math.pow(coords.y - initialLayerState.y, 2));
        
        const scaleFactor = currentDist / initialDist;
        
        const newScaleX = initialLayerState.scaleX * scaleFactor;
        const newScaleY = initialLayerState.scaleY * scaleFactor;

        setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, scaleX: newScaleX, scaleY: newScaleY } : l));
    }
  };

  const handleMouseUp = () => {
    if (dragMode !== 'none') {
        pushHistory(layers);
    }
    setDragMode('none');
    setDragStart(null);
    setInitialLayerState(null);
  };

  // --- STATE HELPERS ---
  const updateLayer = (id: string, updates: Partial<ThumbnailLayer>) => {
    const updatedLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(updatedLayers);
  };

  const pushHistory = (newLayers: ThumbnailLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers(history[historyIndex + 1]);
    }
  };

  const deleteLayer = (id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    setSelectedId(null);
    pushHistory(newLayers);
  };

  const createNewProject = (type: DesignType) => {
    const preset = CANVAS_PRESETS[type];
    setLayers([]);
    setCanvasConfig({ width: preset.w, height: preset.h, backgroundColor: '#000000' });
    setActiveDesignType(type);
    setCurrentProject(null);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTool('add');
  };

  const saveProject = async (silent = false) => {
    if (layers.length === 0 && !currentProject) return;
    setIsSavingProject(true);
    try {
        let previewUrl = currentProject?.preview_url;
        // Only generate preview if we have canvas
        if (!silent && canvasRef.current) {
             const blob = await new Promise<Blob | null>(resolve => canvasRef.current?.toBlob(resolve, 'image/jpeg', 0.5));
             if (blob) {
                 const path = `${user.id}/previews/${Date.now()}.jpg`;
                 await supabase.storage.from('design-assets').upload(path, blob);
                 const { data } = supabase.storage.from('design-assets').getPublicUrl(path);
                 previewUrl = data.publicUrl;
             }
        }
        const projectData = {
            user_id: user.id,
            type: activeDesignType,
            name: currentProject?.name || `Untitled ${CANVAS_PRESETS[activeDesignType].label}`,
            json_state: { layers, canvasConfig },
            preview_url: previewUrl,
            related_id: relatedId || currentProject?.related_id,
            updated_at: new Date().toISOString()
        };
        if (currentProject?.id) {
            await supabase.from('design_projects').update(projectData).eq('id', currentProject.id);
        } else {
            const { data } = await supabase.from('design_projects').insert([projectData]).select().single();
            if (data) setCurrentProject(data as DesignProject);
        }
        if (!silent) {
            fetchProjects();
            addToast({ type: 'success', message: 'Project saved.' });
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsSavingProject(false);
    }
  };

  const loadProject = (project: DesignProject) => {
    setCurrentProject(project);
    setLayers(project.json_state.layers);
    setCanvasConfig(project.json_state.canvasConfig);
    setActiveDesignType(project.type);
    setHistory([project.json_state.layers]);
    setHistoryIndex(0);
    setActiveTool('layers'); // Go to layers view
    addToast({ type: 'success', message: `Loaded "${project.name}"` });
  };

  const selectedLayer = layers.find(l => l.id === selectedId);

  return (
    <div className="fixed inset-0 z-[150] bg-[#0c0c0c] flex flex-col text-white font-sans animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-brand">
            <Layout className="w-5 h-5" />
            <span className="font-black uppercase tracking-widest text-xs hidden md:inline">Creator Suite</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
             <button onClick={handleUndo} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><Undo2 className="w-4 h-4" /></button>
             <button onClick={handleRedo} className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><Redo2 className="w-4 h-4" /></button>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="relative">
             <button 
               onClick={() => setShowPresets(!showPresets)}
               className="flex items-center gap-2 text-[10px] font-bold uppercase hover:text-white text-zinc-400"
             >
                {CANVAS_PRESETS[activeDesignType].label} <ChevronDown className="w-3 h-3" />
             </button>
             {showPresets && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />
                 <div className="absolute top-full left-0 mt-2 bg-[#111] border border-white/10 rounded-sm shadow-xl w-48 z-50 animate-in fade-in slide-in-from-top-2">
                    {(Object.keys(CANVAS_PRESETS) as DesignType[]).map(type => (
                       <button key={type} onClick={() => { createNewProject(type); setShowPresets(false); }} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase hover:bg-white/10 text-zinc-300 hover:text-white border-b border-white/5 last:border-0">
                          {CANVAS_PRESETS[type].label}
                       </button>
                    ))}
                 </div>
               </>
             )}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {currentProject && <span className="text-[10px] text-zinc-500 font-bold hidden md:inline">{currentProject.name}</span>}
           <button onClick={() => saveProject()} disabled={isSavingProject} className="text-zinc-400 hover:text-white flex items-center gap-2 text-[10px] font-bold uppercase">
              {isSavingProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
           </button>
           <button onClick={handleExport} disabled={isProcessing} className="bg-brand text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:brightness-110 flex items-center gap-2">
             {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Export
           </button>
           <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOLBAR (SIMPLE TABS) */}
        <div className="w-16 bg-[#0a0a0a] border-r border-white/10 flex flex-col items-center py-4 gap-2 z-10 shrink-0">
           <ToolButton icon={Plus} label="Add" active={activeTool === 'add'} onClick={() => setActiveTool('add')} />
           <ToolButton icon={Layers} label="Layers" active={activeTool === 'layers'} onClick={() => setActiveTool('layers')} />
           <ToolButton icon={Sliders} label="Edit" active={activeTool === 'edit'} onClick={() => setActiveTool('edit')} disabled={!selectedId} />
           <ToolButton icon={FolderOpen} label="Projects" active={activeTool === 'project'} onClick={() => setActiveTool('project')} />
        </div>

        {/* WORKSPACE */}
        <div className="flex-1 bg-[#111] relative flex items-center justify-center overflow-hidden">
           {/* Zoom Controls */}
           <div className="absolute bottom-4 left-4 flex gap-2 bg-[#0a0a0a] p-1 rounded border border-white/10 z-20">
              <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-white/10"><Minus className="w-4 h-4" /></button>
              <span className="text-[10px] font-mono py-2 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-white/10"><Plus className="w-4 h-4" /></button>
           </div>

           <div 
             className="shadow-2xl shadow-black relative"
             style={{ 
               width: canvasConfig.width * zoom, 
               height: canvasConfig.height * zoom,
               transition: 'width 0.1s, height 0.1s' 
             }}
           >
             <canvas 
                ref={canvasRef}
                width={canvasConfig.width}
                height={canvasConfig.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                className="w-full h-full cursor-pointer bg-white touch-none"
             />
             
             {/* LOADING OVERLAY FOR BG REMOVAL */}
             {bgRemovalLoading && (
                 <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                     <Loader2 className="w-8 h-8 text-brand animate-spin mb-2" />
                     <span className="text-white font-black uppercase tracking-widest text-xs">Removing Background...</span>
                 </div>
             )}
           </div>
        </div>

        {/* RIGHT PANEL (CONTEXTUAL) */}
        <div className="w-80 bg-[#0a0a0a] border-l border-white/10 flex flex-col overflow-y-auto custom-scrollbar z-10 shrink-0">
           
           {/* ADD PANEL */}
           {activeTool === 'add' && (
               <div className="p-6 space-y-6 animate-in slide-in-from-right-2">
                   <div className="font-black text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-2">Add Elements</div>
                   
                   <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => {
                           addLayer({
                               type: 'text', name: 'Text', content: 'ADD TEXT', x: canvasConfig.width/2, y: canvasConfig.height/2,
                               width: 300, height: 80, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
                               fontSize: 80, fontFamily: 'Impact, sans-serif', color: '#ffffff', fontWeight: 'bold',
                               fontStyle: 'normal' // ensure default style
                           });
                           setActiveTool('edit');
                       }} className="flex flex-col items-center justify-center gap-2 p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand/50 transition-all rounded">
                           <TypeIcon className="w-6 h-6 text-zinc-300" />
                           <span className="text-[10px] font-bold uppercase">Add Text</span>
                       </button>

                       <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand/50 transition-all rounded">
                           <ImageIcon className="w-6 h-6 text-zinc-300" />
                           <span className="text-[10px] font-bold uppercase">Add Image</span>
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                   </div>

                   <div className="space-y-3">
                       <p className="text-[10px] font-bold text-zinc-600 uppercase">Shapes</p>
                       <div className="grid grid-cols-3 gap-2">
                           <button onClick={() => addLayer({ type: 'shape', name: 'Square', content: 'rect', x: canvasConfig.width/2, y: canvasConfig.height/2, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, color: '#ff007f' })} className="p-3 bg-white/5 hover:bg-white/10 flex justify-center items-center"><Square size={20} /></button>
                           <button onClick={() => addLayer({ type: 'shape', name: 'Circle', content: 'circle', x: canvasConfig.width/2, y: canvasConfig.height/2, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, color: '#ff007f' })} className="p-3 bg-white/5 hover:bg-white/10 flex justify-center items-center"><Circle size={20} /></button>
                           <button onClick={() => addLayer({ type: 'shape', name: 'Triangle', content: 'triangle', x: canvasConfig.width/2, y: canvasConfig.height/2, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, color: '#ff007f' })} className="p-3 bg-white/5 hover:bg-white/10 flex justify-center items-center"><Triangle size={20} /></button>
                       </div>
                   </div>

                   <div className="space-y-4 pt-6 border-t border-white/5">
                        <div className="font-black text-[10px] uppercase tracking-widest text-zinc-500 pb-2">Canvas</div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-500 block">Background Color</label>
                            <div className="flex gap-2">
                                <input type="color" value={canvasConfig.backgroundColor} onChange={e => setCanvasConfig({ ...canvasConfig, backgroundColor: e.target.value })} className="w-8 h-8 bg-transparent border-none p-0 cursor-pointer" />
                                <input type="text" value={canvasConfig.backgroundColor} onChange={e => setCanvasConfig({ ...canvasConfig, backgroundColor: e.target.value })} className="flex-1 bg-[#111] border border-white/10 p-2 text-xs font-mono" />
                            </div>
                        </div>
                   </div>
               </div>
           )}

           {/* EDIT PANEL */}
           {activeTool === 'edit' && selectedLayer && (
               <div className="p-6 space-y-6 animate-in slide-in-from-right-2">
                   <div className="font-black text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-2 flex justify-between items-center">
                       <span>Editing {selectedLayer.name}</span>
                       <button onClick={() => deleteLayer(selectedLayer.id)} className="text-rose-500 hover:text-white p-1"><Trash2 size={12} /></button>
                   </div>

                   {selectedLayer.type === 'text' && (
                       <div className="space-y-4">
                           <textarea value={selectedLayer.content} onChange={e => updateLayer(selectedLayer.id, { content: e.target.value })} className="w-full bg-[#111] border border-white/10 p-3 text-sm font-bold text-white resize-none" rows={2} />
                           
                           <div className="grid grid-cols-2 gap-2">
                               <select 
                                 value={selectedLayer.fontFamily} 
                                 onChange={e => {
                                     const family = e.target.value;
                                     updateLayer(selectedLayer.id, { fontFamily: family });
                                     // Font auto-load effect handles checking/loading
                                 }} 
                                 className="bg-[#111] border border-white/10 p-2 text-xs text-white"
                               >
                                   {FONTS.map(f => <option key={f.name} value={f.family}>{f.name}</option>)}
                               </select>
                               <input type="color" value={selectedLayer.color} onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })} className="w-full h-8 bg-transparent" />
                           </div>
                           
                           <div className="grid grid-cols-3 gap-2">
                               <StyleButton active={selectedLayer.fontWeight === 'bold'} onClick={() => updateLayer(selectedLayer.id, { fontWeight: selectedLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold size={14} /></StyleButton>
                               <StyleButton active={selectedLayer.fontStyle === 'italic'} onClick={() => updateLayer(selectedLayer.id, { fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={14} /></StyleButton>
                               <StyleButton active={!!selectedLayer.strokeWidth} onClick={() => updateLayer(selectedLayer.id, { strokeWidth: selectedLayer.strokeWidth ? 0 : 2, strokeColor: '#000000' })}>Stroke</StyleButton>
                           </div>

                           <FilterControl label="Size" value={selectedLayer.fontSize || 20} min={10} max={300} onChange={v => updateLayer(selectedLayer.id, { fontSize: v })} />
                       </div>
                   )}

                   {selectedLayer.type === 'image' && (
                       <div className="space-y-4">
                           <button 
                               onClick={handleRemoveBackground}
                               className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:brightness-110"
                           >
                               {bgRemovalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Remove Background
                           </button>
                           
                           <div className="space-y-2 border-t border-white/5 pt-4">
                               <FilterControl label="Opacity" value={(selectedLayer.opacity || 1) * 100} min={0} max={100} onChange={v => updateLayer(selectedLayer.id, { opacity: v / 100 })} />
                               <FilterControl label="Brightness" value={selectedLayer.filters?.brightness ?? 100} min={0} max={200} onChange={v => updateLayer(selectedLayer.id, { filters: { ...selectedLayer.filters!, brightness: v } })} />
                               <FilterControl label="Contrast" value={selectedLayer.filters?.contrast ?? 100} min={0} max={200} onChange={v => updateLayer(selectedLayer.id, { filters: { ...selectedLayer.filters!, contrast: v } })} />
                               <FilterControl label="Saturation" value={selectedLayer.filters?.saturation ?? 100} min={0} max={200} onChange={v => updateLayer(selectedLayer.id, { filters: { ...selectedLayer.filters!, saturation: v } })} />
                           </div>
                       </div>
                   )}

                   {selectedLayer.type === 'shape' && (
                       <div className="space-y-4">
                           <label className="text-[9px] font-bold text-zinc-500 uppercase">Shape Color</label>
                           <input type="color" value={selectedLayer.color} onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })} className="w-full h-10 bg-transparent cursor-pointer" />
                           <FilterControl label="Opacity" value={(selectedLayer.opacity || 1) * 100} min={0} max={100} onChange={v => updateLayer(selectedLayer.id, { opacity: v / 100 })} />
                       </div>
                   )}
               </div>
           )}

           {/* LAYERS PANEL */}
           {activeTool === 'layers' && (
               <div className="p-4 flex flex-col h-full animate-in slide-in-from-right-2">
                   <div className="font-black text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-2 mb-2">Layer Stack</div>
                   <div className="flex-1 overflow-y-auto space-y-1">
                       {[...layers].reverse().map((l, i) => (
                           <div 
                               key={l.id}
                               onClick={() => setSelectedId(l.id)}
                               className={`flex items-center gap-3 p-3 rounded cursor-pointer border ${selectedId === l.id ? 'bg-brand/10 border-brand' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                           >
                               {l.type === 'image' && <ImageIcon size={14} className="text-zinc-400" />}
                               {l.type === 'text' && <TypeIcon size={14} className="text-zinc-400" />}
                               {l.type === 'shape' && <Square size={14} className="text-zinc-400" />}
                               <span className="text-xs font-bold text-white truncate flex-1">{l.name || l.type}</span>
                               <div className="flex gap-1">
                                   <button onClick={(e) => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }) }} className="p-1 text-zinc-500 hover:text-white">{l.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                   <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id) }} className="p-1 text-zinc-500 hover:text-rose-500"><Trash2 size={12} /></button>
                               </div>
                           </div>
                       ))}
                       {layers.length === 0 && <p className="text-[10px] text-zinc-600 text-center py-10 uppercase font-bold">No layers added</p>}
                   </div>
               </div>
           )}

           {/* PROJECTS LIST */}
           {activeTool === 'project' && (
               <div className="p-4 flex flex-col h-full animate-in slide-in-from-right-2">
                   <div className="font-black text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-2 mb-2">Saved Projects</div>
                   <div className="flex-1 overflow-y-auto space-y-2">
                       {projectsList.map(p => (
                           <div key={p.id} onClick={() => loadProject(p)} className="p-2 border border-white/10 hover:bg-white/5 cursor-pointer flex gap-3">
                               <div className="w-16 aspect-video bg-black shrink-0 relative">
                                   {p.preview_url ? <img src={p.preview_url} className="w-full h-full object-cover" /> : <Layout className="w-full h-full p-4 text-zinc-700" />}
                               </div>
                               <div className="min-w-0">
                                   <p className="text-xs font-bold truncate text-white">{p.name}</p>
                                   <p className="text-[9px] text-zinc-500 uppercase">{new Date(p.updated_at).toLocaleDateString()}</p>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {!selectedId && activeTool === 'edit' && (
               <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
                   <MousePointer2 className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Select a layer to edit</p>
               </div>
           )}

        </div>
      </div>
    </div>
  );
};

const ToolButton = ({ icon: Icon, label, active, onClick, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-full py-4 flex flex-col items-center justify-center gap-1 transition-all ${active ? 'bg-brand text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[9px] font-black uppercase tracking-wide">{label}</span>
  </button>
);

const StyleButton = ({ children, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-2 border rounded transition-all flex items-center justify-center ${active ? 'bg-white text-black border-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}
  >
    {children}
  </button>
);

const FilterControl = ({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <label className="text-[9px] font-bold text-zinc-500 uppercase">{label}</label>
      <span className="text-[9px] font-mono text-zinc-400">{Math.round(value)}</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-brand h-1 bg-white/10 appearance-none rounded-full" />
  </div>
);

export default ThumbnailStudio;
