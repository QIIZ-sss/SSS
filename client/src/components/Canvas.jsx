import React, { useRef, useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';
import { MINI_CHALLENGES, DEFAULT_COLOR_PALETTE } from '../../../shared/gameConfig';
import { calculateShapeDimensions, drawGhostPreview } from '../gameEngine/shapePreview';

export default function Canvas({ isDrawer, challenge, forcedColor, onSubmitDrawing }) {
  const canvasRef = useRef(null);
  const ghostCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const penLiftedRef = useRef(false);

  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'fill', 'circle', 'rect', 'triangle', 'line'
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5); // 1-50px slider
  const [isPenLocked, setIsPenLocked] = useState(false);
  const [liveDimensionLabel, setLiveDimensionLabel] = useState(null);

  const activeColor = (challenge === MINI_CHALLENGES.COLOUR_FIX && forcedColor) ? forcedColor : color;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleDrawBegin = (data) => {
      ctx.beginPath();
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(data.x, data.y);
    };

    const handleDrawPath = (data) => {
      if (data.tool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.strokeStyle = data.color;
      }
      ctx.lineWidth = data.size;
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    };

    const handleDrawEnd = (data) => {
      if (data && data.shape) {
        drawShape(ctx, data.shape, data.x1, data.y1, data.x2, data.y2, data.color, data.size);
      }
      ctx.closePath();
      clearGhostCanvas();
    };

    const handleDrawClear = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      clearGhostCanvas();
      setIsPenLocked(false);
      penLiftedRef.current = false;
      setLiveDimensionLabel(null);
    };

    const handleDrawFill = (data) => {
      ctx.fillStyle = data.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleDrawSync = (history) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      history.forEach(event => {
        if (event.type === 'begin') handleDrawBegin(event);
        else if (event.type === 'path') handleDrawPath(event);
        else if (event.type === 'end') handleDrawEnd(event);
        else if (event.type === 'fill') handleDrawFill(event);
      });
    };

    const handleRemoteShapePreview = (data) => {
      if (!isDrawer && ghostCanvasRef.current) {
        const ghostCtx = ghostCanvasRef.current.getContext('2d');
        ghostCtx.clearRect(0, 0, ghostCanvasRef.current.width, ghostCanvasRef.current.height);
        drawGhostPreview(ghostCtx, data.shape, data.x1, data.y1, data.x2, data.y2, data.color, data.size);
      }
    };

    socket.on(SOCKET_EVENTS.DRAW_BEGIN, handleDrawBegin);
    socket.on(SOCKET_EVENTS.DRAW_PATH, handleDrawPath);
    socket.on(SOCKET_EVENTS.DRAW_END, handleDrawEnd);
    socket.on(SOCKET_EVENTS.DRAW_CLEAR, handleDrawClear);
    socket.on(SOCKET_EVENTS.DRAW_FILL, handleDrawFill);
    socket.on(SOCKET_EVENTS.DRAW_SYNC, handleDrawSync);
    socket.on(SOCKET_EVENTS.SHAPE_PREVIEW, handleRemoteShapePreview);

    socket.emit(SOCKET_EVENTS.DRAW_SYNC);

    return () => {
      socket.off(SOCKET_EVENTS.DRAW_BEGIN, handleDrawBegin);
      socket.off(SOCKET_EVENTS.DRAW_PATH, handleDrawPath);
      socket.off(SOCKET_EVENTS.DRAW_END, handleDrawEnd);
      socket.off(SOCKET_EVENTS.DRAW_CLEAR, handleDrawClear);
      socket.off(SOCKET_EVENTS.DRAW_FILL, handleDrawFill);
      socket.off(SOCKET_EVENTS.DRAW_SYNC, handleDrawSync);
      socket.off(SOCKET_EVENTS.SHAPE_PREVIEW, handleRemoteShapePreview);
    };
  }, [isDrawer]);

  useEffect(() => {
    setIsPenLocked(false);
    penLiftedRef.current = false;
  }, [challenge, isDrawer]);

  const clearGhostCanvas = () => {
    if (ghostCanvasRef.current) {
      const gctx = ghostCanvasRef.current.getContext('2d');
      gctx.clearRect(0, 0, ghostCanvasRef.current.width, ghostCanvasRef.current.height);
    }
  };

  const drawShape = (ctx, shapeType, x1, y1, x2, y2, strokeColor, size) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = size;
    ctx.beginPath();

    if (shapeType === 'circle') {
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    } else if (shapeType === 'rect') {
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
    } else if (shapeType === 'triangle') {
      ctx.moveTo(x1, y2);
      ctx.lineTo((x1 + x2) / 2, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
    } else if (shapeType === 'line') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }

    ctx.stroke();
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer) return;

    if (challenge === MINI_CHALLENGES.DONT_LIFT_PEN && penLiftedRef.current) {
      alert("Don't Lift Pen Rule Violation! Drawing locked for this turn.");
      setIsPenLocked(true);
      return;
    }

    if (challenge === MINI_CHALLENGES.GEOMETRIC_ONLY && !['circle', 'rect', 'triangle', 'line'].includes(tool)) {
      setTool('rect');
    }

    const coords = getCanvasCoords(e);
    isDrawingRef.current = true;
    canvasRef.current.startX = coords.x;
    canvasRef.current.startY = coords.y;

    if (tool === 'fill') {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = activeColor;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      socket.emit(SOCKET_EVENTS.DRAW_FILL, { color: activeColor });
      isDrawingRef.current = false;
      return;
    }

    if (['pen', 'eraser'].includes(tool)) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : activeColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(coords.x, coords.y);

      socket.emit(SOCKET_EVENTS.DRAW_BEGIN, {
        x: coords.x,
        y: coords.y,
        color: activeColor,
        size: brushSize,
        tool: tool
      });
    }
  };

  const draw = (e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    if (['pen', 'eraser'].includes(tool)) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : activeColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      socket.emit(SOCKET_EVENTS.DRAW_PATH, {
        x: coords.x,
        y: coords.y,
        color: activeColor,
        size: brushSize,
        tool: tool
      });
    } else if (['circle', 'rect', 'triangle', 'line'].includes(tool)) {
      const x1 = canvasRef.current.startX;
      const y1 = canvasRef.current.startY;
      const dims = calculateShapeDimensions(tool, x1, y1, coords.x, coords.y);
      setLiveDimensionLabel(dims.label);

      if (ghostCanvasRef.current) {
        const ghostCtx = ghostCanvasRef.current.getContext('2d');
        ghostCtx.clearRect(0, 0, ghostCanvasRef.current.width, ghostCanvasRef.current.height);
        drawGhostPreview(ghostCtx, tool, x1, y1, coords.x, coords.y, activeColor, brushSize);
      }

      socket.emit(SOCKET_EVENTS.SHAPE_PREVIEW, {
        shape: tool,
        x1, y1,
        x2: coords.x,
        y2: coords.y,
        color: activeColor,
        size: brushSize
      });
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (challenge === MINI_CHALLENGES.DONT_LIFT_PEN) {
      penLiftedRef.current = true;
      setIsPenLocked(true);
    }

    const coords = e ? getCanvasCoords(e) : { x: canvasRef.current.startX, y: canvasRef.current.startY };
    const x1 = canvasRef.current.startX;
    const y1 = canvasRef.current.startY;

    if (['circle', 'rect', 'triangle', 'line'].includes(tool)) {
      const ctx = canvasRef.current.getContext('2d');
      drawShape(ctx, tool, x1, y1, coords.x, coords.y, activeColor, brushSize);

      socket.emit(SOCKET_EVENTS.DRAW_END, {
        shape: tool,
        x1, y1,
        x2: coords.x,
        y2: coords.y,
        color: activeColor,
        size: brushSize
      });
    } else {
      socket.emit(SOCKET_EVENTS.DRAW_END, {});
    }

    clearGhostCanvas();
    setLiveDimensionLabel(null);
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    socket.emit(SOCKET_EVENTS.DRAW_CLEAR);
  };

  return (
    <div className="flex flex-col items-center w-full gap-space-md">
      <div className="relative w-full max-w-[640px] aspect-[4/3] bg-canvas-paper rounded-xl border-4 border-border-dark shadow-[6px_6px_0px_0px_#18181B] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className={`w-full h-full ${isDrawer && !isPenLocked ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        />
        <canvas
          ref={ghostCanvasRef}
          width={640}
          height={480}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0 w-full h-full pointer-events-auto"
        />

        {/* Real-time Dimension Indicator Badge (SRS 2.1) */}
        {liveDimensionLabel && (
          <div className="absolute top-3 left-3 bg-border-dark/90 text-tertiary-fixed border-2 border-border-dark px-space-md py-1 rounded-lg font-headline-sm text-label-md shadow-md z-10">
            📐 {liveDimensionLabel}
          </div>
        )}

        {isPenLocked && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-timer-red text-on-error px-space-md py-space-xs rounded-xl border-2 border-border-dark shadow-md font-headline-sm text-label-md uppercase">
            ⚠️ DON'T LIFT PEN RULE LOCKED
          </div>
        )}
      </div>

      {/* Drawing Dock Toolbar */}
      {isDrawer && (
        <div className="w-full max-w-[640px] bg-canvas-paper rounded-xl border-2 border-border-dark shadow-[4px_4px_0px_0px_#18181B] p-space-md flex flex-col gap-space-sm">
          {/* Tool Chips */}
          <div className="flex flex-wrap items-center gap-space-xs">
            {challenge !== MINI_CHALLENGES.GEOMETRIC_ONLY && (
              <>
                <button
                  className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                    tool === 'pen' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
                  }`}
                  onClick={() => setTool('pen')}
                  type="button"
                >
                  ✏️ PEN
                </button>
                <button
                  className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                    tool === 'eraser' ? 'bg-timer-red text-on-error shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
                  }`}
                  onClick={() => setTool('eraser')}
                  type="button"
                >
                  🧹 ERASER
                </button>
                <button
                  className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                    tool === 'fill' ? 'bg-accent-blue text-on-tertiary shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
                  }`}
                  onClick={() => setTool('fill')}
                  type="button"
                >
                  🪣 BUCKET
                </button>
              </>
            )}

            {/* Geometric Primitive Shape Tools */}
            <button
              className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                tool === 'circle' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
              }`}
              onClick={() => setTool('circle')}
              type="button"
            >
              ⚪ CIRCLE
            </button>
            <button
              className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                tool === 'rect' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
              }`}
              onClick={() => setTool('rect')}
              type="button"
            >
              ⬜ RECT
            </button>
            <button
              className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                tool === 'triangle' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
              }`}
              onClick={() => setTool('triangle')}
              type="button"
            >
              🔺 TRIANGLE
            </button>
            <button
              className={`px-space-md py-1.5 rounded-lg font-label-md uppercase border-2 border-border-dark transition-all ${
                tool === 'line' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-[2px_2px_0px_#18181B]' : 'bg-surface-card hover:bg-surface-container'
              }`}
              onClick={() => setTool('line')}
              type="button"
            >
              📏 LINE
            </button>

            <button
              className="ml-auto px-space-md py-1.5 rounded-lg font-label-md uppercase bg-error-container text-on-error-container border-2 border-border-dark shadow-[2px_2px_0px_#18181B] hover:bg-error hover:text-on-error transition-all"
              onClick={clearCanvas}
              type="button"
            >
              🗑️ CLEAR
            </button>
            {onSubmitDrawing && (
              <button
                className="px-space-md py-1.5 rounded-lg font-label-md uppercase bg-primary-container text-on-primary border-2 border-border-dark shadow-[2px_2px_0px_#18181B] hover:opacity-90 transition-all"
                onClick={onSubmitDrawing}
                type="button"
              >
                🚀 SUBMIT
              </button>
            )}
          </div>

          {/* Brush Size Slider (1-50px) */}
          <div className="flex items-center gap-space-md bg-surface-card-subtle p-space-xs px-space-md rounded-xl">
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">BRUSH SIZE:</span>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="font-label-md text-label-md bg-canvas-paper px-space-sm py-0.5 rounded-lg border border-border-dark">
              {brushSize}px
            </span>
          </div>

          {/* Color Palette & Custom Color Picker */}
          {challenge !== MINI_CHALLENGES.COLOUR_FIX && (
            <div className="flex items-center justify-between gap-space-sm flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {DEFAULT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 border-border-dark transition-all ${
                      color === c ? 'scale-110 ring-4 ring-secondary shadow-md' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    type="button"
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-9 h-9 rounded-xl border-2 border-border-dark cursor-pointer bg-surface"
                title="Custom Color Picker"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
