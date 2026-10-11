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

test('tema mobile inicia claro sem preferência manual e respeita escolha do usuário', () => {
  assert.match(html, /const storedTheme=storage\.get\('obc-theme',null\)/);
  assert.match(html, /const explicitTheme=storage\.get\('obc-theme-choice',false\)===true/);
  assert.match(html, /const isMobileViewport=window\.matchMedia\?window\.matchMedia\('\(max-width: 760px\)'\)\.matches:window\.innerWidth<=760/);
  assert.match(html, /const initialTheme=explicitTheme\?\(storedTheme==='light'\?'light':'dark'\):\(isMobileViewport\?'light':\(storedTheme==='light'\?'light':'dark'\)\)/);
  assert.match(html, /storage\.set\('obc-theme-choice',true\)/);
  assert.match(html, /class="theme-toggle theme-toggle-mobile"/);
  assert.match(html, /\.bottom-nav \.theme-toggle-mobile\{[^}]*position:static!important/);
  assert.match(html, /body\.light-theme\{color-scheme:light\}/);
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

const moduleSource = html.slice(html.indexOf('const modules=['), html.indexOf('const navItems='));
test('todas as calculadoras retornam resultados finitos com valores padrão', () => {
  assert.ok(moduleSource.startsWith('const modules=['), 'Definições de módulos não encontradas');
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: (value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Resultado não finito');
      return String(value);
    }
  });
  assert.ok(modules.length >= 10, 'Esperadas calculadoras de edificações');
  for (const module of modules) {
    const values = Object.fromEntries(module.fields.map(field => [field.id, field.v ?? (field.kind === 'select' ? field.options[0][0] : 1)]));
    const result = module.calc(values);
    assert.ok(result && result.main !== undefined, module.name + ': resultado principal ausente');
    if (typeof result.main === 'number') assert.ok(Number.isFinite(result.main), module.name + ': resultado não finito');
    assert.ok(result.unit, module.name + ': unidade ausente');
  }
});

test('conversores rejeitam negativos, campos vazios e valores fora do limite', () => {
  const start = html.indexOf('function converterNumber(');
  const end = html.indexOf('function sciPage()', start);
  assert.ok(start >= 0 && end > start, 'Funções de conversão não encontradas');
  const converterCode = html.slice(start, end) + '; renderConverters';
  const elements = {
    lenVal: {value:'250', valueAsNumber:250}, lenUnit:{value:'cm'},
    areaVal:{value:'12.5',valueAsNumber:12.5}, volVal:{value:'1.2',valueAsNumber:1.2},
    massVal:{value:'1250',valueAsNumber:1250}, sRise:{value:'0.5',valueAsNumber:0.5},
    sRun:{value:'5',valueAsNumber:5}, scaleVal:{value:'3.2',valueAsNumber:3.2},
    scaleDen:{value:'50'}
  };
  for (const id of ['lenOut','areaOut','volOut','massOut','slopeOut','scaleOut']) elements[id]={innerHTML:''};
  const render = vm.runInNewContext(converterCode, {
    $: (selector) => elements[selector.slice(1)],
    esc: (value) => String(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),
    fmt: (value) => { if (!Number.isFinite(value)) throw new Error('Resultado inválido'); return String(Number(value.toFixed(5))); },
    Number, Math, Error
  });
  render();
  assert.match(elements.areaOut.innerHTML, /12\.5/);
  assert.match(elements.scaleOut.innerHTML, /1:50/);
  elements.areaVal.value='-2'; elements.areaVal.valueAsNumber=-2;
  render();
  assert.match(elements.areaOut.innerHTML, /não pode ser menor que 0/);
  assert.doesNotMatch(elements.areaOut.innerHTML, /NaN|Infinity/);
  elements.areaVal.value=''; elements.areaVal.valueAsNumber=NaN;
  render();
  assert.match(elements.areaOut.innerHTML, /valor numérico válido/);
  elements.areaVal.value='12.5'; elements.areaVal.valueAsNumber=12.5;
  elements.sRun.value='0'; elements.sRun.valueAsNumber=0;
  render();
  assert.match(elements.slopeOut.innerHTML, /deve ser maior que 0/);
  assert.doesNotMatch(elements.slopeOut.innerHTML, /NaN|Infinity/);
});

test('os campos dos conversores têm limites coerentes', () => {
  for (const id of ['lenVal','areaVal','volVal','massVal','sRise','scaleVal']) {
    const re = new RegExp('<input id="' + id + '"[^>]*min="0"');
    assert.match(html, re, id + ' deve impedir valores negativos pela interface');
  }
  assert.match(html, /id="sRun"[^>]*min="0\.0001"/);
});

test('revisão ortográfica básica mantém os rótulos e dicas corrigidos', () => {
  assert.match(html, /Armazene o piso corretamente/);
  assert.match(html, /Conversores de unidades/);
  assert.match(html, /Dica de obra/);
  assert.doesNotMatch(html, /Armazene o piso direito/);
});
