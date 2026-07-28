const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/core/simulation/systems');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('context.events.push({')) {
    if (!content.includes('import { buildEvent }')) {
      content = 'import { buildEvent } from "../../ecs/event-pool";\n' + content;
    }
    // Very greedy regex to match the whole context.events.push({ ... }) block
    let newContent = content.replace(/context\.events\.push\(\{([\s\S]*?)occurredAt:\s*context\.now\s*\}\);/g, (match, body) => {
       // Extract fields
       const typeMatch = body.match(/type:\s*(['"][\w\.]+['"])/);
       const payloadMatch = body.match(/payload:\s*(\{[\s\S]*?\}|[\w\.]+),/);
       const actorMatch = body.match(/actorKingdomId:\s*([\w\.]+),/);
       const targetMatch = body.match(/targetKingdomId:\s*([\w\.]+),/);
       const prefixMatch = body.match(/prefix:\s*(['"]\w+['"])/);
       const sysIdMatch = body.match(/systemId:\s*(['"]\w+['"])/);
       const actIdMatch = body.match(/actorId:\s*([\w\.]+),/);
       
       if (!typeMatch || !payloadMatch) return match; // fallback
       
       const type = typeMatch[1];
       const payload = payloadMatch[1];
       const actor = actorMatch ? actorMatch[1] : (actIdMatch ? actIdMatch[1] : 'undefined');
       const target = targetMatch ? targetMatch[1] : 'undefined';
       const prefix = prefixMatch ? prefixMatch[1] : '"evt"';
       const sysId = sysIdMatch ? sysIdMatch[1] : '"sys"';
       const actId = actIdMatch ? actIdMatch[1] : actor;

       return 'const evt = buildEvent(' + type + ', context.now, ' + payload + ', ' + actor + ', ' + target + ');\n          if (evt) {\n            evt.id = createEventId({ prefix: ' + prefix + ', tick: context.nextState.meta.tick, systemId: ' + sysId + ', actorId: ' + actId + ', sequence: eventSeq++ });\n            context.events.push(evt);\n          }';
    });
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
}
console.log('Done');
