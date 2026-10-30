/**
 * tools/build-questions.mjs
 * Converts source question bank (XLSX or JSON) into normalised practice/data/questions.json.
 * Assigns groupId by prompt text if missing, standardises schema, and runs validation.
 *
 * Usage:
 *   node tools/build-questions.mjs [input-file.xlsx|json] [output-file.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateQuestionBank } from './validate-data.mjs';

function parseAnswerIndex(val) {
  if (typeof val === 'number') return Math.floor(val);
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (trimmed === 'A' || trimmed === '0') return 0;
    if (trimmed === 'B' || trimmed === '1') return 1;
    if (trimmed === 'C' || trimmed === '2') return 2;
    if (trimmed === 'D' || trimmed === '3') return 3;
    const num = parseInt(trimmed, 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 3) return num;
  }
  return null;
}

function normalizeItem(raw, index, promptToGroup) {
  const prompt = String(raw.prompt || raw.Question || raw.question || '').trim();
  const section = String(raw.section || raw.Section || '').trim();
  const topic = String(raw.topic || raw.Topic || '').trim();
  const skill = String(raw.skill || raw.Skill || '').trim();
  const difficulty = String(raw.difficulty || raw.Difficulty || 'Easy/Moderate').trim();
  const type = String(raw.type || raw.Type || 'mcq').trim();
  const rationale = String(raw.rationale || raw.Rationale || raw.explanation || '').trim();
  const hint = String(raw.hint || raw.Hint || '').trim();
  const status = String(raw.status || raw.Status || 'draft').trim();

  // Assign or preserve groupId
  let groupId = raw.groupId || raw.group_id;
  if (!groupId) {
    if (!promptToGroup.has(prompt)) {
      const groupNum = String(promptToGroup.size + 1).padStart(3, '0');
      promptToGroup.set(prompt, `G${groupNum}`);
    }
    groupId = promptToGroup.get(prompt);
  }

  const id = raw.id || `AN-${String(index + 1).padStart(4, '0')}`;

  const item = {
    id,
    groupId,
    section,
    topic,
    skill,
    difficulty,
    type,
    prompt,
    rationale,
    hint,
    status
  };

  if (type === 'mcq') {
    let options = raw.options;
    if (!Array.isArray(options)) {
      const optA = raw.option_a ?? raw.optionA ?? raw.optA ?? raw['Option A'] ?? raw.option1;
      const optB = raw.option_b ?? raw.optionB ?? raw.optB ?? raw['Option B'] ?? raw.option2;
      const optC = raw.option_c ?? raw.optionC ?? raw.optC ?? raw['Option C'] ?? raw.option3;
      const optD = raw.option_d ?? raw.optionD ?? raw.optD ?? raw['Option D'] ?? raw.option4;
      options = [optA, optB, optC, optD];
    }
    item.options = options.map(o => String(o ?? '').trim());
    item.answerIndex = parseAnswerIndex(raw.answerIndex ?? raw.answer_index ?? raw.AnswerKey ?? raw.answer);
  } else {
    // Open / reflective types
    const rubricMax = raw.rubricMax ?? raw.rubric_max ?? raw['Rubric Max'] ?? 3;
    item.rubricMax = parseInt(rubricMax, 10) || 3;
    item.scored = false;
  }

  return item;
}

async function build() {
  const args = process.argv.slice(2);
  const inputArg = args[0];
  const outputArg = args[1] || 'practice/data/questions.json';

  let inputFile = inputArg;
  if (!inputFile) {
    const candidates = [
      'reference/data/ACE_NEET_1000_Question_Bank.xlsx',
      'reference/ACE_NEET_1000_Question_Bank.xlsx',
      'reference/data/questions.json',
      'reference/questions.json',
      'practice/data/questions.json'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        inputFile = c;
        break;
      }
    }
  }

  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('Error: No input question bank found.');
    console.error('Provide a path to an XLSX or JSON file: node tools/build-questions.mjs <file>');
    process.exit(1);
  }

  console.log(`Building question bank from: ${inputFile}`);
  let rawItems = [];

  const ext = path.extname(inputFile).toLowerCase();
  if (ext === '.json') {
    const text = fs.readFileSync(inputFile, 'utf8');
    rawItems = JSON.parse(text);
  } else if (ext === '.xlsx' || ext === '.xls') {
    let xlsx;
    try {
      xlsx = await import('xlsx');
    } catch {
      console.error('Error: The "xlsx" package is required to parse Excel files.');
      console.error('Please install it in development: npm install xlsx --save-dev');
      process.exit(1);
    }
    const workbook = xlsx.readFile(inputFile);
    const sheetName = workbook.SheetNames.includes('Question Bank')
      ? 'Question Bank'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rawItems = xlsx.utils.sheet_to_json(sheet);
  } else {
    console.error(`Unsupported file extension: ${ext}`);
    process.exit(1);
  }

  console.log(`Loaded ${rawItems.length} raw entries. Normalising schema...`);

  const promptToGroup = new Map();
  const normalized = rawItems.map((raw, idx) => normalizeItem(raw, idx, promptToGroup));

  // Run validation
  const validation = validateQuestionBank(normalized);
  if (!validation.valid) {
    console.error(`Validation failed with ${validation.errors.length} error(s):`);
    for (const err of validation.errors.slice(0, 10)) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputArg);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputArg, JSON.stringify(normalized, null, 2), 'utf8');
  console.log(`✓ Successfully built and validated ${normalized.length} questions.`);
  console.log(`✓ Output saved to: ${outputArg} (${fs.statSync(outputArg).size} bytes)`);
  console.log(`  - Unique groups: ${validation.summary.uniqueGroups}`);
}

build().catch(err => {
  console.error('Build failed with unexpected error:', err);
  process.exit(1);
});

