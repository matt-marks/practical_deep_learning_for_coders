ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

(async () => {
    try {
        console.log("Loading model…");
        /* ---- 1. load model once ---- */
        const session = await ort.InferenceSession.create(
            "https://www.mattmarks.io/s/mnist.onnx"
        );
        console.log("Model ready ✅");
        
        /* ---- 2. helpers ---- */
        function canvasTo28x28Float() {
            const src = document.getElementById("digit-canvas");
            /* draw onto an off-screen 28×28 canvas */
            const tmp = document.createElement("canvas");
            tmp.width = tmp.height = 28;
            const tctx = tmp.getContext("2d");
            tctx.drawImage(src, 0, 0, 28, 28);
            
            /* get grayscale values 0-1 (invert because drawing is black) */
            const { data } = tctx.getImageData(0, 0, 28, 28);
            const out = new Float32Array(1 * 1 * 28 * 28);
            for (let i = 0; i < 28 * 28; i++) {
                const pixel = data[i * 4];          // R channel
                const norm  = (1 - pixel / 255 - 0.1307) / 0.3081;
                               out[i] = norm;
                               }
            return out;
        }
        
        async function predict() {
            const input = canvasTo28x28Float();
            const feeds = {
                input: new ort.Tensor("float32", input, [1, 28 * 28])
            };
            const results = await session.run(feeds);
            const logits  = results.logits.data;          // Float32Array[10]
            console.log("Logits:", logits);
            
            // OPTIONAL softmax -> probs 0-100 %
            const exp = logits.map(Math.exp);
            const sum = exp.reduce((a, b) => a + b, 0);
            const percents = exp.map(v => Math.round((v / sum) * 100));
            
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
