const fs = require('fs');
const path = require('path');

function fixMojibake(str) {
    const regex = /([\xc2-\xdf][\x80-\xbf])|([\xe0-\xef][\x80-\xbf]{2})|([\xf0-\xf4][\x80-\xbf]{3})/g;
    return str.replace(regex, (match) => {
        try {
            return Buffer.from(match, 'latin1').toString('utf8');
        } catch (e) {
            return match;
        }
    });
}

function walkSync(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkSync(filepath, callback);
        } else {
            callback(filepath);
        }
    });
}

let fixedCount = 0;
walkSync('src', (filepath) => {
    if (!filepath.endsWith('.ts') && !filepath.endsWith('.tsx') && !filepath.endsWith('.json')) return;
    const content = fs.readFileSync(filepath, 'utf8');
    const fixed = fixMojibake(content);
    if (fixed !== content) {
        fs.writeFileSync(filepath, fixed, 'utf8');
        fixedCount++;
        console.log("Fixed:", filepath);
    }
});
console.log("Total files fixed:", fixedCount);