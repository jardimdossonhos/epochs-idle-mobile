const fs = require('fs');
let lines = fs.readFileSync('src/main.ts', 'utf8').split('\n');

function deleteBlock(searchString) {
    let start = lines.findIndex(l => l.includes(searchString));
    if (start === -1) return;
    let braces = 0;
    let end = start;
    let foundBrace = false;
    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        braces += (line.match(/\{/g) || []).length;
        braces -= (line.match(/\}/g) || []).length;
        braces += (line.match(/\(/g) || []).length;
        braces -= (line.match(/\)/g) || []).length;
        if ((line.match(/\{/g) || []).length > 0 || (line.match(/\(/g) || []).length > 0) foundBrace = true;
        if (foundBrace && braces === 0) {
            end = i;
            // if next line is }); maybe? Since we count () and {}, we should be fine.
            break;
        }
    }
    console.log('Deleting from ' + start + ' to ' + end + ' for ' + searchString);
    lines.splice(start, end - start + 1);
}

// Remove blocks by bracket matching
deleteBlock('function renderGovernmentInputs');
deleteBlock('function renderCouncil');
deleteBlock('function renderTechnologyTree');
deleteBlock('function renderTechnology');
deleteBlock('function isGovernmentInputFocused');
deleteBlock('function techDomainLabel');
deleteBlock('function techStatusLabel');
deleteBlock('ui.governmentApplyButton.addEventListener');
deleteBlock('ui.expansionAutomationSelect.addEventListener');
deleteBlock('ui.constructionAutomationSelect.addEventListener');
deleteBlock('ui.globalAutomationToggle.addEventListener');
deleteBlock('ui.techFocusSelect.addEventListener');
deleteBlock('ui.techAutomationSelect.addEventListener');
deleteBlock('ui.techHideCompletedToggle.addEventListener');
deleteBlock('ui.techClearGoalButton.addEventListener');
deleteBlock('ui.techApplyButton.addEventListener');

// Remove single lines
lines = lines.filter(l => !l.includes('const TECH_DOMAIN_ORDER'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Economy,'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Military,'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Administration,'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Religion,'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Logistics,'));
lines = lines.filter(l => !l.includes('TechnologyDomain.Engineering'));
lines = lines.filter(l => !l.includes('let isGovernmentFormDirty = false;'));
lines = lines.filter(l => !l.includes('let hideCompletedTechnologies = true;'));
lines = lines.filter(l => !l.includes('let lastCandidatePoolHash ='));
lines = lines.filter(l => !l.includes('const governmentInputs = ['));
lines = lines.filter(l => !l.includes('ui.taxInputs.baseRate,'));
lines = lines.filter(l => !l.includes('ui.taxInputs.nobleRelief,'));
lines = lines.filter(l => !l.includes('ui.taxInputs.clergyExemption,'));
lines = lines.filter(l => !l.includes('ui.taxInputs.tariffRate,'));
lines = lines.filter(l => !l.includes('ui.budgetInputs.economy,'));
lines = lines.filter(l => !l.includes('ui.budgetInputs.military,'));
lines = lines.filter(l => !l.includes('ui.budgetInputs.religion,'));
lines = lines.filter(l => !l.includes('ui.budgetInputs.administration,'));
lines = lines.filter(l => !l.includes('ui.budgetInputs.technology,'));

// Remove render calls from renderState
lines = lines.filter(l => !l.includes('renderCouncil(state);'));
lines = lines.filter(l => !l.includes('renderGovernmentInputs(state);'));
lines = lines.filter(l => !l.includes('renderTechnology(state);'));

// Remove residual bracket from array definition
lines = lines.filter(l => l.trim() !== '];');

fs.writeFileSync('src/main.ts', lines.join('\n'));
console.log('Cleanup complete');

