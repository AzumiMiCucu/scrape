import crypto from 'crypto';

async function getGofileData(urlInput) {
  const ua = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Mobile Safari/537.36';
  const lang = 'id-ID';
  
  let contentId = urlInput;
  try {
    const url = new URL(urlInput);
    const pathParts = url.pathname.split('/');
    contentId = pathParts[pathParts.length - 1] || urlInput;
  } catch (_) {}

  const accountResponse = await fetch('https://api.gofile.io/accounts', {
    method: 'POST',
    headers: {
      'sec-ch-ua-platform': '"macOS"',
      'user-agent': ua,
      'accept': '*/*',
      'origin': 'https://gofile.io',
      'referer': 'https://gofile.io/',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-length': '0'
    }
  });

  if (!accountResponse.ok) throw new Error(`Account HTTP Error: ${accountResponse.status}`);
  const accountResult = await accountResponse.json();
  if (accountResult.status !== 'ok' || !accountResult.data?.token) throw new Error('Failed to get account token');
  const accountToken = accountResult.data.token;

  const timeBlock = Math.floor(Date.now() / 1000 / 14400).toString();
  const rawString = `${ua}::${lang}::${accountToken}::${timeBlock}::g4f8fd9f12h14g`;
  const websiteToken = crypto.createHash('sha256').update(rawString).digest('hex');

  const queryParams = new URLSearchParams({
    contentFilter: '',
    page: '1',
    pageSize: '1000',
    sortField: 'name',
    sortDirection: '1'
  });

  const contentResponse = await fetch(`https://api.gofile.io/contents/${contentId}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'sec-ch-ua-platform': '"macOS"',
      'authorization': `Bearer ${accountToken}`,
      'x-bl': lang,
      'x-website-token': websiteToken,
      'user-agent': ua,
      'accept': '*/*',
      'origin': 'https://gofile.io',
      'referer': 'https://gofile.io/',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  if (!contentResponse.ok) throw new Error(`Content HTTP Error: ${contentResponse.status}`);
  const result = await contentResponse.json();

  result.download = async function (fileIdOrName) {
    const children = result.data?.children || {};
    const keys = Object.keys(children);
    if (keys.length === 0) throw new Error('No files found to download');

    let target = children[keys[0]];
    if (fileIdOrName) {
      if (children[fileIdOrName]) {
        target = children[fileIdOrName];
      } else {
        const found = Object.values(children).find(f => f.name === fileIdOrName);
        if (found) target = found;
      }
    }

    const dlResponse = await fetch(target.link, {
      method: 'GET',
      headers: {
        'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="140", "Google Chrome";v="140"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'upgrade-insecure-requests': '1',
        'user-agent': ua,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'x-requested-with': 'com.xbrowser.play',
        'sec-fetch-site': 'same-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'referer': 'https://gofile.io/',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cookie': `accountToken=${accountToken}`
      }
    });

    if (!dlResponse.ok) throw new Error(`Download HTTP Error: ${dlResponse.status}`);
    return Buffer.from(await dlResponse.arrayBuffer());
  };

  return result;
}

/*
import fs from 'fs/promises';

let json = await getGofileData("https://gofile.io/d/aGMRMz");

let buffer = await json.download(); 

await fs.writeFile('Theresa_acapella.zip', buffer);
*/