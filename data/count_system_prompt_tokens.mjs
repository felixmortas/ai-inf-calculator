#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { Tiktoken } from 'js-tiktoken/lite';
import o200kBase from 'js-tiktoken/ranks/o200k_base';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const dataDir = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(dataDir, 'raw/ikp_closedModels_params.csv');
const outputPath = resolve(dataDir, 'raw/closedModels_systemPromptUrl.csv');

// Minimal CSV reader supporting quoted fields and escaped double quotes.
function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV invalide : guillemet non fermé.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rawGitHubUrl(url) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  return match ? `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}` : url;
}

const csv = await readFile(inputPath, 'utf8');
const [headers, ...rows] = parseCsv(csv);
const modelColumn = headers.indexOf('model');
const urlColumn = headers.indexOf('systel_prompt_url');
if (modelColumn < 0 || urlColumn < 0) {
  throw new Error('Colonnes attendues absentes du CSV : model, systel_prompt_url.');
}

const encoder = new Tiktoken(o200kBase);
const output = [['model', 'system_prompt_url', 'system_prompt_token_count']];
try {
  for (const row of rows) {
    if (row.length === 1 && row[0] === '') continue;
    const model = row[modelColumn]?.trim();
    const url = row[urlColumn]?.trim();
    if (!model) throw new Error(`Modèle manquant dans la ligne ${output.length}.`);
    if (!url) {
      output.push([model, '', '']);
      console.log(`${model}: URL absente, comptage ignoré`);
      continue;
    }
    const response = await fetch(rawGitHubUrl(url));
    if (response.status === 404) {
      output.push([model, url, '']);
      console.log(`${model}: fichier introuvable (404), comptage ignoré`);
      continue;
    }
    if (!response.ok) throw new Error(`Téléchargement impossible pour ${model} (${response.status}) : ${url}`);
    const prompt = await response.text();
    output.push([model, url, String(encoder.encode(prompt).length)]);
    console.log(`${model}: ${output.at(-1)[2]} tokens`);
  }
} finally {
  encoder.free?.();
}

await writeFile(outputPath, `${output.map((row) => row.map(csvCell).join(',')).join('\n')}\n`);
console.log(`CSV créé : ${outputPath}`);
