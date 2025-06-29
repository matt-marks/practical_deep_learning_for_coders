ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

/* --------------------------------------- */
/* Put these two constants near the top…   */
const MNIST_MEAN = 0.1307;
const MNIST_STD  = 0.3081;
/* --------------------------------------- */

(async () => {
    try {
        console.log("Loading model…");
        /* ---- 1. load model once ---- */
        const session = await ort.InferenceSession.create(
            "https://cdn.jsdelivr.net/gh/matt-marks/practical_deep_learning_for_coders@main/MNIST/model.onnx",
             { executionProviders: ["wasm"] }
        );
        console.log("Model ready ✅");
        
        /* ---- 2. helpers ---- */

        function canvasTo28x28Float() {
          const src  = document.getElementById("digit-canvas");

          /* ---- STEP 0: down-sample the full Hi-DPI bitmap to 28×28 ---------- */
          const down = document.createElement("canvas");
          down.width = down.height = 28;
          down.getContext("2d").drawImage(src, 0, 0, src.width, src.height, 0, 0, 28, 28);

          /* ---- STEP 1-3: bbox • scale-to-20 • center on tmp ----------------- */
          const sctx = down.getContext("2d");
          const full = sctx.getImageData(0, 0, 28, 28).data;
          let xMin = 28, yMin = 28, xMax = -1, yMax = -1;
          for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
              if (full[(y * 28 + x) * 4] < 250) {
                if (x < xMin) xMin = x; if (y < yMin) yMin = y;
                if (x > xMax) xMax = x; if (y > yMax) yMax = y;
              }
            }
          }
          if (xMax < 0) { xMin = yMin = 0; xMax = yMax = 27; }

          const boxW = xMax - xMin + 1, boxH = yMax - yMin + 1;
          const tmp  = document.createElement("canvas");
          tmp.width = tmp.height = 28;
          const tctx = tmp.getContext("2d");
          const scale = 20 / Math.max(boxW, boxH);
          const w = boxW * scale, h = boxH * scale;
          const dx = (28 - w) / 2, dy = (28 - h) / 2;
          tctx.fillStyle = "#fff"; tctx.fillRect(0, 0, 28, 28);
          tctx.imageSmoothingEnabled = true;
          tctx.drawImage(down, xMin, yMin, boxW, boxH, dx, dy, w, h);

          /* ---- STEP 4: grayscale → Float32 (normalised) + Uint8 (preview) --- */
          const { data } = tctx.getImageData(0, 0, 28, 28);
          const tensor   = new Float32Array(28 * 28);
          const preview  = new Uint8ClampedArray(28 * 28 * 4);   // RGBA

          for (let i = 0; i < 28 * 28; i++) {
            const vInv = 1 - data[i * 4] / 255;            // invert → 0-1
            const norm = (vInv - MNIST_MEAN) / MNIST_STD;  // normalise
            tensor[i]  = norm;

            /* 🔹  For preview we *undo* normalisation so humans see 0-255 gray */
            const gray = Math.round((vInv) * 255);
            preview[i * 4 + 0] = gray;
            preview[i * 4 + 1] = gray;
            preview[i * 4 + 2] = gray;
            preview[i * 4 + 3] = 255;                      // opaque
          }
          return { tensor, preview };
        }

        
        async function predict() {
            const { tensor, preview } = canvasTo28x28Float();
            const feeds = {
              input: new ort.Tensor("float32", tensor, [1, 1, 28, 28])
            };
            
            /* 🔹 paint preview */
            const pctx = document.getElementById("preview-canvas").getContext("2d");
            const imgData = new ImageData(preview, 28, 28);
            pctx.putImageData(imgData, 0, 0);
            const results = await session.run(feeds);
            const logits  = results.logits.data;          // Float32Array[10]
            console.log("Logits:", logits);
            
            /* ---- Numerically-stable soft-max -> 0-100 % ---- */
            const logitsArr = Array.from(logits);              // Float32Array ➜ normal array
            const maxLogit  = Math.max(...logitsArr);          // subtract max for stability
            const exp       = logitsArr.map(l => Math.exp(l - maxLogit));
            const sum       = exp.reduce((a, b) => a + b, 0);
            const percents  =
            (sum > 0 && Number.isFinite(sum))
            ? exp.map(v => Math.round((v / sum) * 100))
            : Array(10).fill(0);                           // fallback, never NaN
            
            /* update histogram (Chart.js object from global scope) */
            logitChart.data.datasets[0].data = percents;  // or logits
            logitChart.update();
            console.log("Chart updated ✅");
        }
        
        /* ---- 3. hook Predict button ---- */
        document.getElementById("btn-predict")
        .addEventListener("click", predict);
    } catch (e) {
        console.error("Inference init failed:", e);
    }
})();
