/*
SEARCH TEMPLATE CAPCUT
 */
 
async function searchTemplates(query, count = 20) {
  const url = 'https://edit-api-sg.capcut.com/lv/v1/cc_web/replicate/search_templates';

  const payload = JSON.stringify({
    "sdk_version": "86.0.0",
    "count": parseInt(count),
    "cursor": "0",
    "enter_from": "workspace",
    "query": query,
    "scene": 1,
    "search_version": 2,
    "cc_web_version": 0
  });

  const options = {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Content-Type': 'application/json',
      'appid': '348188',
      'sec-ch-ua-platform': '"macOS"',
      'device-time': '1704116611',
      'sec-ch-ua': '"Not A;Brand";v="99", "Chromium";v="140", "Google Chrome";v="140"',
      'sec-ch-ua-mobile': '?0',
      'store-country-code': 'id',
      'loc': 'sg',
      'sign-ver': '1',
      'app-sdk-version': '48.0.0',
      'appvr': '5.8.0',
      'store-country-code-src': 'uid',
      'sign': '6edde988911c68544a053e83f0e3b814',
      'lan': 'id-ID',
      'pf': '7',
      'Origin': 'https://www.capcut.com',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Referer': 'https://www.capcut.com/',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    body: payload
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

/*
//CONTOH IMPLEMENTASI

try {
  const data = await searchTemplates('jj anime');
  console.log(JSON.stringify(data, null, 2)); //organic raw json
} catch (err) {
  console.error(err);
}
*/