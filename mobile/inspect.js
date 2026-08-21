const fs = require('fs');

function fixMojibake(str) {
    // Regex matches 2 to 4 characters in the range \x80-\xFF.
    // Specifically, matching the UTF-8 start bytes and continuation bytes.
    // 2 bytes: C2-DF followed by 80-BF
    // 3 bytes: E0-EF followed by two 80-BF
    // 4 bytes: F0-F4 followed by three 80-BF
    const regex = /([\xc2-\xdf][\x80-\xbf])|([\xe0-\xef][\x80-\xbf]{2})|([\xf0-\xf4][\x80-\xbf]{3})/g;
    
    return str.replace(regex, (match) => {
        try {
            return Buffer.from(match, 'latin1').toString('utf8');
        } catch (e) {
            return match;
        }
    });
}

const code = fs.readFileSync('src/application/game-session.ts', 'utf8');
const index = code.indexOf("liberada");
const chunk = code.substring(index - 15, index + 10);
console.log("Original:", chunk);
console.log("Fixed:", fixMojibake(chunk));

const chunk2 = "▶ SimulaÃ§Ã£o";
console.log("Original2:", chunk2);
console.log("Fixed2:", fixMojibake(chunk2));