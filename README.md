# Inspect button on NovelAI UI
Simply adds an inspect button on the top right of NovelAI image generation UI.  
NAIの画像生成UIの右上に、シンプルにInspectボタンを追加します。  

![ss1](https://github.com/user-attachments/assets/b7228ec5-c282-47fb-8390-9b4f4665de67)
![image](https://github.com/user-attachments/assets/88d68195-5e4d-4bb7-a6fe-08a58aaed0fb)
![ss2](https://github.com/user-attachments/assets/42261123-b15c-4026-9761-964b21053f83)


## When using with my NAI wildcards extension
While using [NAI wildcards](https://github.com/david419kr/wildcards-for-novelai-diffusion), it was sometime so confusing "which prompt is adapted now?", so I wanted to make inspect easier.  
[ワイルドカード拡張機能](https://github.com/david419kr/wildcards-for-novelai-diffusion)を使っていると、「今どのPromptが適用されたんだ？」と感じることがありました。で、ワンクリックでInspectできるようにしました。

## How to install
**1. Prepare the Files**  
[Download the ZIP](https://github.com/david419kr/nai_easy-inspect/archive/refs/heads/main.zip) and extract the archive.  
Make sure manifest.json is visible directly inside the extracted folder—not nested in another sub‑folder.  

[ZIPをDL](https://github.com/david419kr/nai_easy-inspect/archive/refs/heads/main.zip)して、解凍してください。   
解凍されたフォルダーを開けてすぐ、manifest.jsonが見える状態であることを確認してください。（フォルダーの中にまたサブフォルダーがある状態ではないこと）  

**2. Chrome Settings**  
In the address bar, type chrome://extensions and press Enter. 
Toggle Developer mode (top‑right corner) to ON.  
Load the unpacked extension above.  
You should now see “NovelAI easy inspect” in the list, with a toggle switch on.  

Chromeのアドレスバーに、chrome://extensionsと入力し、拡張機能設定に入ります。  
右上のデベロッパーモードをONにします。  
上で解凍したフォルダーを読み込みます。  
"NovelAI easy inspect"がリストに現れる筈です。スイッチがONになっていることを確認してください。  
  
That's it!  
Just make sure you refresh novelai.net page before first using the extension, if novelai.net is already open.  

これで準備OKです！  
拡張機能を入れてから初回起動時のみ、念のためNAIのページを一回リロードしてから使ってください。
