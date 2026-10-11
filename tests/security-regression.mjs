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
const safeNum = v => {
  if (String(v ?? '').trim() === '') return NaN;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

test('M1: sinal negativo precisa ter precedência inferior à potência', () => {
  const cases = [
    ['-2^2', -4],
    ['(-2)^2', 4],
    ['-2^-2', -0.25],
    ['-(2+1)^2', -9],
    ['-3^2+10', 1],
    ['2^-2', 0.25],
    ['2^3^2', 512],
    ['2*-3', -6],
    ['--2', 2],
    ['-(2+3)', -5]
  ];
  for (const [expression, expected] of cases) {
    assert.equal(evalExpr(expression), expected, expression);
  }
});

function createWireSciHarness(initial = {}, keyNames = []) {
  const values = {
    rA: '', rB: '', rC: '', rType: 'direct',
    pBase: '', pRate: '',
    rOut: '—', rStatus: 'mesma unidade de B', rFormula: 'X = (B × C) ÷ A',
    pOut: '—', pStatus: 'unidades',
    sciDisplay: '0',
    ...initial
  };
  const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [
    id, { value: String(value), textContent: String(value), addEventListener(type, callback) { handlers[id] = callback; } }
  ]));
  const handlers = {};
  const keys = keyNames.map(key => ({
    dataset: { key }, onclick: null
  }));
  const document = { querySelectorAll(selector) { return selector === '[data-key]' ? keys : []; } };
  const $ = selector => elements[selector.replace(/^#/, '')];
  const state = { expression: '', sciAns: null };
  const wireSciSource = extractFunction(html, 'function wireSci(){', "document.addEventListener('keydown'");
  const wireSci = vm.runInNewContext(`${wireSciSource}; wireSci`, {
    $, document, state, safeNum,
    fmt: (n) => Number.isFinite(n) ? String(n) : '—',
    toast: () => {},
    evalExpr
  });
  wireSci();
  return { elements, handlers, keys, state };
}

test('M2: regra de três rejeita campos vazios e divisões inválidas com mensagens', () => {
  const ui = createWireSciHarness();
  assert.equal(ui.elements.rStatus.textContent, 'Preencha A, B e C.');
  assert.equal(ui.elements.pStatus.textContent, 'Preencha o valor base e o percentual.');

  ui.elements.rA.value = '0';
  ui.elements.rB.value = '12';
  ui.elements.rC.value = '7';
  ui.handlers.rA();
  assert.equal(ui.elements.rStatus.textContent, 'Na proporção direta, A não pode ser zero.');

  ui.elements.rType.value = 'inverse';
  ui.handlers.rType();
  assert.equal(ui.elements.rStatus.textContent, 'Na proporção inversa, A não pode ser zero.');

  ui.elements.rA.value = '4';
  ui.elements.rC.value = '0';
  ui.handlers.rA();
  assert.equal(ui.elements.rStatus.textContent, 'Na proporção inversa, C não pode ser zero.');

  ui.elements.rA.value = '4';
  ui.elements.rB.value = '12';
  ui.elements.rC.value = '7';
  ui.handlers.rA();
  assert.equal(Number(ui.elements.rOut.textContent), 48 / 7);
  assert.equal(ui.elements.rStatus.textContent, 'mesma unidade de B');

  ui.elements.rType.value = 'direct';
  ui.handlers.rType();
  assert.equal(Number(ui.elements.rOut.textContent), 21);

  ui.elements.pBase.value = '250';
  ui.elements.pRate.value = '12';
  ui.handlers.pBase();
  assert.equal(Number(ui.elements.pOut.textContent), 30);
  assert.equal(ui.elements.pStatus.textContent, 'unidades');
});

test('M1: resultado negativo entre parênteses ao continuar a conta', () => {
  const ui = createWireSciHarness({ rA: '4', rB: '12', rC: '7', pBase: '250', pRate: '12' }, ['=', '^', '2']);
  ui.state.expression = '-2^2';
  ui.keys.find(k => k.dataset.key === '=').onclick();
  assert.equal(ui.state.expression, '(-4)');
  ui.keys.find(k => k.dataset.key === '^').onclick();
  ui.keys.find(k => k.dataset.key === '2').onclick();
  ui.keys.find(k => k.dataset.key === '=').onclick();
  assert.equal(ui.state.expression, '16');
});

test('calculadora científica: expressões básicas e precedência', () => {
  assert.equal(evalExpr('2+2'), 4);
  assert.equal(evalExpr('2*(3+4)'), 14);
  assert.equal(evalExpr('2^3^2'), 512);
  assert.equal(evalExpr('sqrt(81)'), 9);
  assert.equal(evalExpr('50%'), 0.5);
  assert.equal(evalExpr('200+10%'), 200.1);
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

test('tema mobile inicia claro, respeita preferência, evita escurecimento forçado e usa botão no cabeçalho', () => {
  assert.ok(html.includes("const storedTheme=storage.get('obc-theme',null)"));
  assert.ok(html.includes("const explicitTheme=storage.get('obc-theme-choice',false)===true"));
  assert.ok(html.includes("const isMobileViewport=window.matchMedia?window.matchMedia('(max-width: 760px)').matches:window.innerWidth<=760"));
  assert.ok(html.includes("const initialTheme=explicitTheme?(storedTheme==='light'?'light':'dark'):(isMobileViewport?'light':(storedTheme==='light'?'light':'dark'))"));
  assert.ok(html.includes("storage.set('obc-theme-choice',true)"));
  assert.ok(html.includes('class="theme-toggle theme-toggle-desktop" id="themeToggleDesktop" aria-label='));
  assert.ok(html.includes('.theme-toggle-desktop{display:inline-flex!important;position:static'));
  assert.ok(html.includes("document.documentElement.style.colorScheme=light?'only light':'dark'"));
  assert.ok(html.includes("document.body.style.colorScheme=light?'only light':'dark'"));
  assert.ok(html.includes('body.light-theme{color-scheme:only light}'));
  assert.ok(html.includes("$('#bottomNav').innerHTML=mobileItems;"));
  assert.doesNotMatch(html, /theme-toggle-mobile/);
});

test('M4: o rótulo da calculadora não promete funções trigonométricas ausentes', () => {
  assert.ok(html.includes('ARITMÉTICA / π / RAIZ / %'));
  assert.doesNotMatch(html, /RAD \/ GRAUS nas funções trigonométricas/);
});

test('fundo claro mobile usa degradê opaco e uniforme', () => {
  assert.ok(html.includes('body.light-theme{'));
  assert.ok(html.includes('@media(max-width:760px){\n  body.light-theme{'));
  assert.ok(html.includes('background:linear-gradient(135deg,#f7fbf5 0%,#f2f9ed 52%,#e8f6dc 100%) !important;'));
  assert.ok(html.includes('background-color:#f7fbf5 !important;'));
  assert.ok(html.includes('background-attachment:scroll;'));
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

test('M6: arredondamento de blocos, caixas, latas e telhas não adiciona unidades por ruído numérico', () => {
  const ceilSafe = x => Math.ceil(Math.round(x * 1e9) / 1e9);
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: value => String(value),
    ceilSafe,
    Math,
    Number
  });
  const byId = id => modules.find(module => module.id === id);

  const floor = byId('floor');
  assert.equal(floor.calc({l:5,w:3.5,op:0,box:2.2,waste:10}).main, 9);
  assert.equal(floor.calc({l:5,w:5,op:0,box:2.5,waste:10}).main, 11);

  const masonry = byId('masonry');
  assert.equal(masonry.calc({l:6,h:2.8,op:2.1,bl:39,bh:19,joint:1,waste:10}).main, 203);

  const paint = byId('paint');
  const paintResult = paint.calc({p:18,h:2.8,op:3,coats:2,yield:10,can:3.6});
  assert.equal(paintResult.main, 9.48);
  assert.equal(paintResult.rows.find(row => row[0] === 'Latas estimadas')[1], 3);

  const roof = byId('roof');
  assert.equal(roof.calc({l:8,run:4,rise:1.2,sides:2,rate:10,waste:10}).main, 735);

  assert.match(html, /const ceilSafe=x=>Math\.ceil\(Math\.round\(x\*1e9\)\/1e9\)/);
  assert.equal((html.match(/ceilSafe\(/g) || []).length, 4);
});


test('todas as calculadoras retornam resultados finitos com valores padrão', () => {
  assert.ok(moduleSource.startsWith('const modules=['), 'Definições de módulos não encontradas');
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: (value) => {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Resultado não finito');
      return String(value);
    },
    ceilSafe: x => Math.ceil(Math.round(x * 1e9) / 1e9)
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


test('fórmulas geométricas: área, perímetro, triângulo, círculo e ambiente', () => {
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: value => String(value),
    ceilSafe: x => Math.ceil(Math.round(x * 1e9) / 1e9),
    Math, Number
  });
  const byId = id => modules.find(module => module.id === id);

  const area = byId('area');
  assert.equal(area.calc({shape:'rect',a:5,b:3}).main, 15);
  assert.equal(area.calc({shape:'rect',a:5,b:3}).rows.find(row => row[0] === 'Perímetro')[1], 16);
  assert.ok(Math.abs(area.calc({shape:'circ',a:5}).main - Math.PI * 25) < 1e-12);
  assert.equal(area.calc({shape:'tri',a:4,b:3,c:4,d:4}).main, 6);
  assert.equal(area.calc({shape:'tri',a:4,b:3,c:4,d:4}).rows[0][1], 12);
  assert.throws(() => area.calc({shape:'tri',a:10,b:3,c:2,d:2}), /não formam um triângulo/);

  const volume = byId('volume').calc({l:5,w:4,h:2.8});
  assert.equal(volume.main, 56);
  assert.equal(volume.rows.find(row => row[0] === 'Área do piso')[1], 20);
  assert.equal(volume.rows.find(row => row[0] === 'Área total das paredes')[1], 50.4);
  assert.equal(volume.rows.find(row => row[0] === 'Capacidade equivalente')[1], 56000);
});

test('volume de concreto: laje, viga, pilar, perdas e rótulos do elemento', () => {
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: value => String(value),
    ceilSafe: x => Math.ceil(Math.round(x * 1e9) / 1e9),
    Math, Number
  });
  const concrete = modules.find(module => module.id === 'concrete');
  const slab = concrete.calc({shape:'slab',l:6,w:4,h:0.12,q:1,waste:5});
  assert.ok(Math.abs(slab.main - 3.024) < 1e-12);
  assert.equal(slab.rows.find(row => row[0] === 'Volume geométrico')[1], 2.88);
  assert.equal(slab.rows.find(row => row[0] === 'Volume total em litros')[1], 3024);
  assert.equal(slab.rows.find(row => row[0] === 'Elemento')[1], 'Laje');

  const beam = concrete.calc({shape:'beam',l:5,w:0.2,h:0.4,q:3,waste:0});
  assert.ok(Math.abs(beam.main - 1.2) < 1e-12);
  assert.equal(beam.rows.find(row => row[0] === 'Elemento')[1], 'Viga');
  const column = concrete.calc({shape:'column',l:0.3,w:0.4,h:3,q:4,waste:0});
  assert.ok(Math.abs(column.main - 1.44) < 1e-12);
  assert.equal(column.rows.find(row => row[0] === 'Elemento')[1], 'Pilar');

  assert.match(concrete.formulaFor({shape:'slab'}), /espessura/);
  assert.match(concrete.formulaFor({shape:'beam'}), /comprimento da viga/);
  assert.match(concrete.formulaFor({shape:'column'}), /seção.*pilar/);

  const labelsSource = extractFunction(html, 'function concreteFieldLabel(shape,id){', 'function moduleFieldLabel(');
  const concreteFieldLabel = vm.runInNewContext(labelsSource + '; concreteFieldLabel', {});
  assert.equal(concreteFieldLabel('slab','h'), 'Espessura da laje');
  assert.equal(concreteFieldLabel('beam','h'), 'Altura da viga');
  assert.equal(concreteFieldLabel('column','l'), 'Largura da seção do pilar');
  assert.equal(concreteFieldLabel('column','w'), 'Profundidade da seção do pilar');
  assert.equal(concreteFieldLabel('custom','h'), 'Altura');
  const defaultsSource = extractFunction(html, 'function concreteDimensionDefaults(shape){', 'function moduleFieldLabel(');
  const concreteDimensionDefaults = vm.runInNewContext(defaultsSource + '; concreteDimensionDefaults', {});
  assert.equal(concreteDimensionDefaults('slab').h, 0.12);
  assert.equal(concreteDimensionDefaults('beam').w, 0.25);
  assert.equal(concreteDimensionDefaults('beam').h, 0.5);
  assert.equal(concreteDimensionDefaults('column').l, 0.3);
  assert.equal(concreteDimensionDefaults('column').h, 3);
  assert.equal(concreteDimensionDefaults('custom').l, 1);
});

test('estimativas de blocos, piso, tinta, argamassa e telhado', () => {
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: value => String(value),
    ceilSafe: x => Math.ceil(Math.round(x * 1e9) / 1e9),
    Math, Number
  });
  const byId = id => modules.find(module => module.id === id);

  const masonry = byId('masonry');
  const wall = masonry.calc({l:6,h:2.8,op:2.1,bl:39,bh:19,joint:1,waste:10});
  assert.equal(wall.main, 203);
  assert.ok(Math.abs(wall.rows.find(row => row[0] === 'Área líquida')[1] - 14.7) < 1e-12);
  assert.throws(() => masonry.calc({l:6,h:2.8,op:16.8,bl:39,bh:19,joint:1,waste:10}), /aberturas/);

  const floor = byId('floor');
  assert.equal(floor.calc({l:5,w:3.5,op:0,box:2.2,waste:10}).main, 9);
  assert.equal(floor.calc({l:5,w:5,op:0,box:2.5,waste:10}).main, 11);
  assert.throws(() => floor.calc({l:5,w:5,op:25,box:2.5,waste:10}), /descontar/);

  const paint = byId('paint').calc({p:18,h:2.8,op:3,coats:2,yield:10,can:3.6});
  assert.ok(Math.abs(paint.main - 9.48) < 1e-12);
  assert.equal(paint.rows.find(row => row[0] === 'Latas estimadas')[1], 3);

  const mortar = byId('mortar').calc({a:45,t:15,waste:10});
  assert.ok(Math.abs(mortar.main - 0.7425) < 1e-12);
  assert.ok(Math.abs(mortar.rows.find(row => row[0] === 'Equivalente aproximado')[1] - 742.5) < 1e-12);

  const roof = byId('roof').calc({l:8,run:4,rise:1.2,sides:2,rate:10,waste:10});
  assert.equal(roof.main, 735);
  assert.ok(Math.abs(roof.rows.find(row => row[0] === 'Área inclinada total')[1] - 8 * Math.hypot(4,1.2) * 2) < 1e-12);
});

test('rampa e escala: fórmulas e conversões geométricas', () => {
  const modules = vm.runInNewContext(moduleSource + '; modules', {
    fmt: value => String(value),
    ceilSafe: x => Math.ceil(Math.round(x * 1e9) / 1e9),
    Math, Number
  });
  const ramp = modules.find(module => module.id === 'ramp').calc({rise:0.6,run:8});
  assert.equal(ramp.main, 7.5);
  assert.ok(Math.abs(ramp.rows.find(row => row[0] === 'Ângulo')[1] - Math.atan(0.6/8)*180/Math.PI) < 1e-12);
  assert.ok(Math.abs(ramp.rows.find(row => row[0] === 'Comprimento inclinado')[1] - Math.hypot(0.6,8)) < 1e-12);

  const scale = modules.find(module => module.id === 'scale').calc({n:4,scale:50});
  assert.equal(scale.main, 2);
  assert.equal(scale.rows.find(row => row[0] === 'Medida real')[1], 200);
  assert.equal(scale.rows[2][1], 2000); // centímetros reais convertidos em milímetros
  assert.equal(scale.rows[2][2], 'mm');
});

test('orçamento preliminar: contingência incide só sobre materiais e soma mão de obra', () => {
  const budgetSource = extractFunction(html, 'function budgetTotal(){', 'function budgetPage(){');
  const state = {
    budgetRows: [
      {name:'Blocos',qty:2,price:10},
      {name:'Argamassa',qty:3,price:4}
    ],
    cont:10,
    labor:40
  };
  const budgetTotal = vm.runInNewContext(budgetSource + '; budgetTotal', {state, Number});
  assert.ok(Math.abs(budgetTotal() - 75.2) < 1e-12);
});

test('conversores: comprimento, área, volume, massa, inclinação e escala', () => {
  const converterCode = html.slice(html.indexOf('function converterNumber('), html.indexOf('function sciPage()')) + '; renderConverters';
  const elements = {
    lenVal:{value:'250',valueAsNumber:250}, lenUnit:{value:'cm'},
    areaVal:{value:'12.5',valueAsNumber:12.5},
    volVal:{value:'1.2',valueAsNumber:1.2},
    massVal:{value:'1250',valueAsNumber:1250},
    sRise:{value:'0.5',valueAsNumber:0.5}, sRun:{value:'5',valueAsNumber:5},
    scaleVal:{value:'3.2',valueAsNumber:3.2}, scaleDen:{value:'50'}
  };
  for (const id of ['lenOut','areaOut','volOut','massOut','slopeOut','scaleOut']) elements[id]={innerHTML:''};
  const render = vm.runInNewContext(converterCode, {
    $: selector => elements[selector.slice(1)],
    esc: value => String(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),
    fmt: value => { if (!Number.isFinite(value)) throw new Error('Resultado inválido'); return String(Number(value.toFixed(5))); },
    Number, Math, Error
  });
  render();
  assert.match(elements.lenOut.innerHTML, /2500 mm/);
  assert.match(elements.lenOut.innerHTML, /2.5 m/);
  assert.match(elements.areaOut.innerHTML, /125000 cm²/);
  assert.match(elements.areaOut.innerHTML, /0.00125 ha/);
  assert.match(elements.volOut.innerHTML, /1200 L/);
  assert.match(elements.volOut.innerHTML, /1200000 cm³/);
  assert.match(elements.massOut.innerHTML, /1250000 g/);
  assert.match(elements.massOut.innerHTML, /1.25 t/);
  assert.match(elements.slopeOut.innerHTML, /10 %/);
  assert.match(elements.scaleOut.innerHTML, /1.6/);
});
