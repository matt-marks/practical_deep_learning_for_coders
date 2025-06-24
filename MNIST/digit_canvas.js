/* digit_canvas.js
 Adds drawing (mouse + touch) on #digit-canvas
 and wires #btn-clear to erase the canvas.
 */
(() => {
    /* ---- Locate DOM elements ------------------- */
    const canvas   = document.getElementById("digit-canvas");
    const btnClear = document.getElementById("btn-clear");
    
    if (!canvas) {
        console.warn("digit_canvas.js: No canvas with id='digit-canvas' found.");
        return;
    }
    
    /* ---- Hi-DPI setup -------------------------- */
    const DPR  = window.devicePixelRatio || 1;
    const cssW = 300;               // CSS pixels (matches <canvas width>)
    const cssH = 300;
    
    canvas.width  = cssW * DPR;
    canvas.height = cssH * DPR;
    
    const ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);            // now 1 unit = 1 CSS pixel
    
    /* ---- Drawing style ------------------------- */
    function setDrawingStyle() {
        ctx.lineWidth   = 18;
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";
        ctx.strokeStyle = "#000";
    }
    
    function paintWhiteBackground() {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cssW, cssH);
    }
    
    /* Initial paint */
    paintWhiteBackground();
    setDrawingStyle();
    
    /* ---- Drawing helpers ----------------------- */
    let drawing = false;
    
    function pos(evt) {
        if (evt.touches) {                         // Touch
            const r = canvas.getBoundingClientRect();
            return { x: evt.touches[0].clientX - r.left,
                y: evt.touches[0].clientY - r.top };
        }
        return { x: evt.offsetX, y: evt.offsetY }; // Mouse
    }
    
    function start(evt) {
        drawing = true;
        const { x, y } = pos(evt);
        ctx.beginPath();
        ctx.moveTo(x, y);
        evt.preventDefault();
    }
    
    function move(evt) {
        if (!drawing) return;
        const { x, y } = pos(evt);
        ctx.lineTo(x, y);
        ctx.stroke();
        evt.preventDefault();
    }
    
    function end(evt) {
        drawing = false;
        evt.preventDefault();
    }
    
    /* ---- Attach listeners ---------------------- */
    // Mouse
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    
    // Touch
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove",  move,  { passive: false });
    canvas.addEventListener("touchend",   end,   { passive: false });
    
    // Prevent page scrolling while drawing on mobile
    canvas.style.touchAction = "none";
    
    /* ---- Clear button -------------------------- */
    if (btnClear) {
        btnClear.addEventListener("click", () => {
            ctx.save();
            // Wipe & repaint white background
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            paintWhiteBackground();
            setDrawingStyle();
            ctx.restore();
            
            /* --- reset histogram to zeros --- */
            if (window.logitChart) {
                window.logitChart.data.datasets[0].data = Array(10).fill(0);
                window.logitChart.update();
            }
            
        });
    } else {
        console.warn("digit_canvas.js: No button with id='btn-clear' found.");
    }
})();
