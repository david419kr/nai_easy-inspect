// NovelAI Easy Inspect – extended version
// Adds global inspect button and modal‑specific inspect button when metadata dialog appears

/*****************  UTILITIES  *****************/
function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    });
}

function extractPngMetadata(arrayBuffer) {
    const dv = new DataView(arrayBuffer);
    const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < sig.length; i++) {
        if (dv.getUint8(i) !== sig[i]) throw new Error("Invalid PNG file.");
    }
    let off = 8;
    const meta = {};
    while (off < dv.byteLength) {
        if (off + 8 > dv.byteLength) break;
        const len = dv.getUint32(off); off += 4;
        let type = "";
        for (let i = 0; i < 4; i++) type += String.fromCharCode(dv.getUint8(off + i));
        off += 4;
        const chunk = new Uint8Array(arrayBuffer, off, len);
        off += len + 4;
        if (type === "tEXt") {
            const nul = chunk.indexOf(0);
            if (nul === -1) continue;
            const key = new TextDecoder("ascii").decode(chunk.slice(0, nul));
            const val = new TextDecoder("latin1").decode(chunk.slice(nul + 1));
            meta[key] = val;
        } else if (type === "iTXt") {
            let p = 0;
            const keyEnd = chunk.indexOf(0, p);
            if (keyEnd === -1) continue;
            const key = new TextDecoder("utf-8").decode(chunk.slice(p, keyEnd));
            p = keyEnd + 3;
            const langEnd = chunk.indexOf(0, p);
            if (langEnd === -1) continue;
            p = langEnd + 1;
            const transEnd = chunk.indexOf(0, p);
            if (transEnd === -1) continue;
            p = transEnd + 1;
            const val = new TextDecoder("utf-8").decode(chunk.slice(p));
            meta[key] = val;
        }
    }
    return meta;
}

function findBackgroundImage(element) {
    if (element.style && element.style.backgroundImage) {
      return element.style.backgroundImage;
    }
  
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const result = findBackgroundImage(children[i]);
      if (result) {
        return result;
      }
    }
  
    return null;
  }

/*****************  COMMON BUILDERS  *****************/
function buildPromptData(metaRaw, metaJson) {
    const models = {
        "NovelAI Diffusion V4 79F47848": "NAI Diffusion V4 Full",
        "NovelAI Diffusion V4 C1CCBA86": "NAI Diffusion V4 Curated",
        "Stable Diffusion XL 7BCCAA2C": "NAI Diffusion Anime V3",
        "Stable Diffusion XL 37C2B166": "NAI Diffusion Furry V3",
        "Stable Diffusion F1022D28": "NAI Diffusion Anime V2",
    };
    let model = metaRaw.Source || "Unknown Model";
    model += models[model] ? ` (${models[model]})` : " (Legacy or Unknown Model)";
    const pd = {
        prompt: metaJson.prompt,
        undesired_content: metaJson.uc,
        resolution: `${metaJson.width}x${metaJson.height}`,
        seed: metaJson.seed,
        sampler: metaJson.noise_schedule ? `${metaJson.sampler} (${metaJson.noise_schedule})` : metaJson.sampler,
        steps: metaJson.steps,
        prompt_guidance: metaJson.scale,
        prompt_guidance_rescale: metaJson.cfg_rescale,
        undesired_content_strength: metaJson.uncond_scale,
        requestType: metaJson.request_type === "PromptGenerateRequest" ? "Txt2ImgRequest" : metaJson.request_type,
        model,
    };
    if (metaJson.v4_prompt) {
        pd.characterPrompts = metaJson.v4_prompt.caption.char_captions.map((c, i) => ({
            prompt: c.char_caption,
            uc: metaJson.v4_negative_prompt.caption.char_captions[i].char_caption,
        }));
    }
    return pd;
}

function showPromptOverlay(pd) {
    const ov = document.createElement("div");
    Object.assign(ov.style, {
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        display: "flex", justifyContent: "center", alignItems: "center",
        background: "rgba(0,0,0,.5)", backdropFilter: "blur(5px)", zIndex: 10001,
    });
    const box = document.createElement("div");
    Object.assign(box.style, {
        position: "relative", background: "#12152c", color: "#fff", padding: "20px",
        borderRadius: "10px", maxWidth: "600px", width: "80%", maxHeight: "80%",
        overflowY: "auto", border: "2px solid #fff",
    });
    const close = document.createElement("div");
    close.textContent = "×";
    Object.assign(close.style, { position: "absolute", top: "10px", right: "23px", fontSize: "38px", fontWeight: "bold", cursor: "pointer" });
    close.onclick = () => document.body.removeChild(ov);
    ov.onclick = e => { if (e.target === ov) document.body.removeChild(ov); };

    let html = `<h1>NAI Inspect</h1><h2>Prompt</h2>` +
        `<p><strong>Prompt:</strong> <span style='font-style: italic; opacity:.8;'>${pd.prompt}</span></p>` +
        `<p><strong>UC:</strong> <span style='font-style: italic; opacity:.8;'>${pd.undesired_content}</span></p>`;
    if (pd.characterPrompts && pd.characterPrompts.length > 0) {
        html += `<h4 style='opacity:.9;'>Character Prompt</h4>`;
        pd.characterPrompts.forEach((c, i) => {
            html += `<p><hr/></p><div style='margin-bottom:10px;'><strong>Character ${i + 1} Prompt:</strong> <span style='font-style: italic; opacity:.8;'>${c.prompt}</span><br/>` +
                `<strong>Character ${i + 1} UC:</strong> <span style='font-style: italic; opacity:.8;'>${c.uc}</span></div>`;
        });
        html += `<p><hr/></p>`;
    }
    html += `</p><h2>Details</h2>` +
        `<strong>Model:</strong> <span style='font-style: italic; opacity:.8;'>${pd.model}</span><br/>` +
        `<strong>Request Type:</strong> <span style='font-style: italic; opacity:.8;'>${pd.requestType}</span><br/>` +
        `<strong>Resolution:</strong> <span style='font-style: italic; opacity:.8;'>${pd.resolution}</span><br/>` +
        `<strong>Seed:</strong> <span style='font-style: italic; opacity:.8;'>${pd.seed}</span><br/>` +
        `<strong>Sampler:</strong> <span style='font-style: italic; opacity:.8;'>${pd.sampler}</span><br/>` +
        `<strong>Steps:</strong> <span style='font-style: italic; opacity:.8;'>${pd.steps}</span><br/>` +
        `<strong>Prompt Guidance:</strong> <span style='font-style: italic; opacity:.8;'>${pd.prompt_guidance}</span><br/>` +
        `<strong>Prompt Guidance Rescale:</strong> <span style='font-style: italic; opacity:.8;'>${pd.prompt_guidance_rescale}</span><br/>` +
        `<strong>Undesired Content Strength:</strong> <span style='font-style: italic; opacity:.8;'>${pd.undesired_content_strength}</span><br/>`;
    box.innerHTML = html;
    box.appendChild(close);
    ov.appendChild(box);
    document.body.appendChild(ov);
}

function createInspectButton() {
    const b = document.createElement("button");
    b.textContent = "i";
    Object.assign(b.style, {
        width: "20px", height: "20px", borderRadius: "50%", background: "#fff",
        border: "1px solid #ccc", fontSize: "20px", fontWeight: "bold", color: "#000",
        cursor: "pointer", opacity: .7, display: "flex", alignItems: "center", justifyContent: "center",
    });
    b.classList.add("nai-inspect-btn");
    return b;
}

/*****************  GLOBAL GRID BUTTON  *****************/
async function addGlobalPromptButton() {
    const btn = createInspectButton();
    Object.assign(btn.style, { position: "absolute", top: "2px", right: "10px", zIndex: 300 });
    const grid = await waitForElement(".display-grid-images");
    grid.appendChild(btn);

    btn.onclick = async () => {
        let img = null;
        grid.childNodes.forEach(c => {
            if (c.querySelector("img")) {
                img = c.querySelector("img");
            }
        });
        if (!img || !img.src) return alert("No image!");
        let ab;
        if (img.src.startsWith("blob")) {
            ab = await (await fetch(img.src)).arrayBuffer();
        } else {
            const bs = atob(img.src.split(",")[1]);
            ab = new ArrayBuffer(bs.length);
            const ia = new Uint8Array(ab); for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
        }
        const raw = extractPngMetadata(ab);
        if (!raw.Comment) return alert("No metadata.");
        const pd = buildPromptData(raw, JSON.parse(raw.Comment));
        showPromptOverlay(pd);
    };
}

/*****************  MODAL‑SPECIFIC BUTTON  *****************/
async function attachButtonToModal(modalRoot) {
    const imgDiv = await waitForElement(".line-background-overlay");
    if (!imgDiv || imgDiv.querySelector(".nai-inspect-btn")) return;
    imgDiv.style.position = "relative";
    const btn = createInspectButton();
    Object.assign(btn.style, { position: "absolute", top: "70px", right: "15px", zIndex: 9999 });
    btn.onclick = () => {
        // const bg = imgDiv.firstChild.nextSibling.firstChild.nextSibling.firstChild.style.backgroundImage;
        const bg = findBackgroundImage(imgDiv);
        if (!bg) return alert("No image!");
        const m = bg.match(/data:image\/png;base64,([^"')]+)/);
        if (!m) return alert("No PNG data.");
        const bs = atob(m[1]);
        const ab = new ArrayBuffer(bs.length);
        const ia = new Uint8Array(ab); for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
        let raw;
        try { raw = extractPngMetadata(ab); } catch (e) { return alert(e.message); }
        if (!raw.Comment) return alert("No Metadata.");
        const pd = buildPromptData(raw, JSON.parse(raw.Comment));
        showPromptOverlay(pd);
    };
    imgDiv.appendChild(btn);
}

function monitorMetadataModal() {
    const obs = new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                const el = n;
                if (el.innerText && (el.innerText.includes("This image has metadata!") || el.innerText.includes("この画像にはメタデータが含まれています！"))) attachButtonToModal(el);
            });
        });
    });
    obs.observe(document.body, { childList: true, subtree: true });
}

/*****************  INIT  *****************/
addGlobalPromptButton();
monitorMetadataModal();
