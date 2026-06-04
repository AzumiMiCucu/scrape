export class SfileScraper {
    constructor(cookieString = "") {
        this.cookieString = cookieString;
        this.userAgent = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36';
    }

    _mergeCookies(oldCookies, setCookieHeaders) {
        if (!setCookieHeaders || setCookieHeaders.length === 0) return oldCookies;

        const cookieMap = {};
        
        oldCookies.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts[0]) cookieMap[parts[0]] = parts.slice(1).join('=');
        });

        setCookieHeaders.forEach(cookieStr => {
            const cleanCookie = cookieStr.split(';')[0].trim();
            const parts = cleanCookie.split('=');
            if (parts[0]) cookieMap[parts[0]] = parts.slice(1).join('=');
        });

        return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    async fetchDirectDownload(targetUrl) {
        try {
            const resHalamanUtama = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cookie': this.cookieString,
                    'x-requested-with': 'XBrowser'
                }
            });

            if (!resHalamanUtama.ok) throw new Error(`Gagal akses halaman utama: ${resHalamanUtama.status}`);
            const htmlUtama = await resHalamanUtama.text();

            const setCookieStep1 = resHalamanUtama.headers.getSetCookie 
                ? resHalamanUtama.headers.getSetCookie() 
                : (resHalamanUtama.headers.get('set-cookie') ? [resHalamanUtama.headers.get('set-cookie')] : []);
            
            const updatedCookies = this._mergeCookies(this.cookieString, setCookieStep1);

            const intermediaryUrlMatch = htmlUtama.match(/data-dw-url="([^"]+)"/i);
            if (!intermediaryUrlMatch) throw new Error("Gagal menemukan tautan unduhan tengah (data-dw-url).");
            const intermediaryUrl = intermediaryUrlMatch[1];

            const titleMatch = htmlUtama.match(/<h1[^>]*class="[^"]*truncate[^"]*"[^>]*>([^<]+)<\/h1>/i);
            const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

            const mimeMatch = htmlUtama.match(/<span class="text-sm text-slate-600">(application\/[^<]+)<\/span>/i);
            const mimeType = mimeMatch ? mimeMatch[1].trim() : "Unknown";

            const authorMatch = htmlUtama.match(/href="https:\/\/sfile\.co\/user\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
            const author = authorMatch ? { id: authorMatch[1], name: authorMatch[2].trim() } : { id: "Unknown", name: "Unknown" };

            const categoryMatch = htmlUtama.match(/href="https:\/\/sfile\.co\/category\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
            const category = categoryMatch ? categoryMatch[2].trim() : "Unknown";

            const dateMatch = htmlUtama.match(/Uploaded:\s*<span[^>]*>([^<]+)<\/span>/i);
            const uploadDate = dateMatch ? dateMatch[1].trim() : "Unknown";

            const downloadsMatch = htmlUtama.match(/Downloads:\s*<span[^>]*>([^<]+)<\/span>/i);
            const downloads = downloadsMatch ? downloadsMatch[1].trim() : "0";

            await new Promise(resolve => setTimeout(resolve, 1000));

            const resHalamanTengah = await fetch(intermediaryUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cookie': updatedCookies,
                    'Referer': targetUrl,
                    'x-requested-with': 'com.x.browser.x5'
                }
            });

            if (!resHalamanTengah.ok) throw new Error(`Gagal akses halaman download tengah: ${resHalamanTengah.status}`);
            const htmlTengah = await resHalamanTengah.text();

            if (htmlTengah.includes("Expired Download Link")) {
                throw new Error("Server Sfile mendeteksi token kedaluwarsa. Periksa kembali validitas awal PHPSESSID Anda.");
            }

            const sizeMatch = htmlTengah.match(/<p[^>]*class="[^"]*text-white\/90[^"]*"[^>]*>\s*([^<\n\r]+)\s*<\/p>/i);
            const size = sizeMatch ? sizeMatch[1].trim() : "Unknown Size";

            let finalCdnUrl = "";
            const jsUrlMatch = htmlTengah.match(/https?:\\\/\\\/[a-zA-Z0-9.-]+\.sfile\.co\\\/downloadfile\\[^"]+/i);
            
            if (jsUrlMatch) {
                finalCdnUrl = jsUrlMatch[0].replace(/\\/g, '');
            } else {
                const fallbackMatch = htmlTengah.match(/data-direct-download="([^"]+)"/i);
                if (fallbackMatch) {
                    finalCdnUrl = fallbackMatch[1].replace(/&amp;/g, '&');
                }
            }

            if (!finalCdnUrl) throw new Error("Gagal mengekstrak Direct URL CDN akhir.");

            return {
                success: true,
                meta: {
                    title,
                    size,
                    mime_type: mimeType,
                    author,
                    category,
                    upload_date: uploadDate,
                    downloads,
                    sfile_id: targetUrl.split('/').pop()
                },
                links: {
                    landing_page: targetUrl,
                    direct_cdn_link: finalCdnUrl
                }
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

async function run() {
    const myCookies = "PHPSESSID=5vj4k1c1u15ia0ptt5eaq1b6nt; _pid=b96a42d6be1aea7afe4875396bb617a2;";
    const scraper = new SfileScraper();
    
    console.log("Sedang memproses bypass tautan sfile...");
    const result = await scraper.fetchDirectDownload("https://sfile.co/WDr5Gxw26mY");
    
    console.log("=== HASIL EKSTRAKSI ===");
    console.log(JSON.stringify(result, null, 2));
}

run();
/*async function downloadSfile(targetUrl, cookieString = "") {
    const userAgent = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36';

    function mergeCookies(oldCookies, setCookieHeaders) {
        if (!setCookieHeaders || setCookieHeaders.length === 0) return oldCookies;

        const cookieMap = {};
        
        oldCookies.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts[0]) cookieMap[parts[0]] = parts.slice(1).join('=');
        });

        setCookieHeaders.forEach(cookieStr => {
            const cleanCookie = cookieStr.split(';')[0].trim();
            const parts = cleanCookie.split('=');
            if (parts[0]) cookieMap[parts[0]] = parts.slice(1).join('=');
        });

        return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    try {
        const resMain = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent,
   'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': cookieString,
                'x-requested-with': 'XBrowser'
            }
        });

        if (!resMain.ok) throw new Error(`Failed to access main page: ${resMain.status}`);
        const htmlMain = await resMain.text();

        const setCookieStep1 = resMain.headers.getSetCookie 
            ? resMain.headers.getSetCookie() 
            : (resMain.headers.get('set-cookie') ? [resMain.headers.get('set-cookie')] : []);
        
        const updatedCookies = mergeCookies(cookieString, setCookieStep1);

        const intermediaryUrlMatch = htmlMain.match(/data-dw-url="([^"]+)"/i);
        if (!intermediaryUrlMatch) throw new Error("Failed to find intermediary download link (data-dw-url).");
        const intermediaryUrl = intermediaryUrlMatch[1];

        const titleMatch = htmlMain.match(/<h1[^>]*class="[^"]*truncate[^"]*"[^>]*>([^<]+)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

        const mimeMatch = htmlMain.match(/<span class="text-sm text-slate-600">(application\/[^<]+)<\/span>/i);
        const mimeType = mimeMatch ? mimeMatch[1].trim() : "Unknown";

        const authorMatch = htmlMain.match(/href="https:\/\/sfile\.co\/user\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
        const author = authorMatch ? { id: authorMatch[1], name: authorMatch[2].trim() } : { id: "Unknown", name: "Unknown" };

        const categoryMatch = htmlMain.match(/href="https:\/\/sfile\.co\/category\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
        const category = categoryMatch ? categoryMatch[2].trim() : "Unknown";

        const dateMatch = htmlMain.match(/Uploaded:\s*<span[^>]*>([^<]+)<\/span>/i);
        const uploadDate = dateMatch ? dateMatch[1].trim() : "Unknown";

        const downloadsMatch = htmlMain.match(/Downloads:\s*<span[^>]*>([^<]+)<\/span>/i);
        const downloads = downloadsMatch ? downloadsMatch[1].trim() : "0";

        await new Promise(resolve => setTimeout(resolve, 1000));

        const resIntermediary = await fetch(intermediaryUrl, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent,
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cookie': updatedCookies,
                'Referer': targetUrl,
                'x-requested-with': 'com.x.browser.x5'
            }
        });

        if (!resIntermediary.ok) throw new Error(`Failed to access intermediary page: ${resIntermediary.status}`);
        const htmlIntermediary = await resIntermediary.text();

        if (htmlIntermediary.includes("Expired Download Link")) {
            throw new Error("Server detected an expired token. Please verify your initial PHPSESSID cookie.");
        }

        const sizeMatch = htmlIntermediary.match(/<p[^>]*class="[^"]*text-white\/90[^"]*"[^>]*>\s*([^<\n\r]+)\s*<\/p>/i);
        const size = sizeMatch ? sizeMatch[1].trim() : "Unknown Size";

        let finalCdnUrl = "";
        const jsUrlMatch = htmlIntermediary.match(/https?:\\\/\\\/[a-zA-Z0-9.-]+\.sfile\.co\\\/downloadfile\\[^"]+/i);
        
        if (jsUrlMatch) {
            finalCdnUrl = jsUrlMatch[0].replace(/\\/g, '');
        } else {
            const fallbackMatch = htmlIntermediary.match(/data-direct-download="([^"]+)"/i);
            if (fallbackMatch) {
                finalCdnUrl = fallbackMatch[1].replace(/&amp;/g, '&');
            }
        }

        if (!finalCdnUrl) throw new Error("Failed to extract final direct CDN URL.");

        return {
            success: true,
            meta: {
                title,
                size,
                mime_type: mimeType,
                author,
                category,
                upload_date: uploadDate,
                downloads,
                sfile_id: targetUrl.split('/').pop()
            },
            links: {
                landing_page: targetUrl,
                direct_cdn_link: finalCdnUrl
            }
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function run() {
    const myCookies = "PHPSESSID=5vj4k1c1u15ia0ptt5eaq1b6nt; _pid=b96a42d6be1aea7afe4875396bb617a2;";
    
    console.log("Processing Sfile link bypass...");
    const result = await downloadSfile("https://sfile.co/9WnHcKzxxFy");
    
    console.log("=== EXTRACTION RESULT ===");
    console.log(JSON.stringify(result, null, 2));
}

run();*/