import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Não encontrei ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Não encontrei o fim ${startMarker}`);
  return source.slice(start, end).trim();
}

const parserSource = extractFunction(html, 'function evalExpr(s){', 'function guide(){');
const evalExpr = vm.runInNewContext(`${parserSource}; evalExpr`, {});

test('calculadora científica: expressões básicas e precedência', () => {
  assert.equal(evalExpr('2+2'), 4);
  assert.equal(evalExpr('2*(3+4)'), 14);
  assert.equal(evalExpr('2^3^2'), 512);
  assert.equal(evalExpr('sqrt(81)'), 9);
  assert.equal(evalExpr('50%'), 0.5);
  assert.equal(evalExpr('1,5+2'), 3.5);
});

test('calculadora científica: rejeita entradas maliciosas e inválidas', () => {
  assert.throws(() => evalExpr('alert(1)'), /Expressão inválida/);
  assert.throws(() => evalExpr('1/0'), /Divisão por zero/);
  assert.throws(() => evalExpr('sqrt(-1)'), /Raiz de número negativo/);
  assert.throws(() => evalExpr('1e309'), /Valor inválido|Expressão inválida/);
  assert.throws(() => evalExpr('('), /Parênteses não fechados|Expressão inválida|Valor inválido/);
  assert.throws(() => evalExpr('1+'.padEnd(161, '1')), /muito longa/);
  assert.throws(() => evalExpr(Array(45).fill('1').join('+')), /complexa demais|Expressão inválida/);
});

test('calculadora científica: nunca devolve NaN ou infinito', () => {
  for (const input of ['0/0', '2^1024', 'sqrt(-9)', '1e309']) {
    assert.throws(() => {
      const result = evalExpr(input);
      assert.ok(Number.isFinite(result));
    });
  }
});

test('HTML tem políticas de segurança e não carrega scripts externos', () => {
  assert.match(html, /http-equiv="Content-Security-Policy"/i);
  assert.match(html, /name="referrer" content="strict-origin-when-cross-origin"/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(html, /\beval\s*\(/);
  assert.doesNotMatch(html, /new\s+Function\s*\(/);
  assert.doesNotMatch(html, /javascript\s*:/i);
});

test('dados locais têm limite de tamanho e o histórico é validado', () => {
  assert.match(html, /raw\.length>100000/);
  assert.match(html, /raw\.length<=100000/);
  assert.match(html, /function hist\(\).*Array\.isArray\(raw\)/);
  assert.match(html, /slice\(0,250\)/);
  assert.match(html, /typeof x\.title==='string'/);
});

test('valores dinâmicos dos resultados são escapados antes de inserir HTML', () => {
  assert.match(html, /function fmtResult\(r\).*esc\(r\.label\)/);
  assert.match(html, /esc\(r\.unit\)/);
  assert.match(html, /esc\(a\[0\]\)/);
  assert.match(html, /esc\(a\[2\]\|\|''\)/);
  assert.match(html, /esc\(n\)/);
});

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
test('JavaScript completo compila sem erro de sintaxe', () => {
  assert.ok(scriptMatch, 'Script principal não encontrado');
  assert.doesNotThrow(() => new vm.Script(scriptMatch[1]));
});

test('dicas de obra são curtas, variadas e mantêm o layout compacto', () => {
  const match = html.match(/const safetyTips=(\[[\s\S]*?\]);\s*function dailyTipIndex/);
  assert.ok(match, 'Lista de dicas não encontrada');
  const tips = JSON.parse(match[1]);
  assert.ok(tips.length >= 30, 'Esperadas pelo menos 30 dicas');
  for (const tip of tips) {
    assert.ok(tip.title.length <= 45, `Título muito longo: ${tip.title}`);
    assert.ok(tip.text.length <= 150, `Dica muito longa: ${tip.text}`);
  }
  assert.match(html, /id="nextTip"/);
  assert.match(html, /state\.tipIndex=\(state\.tipIndex\+1\)%safetyTips\.length/);
});

test('recursos de qualidade de vida estão presentes', () => {
  assert.match(html, /data-favorite/);
  assert.match(html, /obc-favorites/);
  assert.match(html, /function favoritesHTML/);
  assert.match(html, /function recentHTML/);
  assert.match(html, /obc-recent/);
  assert.match(html, /obc-form-/);
  assert.match(html, /ev\.key==='Enter'/);
  assert.match(html, /ev\.key==='Escape'/);
  assert.match(html, /ev\.key==='\/'/);
});
