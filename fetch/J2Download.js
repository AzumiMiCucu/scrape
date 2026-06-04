
/*
AIO DOWNLOADER
*/
import crypto from 'node:crypto';

class J2Downloader {
    constructor() {
        this.baseUrl = 'https://j2download.com';
        this.userAgent = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/134.0.6998.135 Mobile Safari/537.36';
    }
    
    getRandomIp() {
        const r = () => Math.floor(Math.random() * 254) + 1;
        return `${r()}.${r()}.${r()}.${r()}`;
    }

    hasLeadingZeroNibbles(bytes, difficulty) {
        const fullBytes = Math.floor(difficulty / 2);
        const hasHalfByte = (difficulty & 1) === 1;
        for (let i = 0; i < fullBytes; i++) {
            if (bytes[i] !== 0) return false;
        }
        return !(hasHalfByte && (bytes[fullBytes] & 0xF0) !== 0);
    }

    deriveAltChallenge(challenge, nonce, solution) {
        const text = `pow:alt:${challenge}:${nonce}:${solution}`;
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    solveSinglePow(challengeType, challenge, nonce, difficulty) {
        const prefix = challengeType === 'alt' ? `pow:${nonce}:` : `pow:${challenge}:`;
        const suffix = challengeType === 'alt' ? `:${challenge}` : `:${nonce}:${challenge.length}`;
        for (let n = 0; n < 100000000; n++) {
            const text = prefix + n + suffix;
            const hash = crypto.createHash('sha256').update(text).digest();
            if (this.hasLeadingZeroNibbles(hash, difficulty)) return String(n);
        }
        return null;
    }

    generatePowSolution(challenge, nonce, difficulty, challengeType = 'classic') {
        const first = this.solveSinglePow(challengeType, challenge, nonce, difficulty);
        if (!first) return null;
        if (challengeType !== 'alt') return first;
        const secondChallenge = this.deriveAltChallenge(challenge, nonce, first);
        const second = this.solveSinglePow(challengeType, secondChallenge, nonce, difficulty);
        return second ? `${first}.${second}` : null;
    }

    async autoGetJwtAndSession(ip) {
        const homeRes = await fetch(`${this.baseUrl}/id`, {
            headers: { 
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        if (!homeRes.ok) throw new Error(`HTTP ${homeRes.status}`);

        const rawSetCookie = homeRes.headers.get('set-cookie') || '';
        const sessionMatch = rawSetCookie.match(/session=([^;]+)/);
        if (!sessionMatch) throw new Error("Session tidak ditemukan");
        const sessionCookie = sessionMatch[1];
        
        const htmlText = await homeRes.text();
        const bootstrapMatch = htmlText.match(/window\.__BOOTSTRAP__\s*=\s*(\{.*?\})/s);
        if (!bootstrapMatch) throw new Error("Bootstrap tidak ditemukan");
        const { nonce, powChallenge, powDifficulty, challengeType } = JSON.parse(bootstrapMatch[1]);

        const powSolution = this.generatePowSolution(powChallenge, nonce, powDifficulty, challengeType || 'classic');
        if (!powSolution) throw new Error("Gagal PoW");

        const authRes = await fetch(`${this.baseUrl}/api/auth/issue`, {
            method: 'POST',
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`, 
                'x-page-nonce': nonce,
                'x-pow-solution': powSolution,
                'X-Forwarded-For': ip,
                'X-Real-IP': ip,
                'Client-IP': ip
            },
            body: '' 
        });

        if (!authRes.ok) throw new Error(`Auth HTTP ${authRes.status}`);
        const authData = await authRes.json();
        
        return { jwtToken: authData.accessToken, sessionCookie };
    }

    async download(targetUrl) {
        if (!targetUrl || typeof targetUrl !== 'string') {
            throw new Error("URL salah");
        }
        
        const ip = this.getRandomIp();
        const { jwtToken, sessionCookie } = await this.autoGetJwtAndSession(ip);

        const res = await fetch(`${this.baseUrl}/api/autolink`, {
            method: 'POST',
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`,
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`,
            },
            body: JSON.stringify({
                data: {
                    url: targetUrl,
                    unlock: true
                }
            })
        });

        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`HTTP ${res.status} - ${errTxt}`);
        }

        return await res.json();
    }
}

/*
//CONTOH PENGGUNAAN
    
try {
     const downloader = new J2Downloader();
     const url = "https://vt.tiktok.com/ZS9aQJXjQ/"; //AIO Downloader sir not only tiktok
     const hasil = await downloader.download(url);
     console.log(JSON.stringify(hasil, null, 2));
    } catch (err) {
     console.error(err);
}
*/