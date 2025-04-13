function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

function extractPngMetadata(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    let offset = 0;
    const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < signature.length; i++) {
        if (dataView.getUint8(i) !== signature[i]) {
            throw new Error("유효한 PNG 파일이 아닙니다.");
        }
    }
    offset += 8;
    const metadata = {};

    while (offset < dataView.byteLength) {
        if (offset + 8 > dataView.byteLength) break;
        const length = dataView.getUint32(offset);
        offset += 4;
        let chunkType = "";
        for (let i = 0; i < 4; i++) {
            chunkType += String.fromCharCode(dataView.getUint8(offset + i));
        }
        offset += 4;
        const chunkData = new Uint8Array(arrayBuffer, offset, length);
        offset += length;
        offset += 4;

        if (chunkType === "tEXt") {
            const nullIndex = chunkData.indexOf(0);
            if (nullIndex === -1) continue;
            const keywordBytes = chunkData.slice(0, nullIndex);
            const textBytes = chunkData.slice(nullIndex + 1);
            const keyword = new TextDecoder("ascii").decode(keywordBytes);
            const text = new TextDecoder("latin1").decode(textBytes);
            metadata[keyword] = text;
        }
        if (chunkType === "iTXt") {
            let pos = 0;
            const keywordEnd = chunkData.indexOf(0, pos);
            if (keywordEnd === -1) continue;
            const keyword = new TextDecoder("utf-8").decode(chunkData.slice(pos, keywordEnd));
            pos = keywordEnd + 1;
            const compressionFlag = chunkData[pos];
            pos += 1;
            pos += 1; // compression method
            const languageTagEnd = chunkData.indexOf(0, pos);
            if (languageTagEnd === -1) continue;
            pos = languageTagEnd + 1;
            const translatedKeywordEnd = chunkData.indexOf(0, pos);
            if (translatedKeywordEnd === -1) continue;
            pos = translatedKeywordEnd + 1;
            if (compressionFlag === 0) {
                const text = new TextDecoder("utf-8").decode(chunkData.slice(pos));
                metadata[keyword] = text;
            } else {
                metadata[keyword] = "[Compressed text not supported]";
            }
        }
    }
    return metadata;
}

const getMainImgPrompt = async () => {
    const mainImg = document.querySelector("div.sc-689ac2c0-25.cZBtyG img");
    if (!mainImg) return;
    const imageSrc = mainImg.src;
    if (!imageSrc) return;

    let pngMetadata = null;
    let pngMetadataRaw = null;

    if (!imageSrc.startsWith("blob")) {
        const byteString = atob(imageSrc.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        pngMetadataRaw = extractPngMetadata(ab);
        pngMetadata = pngMetadataRaw.Comment;
    } else {
        response = await fetch(imageSrc);
        ab = await response.arrayBuffer();
        pngMetadataRaw = extractPngMetadata(ab);
        pngMetadata = pngMetadataRaw.Comment;
    }

    const pngMetadataJson = JSON.parse(pngMetadata);

    const models = {
        "NovelAI Diffusion V4 79F47848": "NAI Diffusion V4 Full",
        "NovelAI Diffusion V4 C1CCBA86": "NAI Diffusion V4 Curated",
        "Stable Diffusion XL 7BCCAA2C": "NAI Diffusion Anime V3",
        "Stable Diffusion XL 37C2B166": "NAI Diffusion Furry V3",
        "Stable Diffusion F1022D28": "NAI Diffusion Anime V2",
    }

    let modelName = pngMetadataRaw.Source;
    if (!models[modelName]) {
        modelName += " (Legacy or Unknown Model)";
    } else {
        modelName += " (" + models[modelName] + ")";
    }

    const prompt = {
        prompt: pngMetadataJson.prompt,
        undesired_content: pngMetadataJson.uc,
        resolution: pngMetadataJson.width + "x" + pngMetadataJson.height,
        seed: pngMetadataJson.seed,
        sampler: pngMetadataJson.noise_schedule ? pngMetadataJson.sampler + " (" + pngMetadataJson.noise_schedule + ")" : pngMetadataJson.sampler,
        steps: pngMetadataJson.steps,
        prompt_guidance: pngMetadataJson.scale,
        prompt_guidance_rescale: pngMetadataJson.cfg_rescale,
        undesired_content_strength: pngMetadataJson.uncond_scale,
        requestType: pngMetadataJson.request_type,
        model: pngMetadataRaw.Source + " (" + models[pngMetadataRaw.Source] + ")",
    }

    if (prompt.requestType === "PromptGenerateRequest") {
        prompt.requestType = "Txt2ImgRequest";
    }

    if (pngMetadataJson.v4_prompt) {
        const char_prompts = [];
        for (let i = 0; i < pngMetadataJson.v4_prompt.caption.char_captions.length; i++) {
            char_prompts.push({
                prompt: pngMetadataJson.v4_prompt.caption.char_captions[i].char_caption,
                uc: pngMetadataJson.v4_negative_prompt.caption.char_captions[i].char_caption,
            });
        }
        prompt.characterPrompts = char_prompts;
    }

    return prompt;
}

async function addPromptButton() {
    const showPromptButton = document.createElement('button');
    showPromptButton.textContent = "i";
    showPromptButton.style.width = "20px";
    showPromptButton.style.height = "20px";
    showPromptButton.style.borderRadius = "50%";
    showPromptButton.style.backgroundColor = "#fff";
    showPromptButton.style.border = "1px solid #ccc";
    showPromptButton.style.fontSize = "20px";
    showPromptButton.style.fontWeight = "bold";
    showPromptButton.style.color = "#000";
    showPromptButton.style.cursor = "pointer";
    showPromptButton.style.opacity = "0.7";

    showPromptButton.style.position = "absolute";
    showPromptButton.style.top = "2px";
    showPromptButton.style.right = "10px";
    showPromptButton.style.zIndex = "9999";

    showPromptButton.style.display = "flex";
    showPromptButton.style.alignItems = "center";
    showPromptButton.style.justifyContent = "center";

    const imgContainer = await waitForElement(".display-grid-images");

    imgContainer.appendChild(showPromptButton);

    async function showPrompt() {
        const promptData = await getMainImgPrompt();
        if (!promptData) {
            alert("No image!");
            return;
        }

        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.zIndex = "10001";
        overlay.style.display = "flex";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";

        const contentBox = document.createElement("div");
        contentBox.style.position = "relative";
        contentBox.style.backgroundColor = "#12152c";
        contentBox.style.padding = "20px";
        contentBox.style.borderRadius = "10px";
        contentBox.style.maxWidth = "600px";
        contentBox.style.width = "80%";
        contentBox.style.maxHeight = "80%";
        contentBox.style.overflowY = "auto";
        contentBox.style.color = "#fff";
        contentBox.style.border = "2px solid #fff";

        const closeButton = document.createElement("div");
        closeButton.textContent = "×";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "23px";
        closeButton.style.fontSize = "38px";
        closeButton.style.fontWeight = "bold";
        closeButton.style.cursor = "pointer";

        closeButton.addEventListener("click", function () {
            document.body.removeChild(overlay);
        });

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.backdropFilter = "blur(5px)";

        let contentHTML =
            "<h1>NAI Inspect</h1>" +
            "<h2>Prompt</h2>" +
            "<p><strong>Prompt:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.prompt + "</span></p>" +
            "<p><strong>UC:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.undesired_content + "</span></p>";

        if (promptData.characterPrompts && promptData.characterPrompts.length > 0) {
            contentHTML += "<h4 style='opacity: 0.9;'>Character Prompt</h4>";
            promptData.characterPrompts.forEach(function (charPrompt, index) {
                if (index === 0) {
                    contentHTML += "<p><hr/></p>";
                }
                contentHTML +=
                    "<div style='margin-bottom:10px;'>" +
                    "<strong>Character " + (index + 1) + " Prompt:</strong> <span style='font-style: italic; opacity: 0.8;'>" + charPrompt.prompt + "</span><br/>" +
                    "<strong>Character " + (index + 1) + " UC:</strong> <span style='font-style: italic; opacity: 0.8;'>" + charPrompt.uc + "</span><br/>" +
                    "<p><hr/></p>" +
                    "</div>";
            });
        }

        contentHTML +=
            "<h2>Details</h2>" +
            "<strong>Model:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.model + "</span><br/>" +
            "<strong>Request Type:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.requestType + "</span><br/>" +
            "<strong>Resolution:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.resolution + "</span><br/>" +
            "<strong>Seed:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.seed + "</span><br/>" +
            "<strong>Sampler:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.sampler + "</span><br/>" +
            "<strong>Steps:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.steps + "</span><br/>" +
            "<strong>Prompt Guidance:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.prompt_guidance + "</span><br/>" +
            "<strong>Prompt Guidance Rescale:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.prompt_guidance_rescale + "</span><br/>" +
            "<strong>Undesired Content Strength:</strong> <span style='font-style: italic; opacity: 0.8;'>" + promptData.undesired_content_strength + "</span><br/>";

        contentBox.innerHTML = contentHTML;
        contentBox.appendChild(closeButton);

        overlay.appendChild(contentBox);
        document.body.appendChild(overlay);
    }

    showPromptButton.addEventListener("click", showPrompt);
}

addPromptButton();