# Auditoria de fórmulas e estimativas — ObraCalc

**Data:** 11/10/2026  
**Escopo:** fórmulas dos módulos de edificações, cálculos auxiliares, conversores, orçamento e o seletor **Elemento** no cálculo de concreto.

## Resultado geral

As fórmulas matemáticas analisadas passaram nos casos de referência descritos abaixo. Isso valida a consistência aritmética das expressões com os parâmetros informados; não certifica um projeto estrutural nem garante o consumo real de materiais de uma obra.

| Calculadora | Fórmula verificada | Resultado de referência | Situação |
|---|---|---|---|
| Área e perímetro | Retângulo: \(A=b\times h\); círculo: \(A=\pi r^2\); triângulo: \(A=bh/2\) | Retângulo 5×3 = 15 m² e perímetro 16 m; círculo r=5: 78,5398 m²; triângulo 4×3/2 = 6 m² | Validada |
| Volume de ambiente | \(V=C\times L\times H\) | 5×4×2,8 = 56 m³; piso 20 m²; paredes 50,4 m²; 56.000 L | Validada |
| Concreto | \(V=C\times L\times H\times quantidade\), depois margem de perda | Laje 6×4×0,12 m com 1 peça e 5% = 3,024 m³ | Validada; interface corrigida |
| Alvenaria | Área líquida × consumo por m² × (1 + perda/100), arredondando blocos para cima | Parede 6×2,8 m, aberturas 2,1 m², bloco 39×19 cm, junta 1 cm e perda 10% = 203 blocos | Validada como estimativa |
| Piso e revestimento | Área líquida × (1 + perda/100) ÷ cobertura por caixa | 17,5 m², 10% de perda e 2,2 m²/caixa = 9 caixas; 25 m², 10% e 2,5 m²/caixa = 11 caixas | Validada |
| Pintura | (perímetro × altura − aberturas) × demãos ÷ rendimento | Perímetro 18 m, altura 2,8 m, aberturas 3 m², 2 demãos e rendimento 10 m²/L = 9,48 L; latas de 3,6 L = 3 | Validada como estimativa |
| Argamassa e reboco | Área × espessura em mm ÷ 1.000, depois margem | 45 m² × 15 mm = 0,675 m³; com 10% = 0,7425 m³ (742,5 L) | Validada como volume teórico |
| Rampa e inclinação | Inclinação = desnível ÷ avanço × 100; ângulo = arctan(desnível/avanço); comprimento = hipotenusa | Desnível 0,6 m e avanço 8 m = 7,5%, cerca de 4,289° e 8,022 m de comprimento | Validada |
| Telhado | Área inclinada = comprimento × √(avanço² + altura²) × águas; telhas = área × consumo × perda | 8 m, avanço 4 m, altura 1,2 m, 2 águas, 10 telhas/m² e 10% = 735 telhas | Validada como estimativa |
| Escala de desenho | Medida real = medida no desenho × denominador | 4 cm na escala 1:50 = 200 cm = 2 m = 2.000 mm | Validada |

## Cálculos auxiliares também verificados

- **Regra de três direta:** \(X=(B\times C)/A\). Exemplo: A=4, B=12, C=7 → X=21.
- **Regra de três inversa:** \(X=(A\times B)/C\). Exemplo com A=4, B=12, C=7 → X≈6,8571.
- **Percentual:** valor × percentual ÷ 100. Exemplo: 12% de R$ 250 = R$ 30.
- **Calculadora científica:** foram conferidas a precedência do sinal negativo e da potência, potências associadas à direita, raiz quadrada e expressões inválidas. Exemplos: \(-2^2=-4\), \(2^3^2=512\), \(\sqrt{81}=9\).
- **Conversores:** comprimento, área, volume, massa, inclinação e escala passaram nos exemplos testados.
- **Orçamento preliminar:** subtotal de materiais + contingência calculada somente sobre materiais + mão de obra. Exemplo: R$ 32 em materiais, 10% de contingência e R$ 40 de mão de obra → R$ 75,20.

## Campo “Elemento” do concreto

O seletor agora diferencia **Laje**, **Viga**, **Pilar** e **Bloco prismático** na interpretação das dimensões:

- **Laje:** comprimento, largura e espessura.
- **Viga:** comprimento, largura e altura.
- **Pilar:** largura e profundidade da seção, mais altura do pilar.
- **Bloco prismático:** comprimento, largura e altura.

O elemento selecionado aparece no resultado e a fórmula exibida, copiada ou salva acompanha o tipo escolhido. Se as três dimensões ainda estiverem iguais ao exemplo padrão anterior, ao trocar o elemento a calculadora carrega dimensões de exemplo adequadas ao novo tipo. Dimensões que o usuário já personalizou são preservadas.

Exemplos padrão ao trocar o elemento: laje 6×4×0,12 m; viga 6×0,25×0,5 m; pilar 0,3×0,3×3 m; bloco prismático 1×1×1 m. São exemplos de cálculo, não dimensões de projeto recomendadas.

## Limites das estimativas de materiais

1. **Perdas:** os valores iniciais de 5% ou 10% são parâmetros editáveis de referência. A perda real varia com transporte, armazenamento, cortes, paginação, método de aplicação e execução; não existe um único percentual adequado para todas as obras.
2. **Alvenaria:** o consumo depende das dimensões reais do bloco, da junta, da modulação e dos cortes. A conta usa dimensões nominais do bloco mais junta para estimar unidades por área e desconta a área total informada de aberturas; não substitui a paginação da parede.
3. **Piso:** a cobertura por caixa deve ser copiada da embalagem e a perda ajustada ao padrão de assentamento e aos recortes.
4. **Pintura:** o rendimento informado deve ser o da ficha técnica do produto. A absorção, o estado da superfície, a cor de fundo e a aplicação alteram o consumo.
5. **Argamassa/reboco:** o resultado é volume geométrico teórico. Para converter em sacos, é necessário usar o rendimento específico declarado pelo fabricante e considerar a execução.
6. **Telhado:** telhas por m² variam conforme o modelo, a inclinação e a sobreposição. A estimativa não inclui automaticamente beirais, cumeeiras nem peças especiais além da margem informada.
7. **Concreto:** a conta presume peças prismáticas e dimensões constantes. Geometrias especiais, vazios, mudanças de seção, bombeamento e condições de execução precisam ser tratados separadamente. O resultado não dimensiona estrutura, armadura ou traço.

## Comportamento percentual da calculadora científica

O símbolo % continua representando o valor percentual literal convertido em decimal: 10% = 0,1; por isso, 200+10% = 200,1 e 200×10% = 20. Isso corresponde à regra implementada, mas difere do comportamento contextual de algumas calculadoras comuns (nas quais 200 + 10% pode significar 220). A interpretação não foi alterada nesta etapa para evitar escolher silenciosamente uma convenção de interface.

## Testes e alterações

- Foram adicionados testes de regressão para as fórmulas dos dez módulos, arredondamentos, estimativas de materiais, conversores, orçamento e rótulos/dimensões de cada elemento de concreto.
- Foram executadas **50 verificações independentes** contra o código atual; não houve divergências nos casos conferidos. Também foi verificada a sintaxe do JavaScript principal e do arquivo de testes.
- A validação aqui é matemática e de comportamento para os casos de teste. Antes de usar quantidades em uma obra real, confira medidas no local, fichas técnicas dos produtos, especificações do projeto e orientação de profissional habilitado.
