import { setTimeout } from 'node:timers/promises';

export async function upscaleImage(imageBuffer, options = {}) {
  const {
    denoise = '3',
    format = 'JPEG',
    type = 'ANIME',
    scale = 'true'
  } = options;

  const ua = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Mobile Safari/537.36';
  const baseHeaders = {
    'User-Agent': ua,
    'sec-ch-ua-platform': '"Android"',
    'sec-ch-ua': '"Chromium";v="148", "Android WebView";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'origin': 'https://waifu2x.pro',
    'x-requested-with': 'com.xbrowser.play',
    'referer': 'https://waifu2x.pro/'
  };

  const data = new FormData();
  data.append('denoise', denoise);
  data.append('format', format);
  data.append('type', type);
  data.append('scale', scale);
  data.append('file', new Blob([imageBuffer]), 'image.jpg');

  const uploadRes = await fetch('https://api.waifu2x.pro/api/v1/upscale', {
    method: 'POST',
    headers: baseHeaders,
    body: data
  });

  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
  const { hash } = await uploadRes.json();

  let isFinished = false;
  while (!isFinished) {
    await setTimeout(500);
    const checkRes = await fetch(`https://api.waifu2x.pro/api/v1/check?hash=${hash}`, {
      headers: baseHeaders
    });
    
    if (!checkRes.ok) throw new Error(`Check failed: ${checkRes.status}`);
    const checkData = await checkRes.json();
    isFinished = checkData.isFinished;
  }

  const downloadRes = await fetch(`https://api.waifu2x.pro/api/v1/get?hash=${hash}&format=${format}`, {
    headers: baseHeaders
  });

  if (!downloadRes.ok) throw new Error(`Download failed: ${downloadRes.status}`);
  return Buffer.from(await downloadRes.arrayBuffer());
}

import fs from 'node:fs/promises';
//import { upscaleImage } from './waifu2x.js';

async function main() {
  try {
    console.log('Membaca gambar ke dalam Buffer...');
    // Membaca file gambar lokal menjadi Buffer
    const inputBuffer = await fs.readFile('./foto.jpg');

    console.log('Sedang memproses upscale di waifu2x (tunggu beberapa detik)...');
    // Memasukkan Buffer ke fungsi dan menerima balasan berupa Buffer juga
    const outputBuffer = await upscaleImage(inputBuffer, {
      denoise: '3',
      scale: 'true',
      type: 'ANIME',
      format: 'JPEG'
    });

    console.log('Menyimpan hasil Buffer ke file baru...');
    // Menulis Buffer hasil upscale ke file baru
    await fs.writeFile('./gambar_hd.jpg', outputBuffer);
    
    console.log('Selesai! Gambar berhasil diperbesar.');
  } catch (error) {
    console.error('Terjadi kesalahan:', error.message);
  }
}

main();