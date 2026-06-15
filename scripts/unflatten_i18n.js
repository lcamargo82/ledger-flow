const fs = require('fs');
const path = require('path');

function unflatten(data) {
  if (Object(data) !== data || Array.isArray(data)) return data;
  const result = {};
  for (let p in data) {
    let keys = p.split('.');
    keys.reduce((acc, key, index) => {
      if (index === keys.length - 1) {
        acc[key] = data[p];
      } else {
        acc[key] = acc[key] || {};
      }
      return acc[key];
    }, result);
  }
  return result;
}

const ptBrPath = path.join(__dirname, '../apps/web/src/locales/pt-BR.json');
const enUsPath = path.join(__dirname, '../apps/web/src/locales/en-US.json');

const ptBrData = JSON.parse(fs.readFileSync(ptBrPath, 'utf8'));
const enUsData = JSON.parse(fs.readFileSync(enUsPath, 'utf8'));

fs.writeFileSync(ptBrPath, JSON.stringify(unflatten(ptBrData), null, 2));
fs.writeFileSync(enUsPath, JSON.stringify(unflatten(enUsData), null, 2));
console.log('Unflattening complete!');
