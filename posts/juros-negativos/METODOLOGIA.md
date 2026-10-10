# Metodologia

Como os dados foram obtidos e tratados, como as contas são feitas, o que cada régua mede e onde as escolhas podem
favorecer ou prejudicar a tese do texto analisado. Os números citados nos notebooks são os da execução de outubro de
2026 (dados do Brasil até agosto de 2026).

O texto analisado é ["O Juro é negativo após 2008"](https://amoedo.substack.com/p/o-juro-e-negativo-apos-2008), de
Renato Amoedo (Trezoitão), de 24/10/2022.

## 1. Fontes e tratamento

Cada fonte tem um módulo em `src/juro_negativo/fontes/`, com uma função que baixa o arquivo bruto para `data/raw` e
outra que o lê. Todas as taxas ficam em fração (0,5% é `0.005`), todas as datas mensais ficam no primeiro dia do
mês e os saldos, em bilhões de reais.

| Fonte | O que entra | Observações |
|---|---|---|
| **Banco Central** (SGS) | Selic (4390) e CDI (4391) acumulados no mês, IPCA (433), meta da Selic (432), dólar PTAX de fim de mês (3696) e médio (3698), base monetária (1788), M1 (27791), M2 (27810), M3 (27813), M4 (27815), PIB nominal de 12 meses (4382), salário mínimo (1619) e índice de imóveis IVG-R (21340) | Lido pelo serviço SOAP do SGS. A API REST (`api.bcb.gov.br`) não resolvia DNS quando o projeto foi feito |
| **B3** | Fechamento diário do Ibovespa desde 1994 | Índice de retorno total. O endereço não é documentado pela B3, então as respostas brutas ficam versionadas. A série vem nos pontos de cada época; os valores anteriores às duas divisões por 10 (10/02/1994 e 03/03/1997) são trazidos para a escala atual |
| **Tesouro Nacional** | Taxa de compra do Tesouro IPCA+ (sem juros semestrais) | Média entre os vencimentos de cada dia e entre os dias de cada mês |
| **Banco Mundial** | Ouro (Pink Sheet, média mensal em Londres, US$ por onça); fecundidade, população por idade e razão de dependência (base de projeções, que segue a ONU, até 2050); PIB em dólares e em reais constantes | O endereço da planilha do ouro muda de tempos em tempos: o leitor procura o atual na página de commodities |
| **Federal Reserve** | M1 e M2 (H.6, com ajuste sazonal), base monetária e papel-moeda em circulação (H.6, sem ajuste), juro básico efetivo e título de 10 anos indexado à inflação (H.15) | Pacotes completos do *Data Download Program*. **O Fed avisou que vai desativar esse serviço**; por isso os dois pacotes ficam versionados. A alternativa é o FRED (séries `M1SL`, `M2SL`, `FEDFUNDS`, `DFII10`), que não respondia da máquina em que o projeto foi feito |
| **BIS** | Juro básico e índice de preços ao consumidor de 17 países, mensais | Bases completas *Central bank policy rates* e *Consumer prices* |
| **S&P 500** | Preço médio do mês e dividendos de 12 meses | Base aberta derivada da série de Robert Shiller. Os dividendos param em jun/2023; dali em diante vale o último divulgado |
| **Blockchain.com** | Preço diário do bitcoin em dólares | Média das principais corretoras, desde ago/2010 |
| **IBGE** (SIDRA 2609) | Nascidos vivos registrados em cartório por ano | Estatísticas do Registro Civil, desde 2003 |
| **IBGE** (projeções) | População, nascimentos, fecundidade e razão de dependência de idosos do Brasil, de 2000 a 2070 | Projeções da População, revisão 2024, já ajustada ao Censo de 2022. Planilha de indicadores no FTP do IBGE; as tabelas do SIDRA ainda trazem a revisão de 2018 |
| **Banco Central Europeu** | O intervalo em que a taxa de depósito ficou abaixo de zero (jun/2014 a jul/2022) | Só é citado no texto da página; não entra no pipeline. Conferido no ECB Data Portal (série FM.D.U2.EUR.4F.KR.DFR.LEV) em 05/10/2026 |
| **Texto analisado** | Os 36 números citados | Transcritos à mão em `data/manual/afirmacoes.csv`, cada um com o trecho de onde saiu |

**M1 e M2 antes de 2001.** O Banco Central mudou a metodologia dos meios de pagamento em 2018 e só recalculou as
séries até dezembro de 2001. Para trás, entram as séries antigas (1824 e 1837), multiplicadas pela razão média
entre a nova e a antiga nos primeiros 12 meses em comum. No M2 o ajuste é de cerca de 1%.

**Ouro e bitcoin em reais.** O ouro é a média do mês em dólares vezes o dólar médio do mês. O bitcoin é o preço do
último dia do mês vezes o dólar de fim de mês.

**Último mês.** A tabela do Brasil termina no último mês em que a inflação e o M2 já foram divulgados.

## 2. As contas

O código está em `src/juro_negativo/analise.py`.

**Níveis.** Tudo parte de uma tabela com uma coluna por série e uma linha por mês, com o valor no fim daquele mês.
Selic, CDI e IPCA entram como índices acumulados (valem 1 em junho de 1994, a véspera do real); Ibovespa, ouro,
dólar e bitcoin, como cotações; os agregados e o PIB, como saldos.

**Períodos.** Seguem a convenção do texto: "de jan/2008 a jan/2018" vai da abertura de janeiro de 2008 à abertura de
janeiro de 2018, isto é, do fim de dezembro de 2007 ao fim de dezembro de 2017. Com essa convenção, a Selic, o CDI e
o Ibovespa de ponta a ponta reproduzem os números do texto quase exatamente.

**Descontar uma régua.** É dividir, não subtrair: `(1 + ativo) ÷ (1 + régua) − 1`.

**Conferência dos números do texto.** Cada número citado é refeito e comparado pelo valor final: 26,48 vezes contra
28,18 vezes é uma diferença de 6%. Conta como "bate" a diferença de até 5%.

**Ano a ano.** A Selic acumulada de janeiro a dezembro descontada do IPCA do mesmo ano, só para os anos completos.

**Juro real de 12 meses.** A Selic acumulada em 12 meses descontada da régua no mesmo período, datada pelo mês em
que os 12 meses terminam. "Desde 2008" são os períodos encerrados de dezembro de 2008 em diante.

**Janelas.** Para cada mês de início, a taxa anual de cada série nos 5 ou 10 anos seguintes. Há 105 janelas de dez
anos começadas desde janeiro de 2008. Elas se sobrepõem, então não são experimentos independentes.

**Poder de compra.** Quanto a mais, ou a menos, o dinheiro aplicado compra de cada coisa no fim do período. Cada
coisa é medida até o último mês em que tem dado (o índice de imóveis sai com um mês de atraso).

**Guardar todo mês.** Um aporte na abertura de cada mês, corrigido pelo IPCA, aplicado no ativo. O resultado é o
saldo dividido pelo total guardado, em valores do último mês.

**Quedas.** Para cada mês, a distância entre o preço em reais e o maior preço atingido até ali (zero no recorde;
−50% quando vale metade do que já valeu). Uma queda vai de um recorde ao ponto mais baixo antes do recorde seguinte,
ou até o fim dos dados se o recorde ainda não foi recuperado. O bitcoin entra pelo preço do último dia de cada mês e
o ouro, pela média do mês: o que cai e volta dentro do mês não aparece, então as quedas de verdade são um pouco
maiores que as medidas aqui, principalmente as do ouro. A contagem do bitcoin começa em 2011, o primeiro ano inteiro
com preço.

**Decomposição do M2.** `M2 = preços × (PIB ÷ preços) × (M2 ÷ PIB)`. A segunda parte usa o IPCA, não o deflator do
PIB. Como o deflator subiu mais que o IPCA no período, o "crescimento da economia acima dos preços" (3,1% ao ano
desde 2008) é maior que o crescimento real oficial do PIB.

**Juro real dos países.** O juro básico do fim do mês descontada a inflação ao consumidor dos 12 meses anteriores.
Meses com inflação acima de 1.000% ao ano ficam de fora.

**Juro nominal negativo.** Os meses em que o juro básico do país, na série do BIS, ficou abaixo de zero, sem
descontar nada. Na zona do euro o BIS registra a taxa das operações principais de refinanciamento, que parou em
zero; a taxa que ficou negativa lá foi a de depósito, e por isso ela aparece à parte.

**Dinheiro nos Estados Unidos.** Quatro medidas, da mais estreita à mais ampla: papel-moeda em circulação, base
monetária (o papel-moeda mais as reservas que os bancos mantêm no Federal Reserve), M1 e M2. A parte das reservas
no aumento da base é o que sobra do aumento depois de tirado o do papel-moeda.

## 3. O que cada régua mede

| Régua | O que é | A Selic desde 2008 |
|---|---|---|
| **Preços (IPCA)** | O custo de uma cesta de consumo | +4,1% ao ano |
| **PIB nominal** | Tudo o que o país produziu, a preços correntes. Ganhar dele é manter a fatia da renda nacional | +1,1% |
| **Base monetária** | O dinheiro que o Banco Central emite: cédulas, moedas e reservas dos bancos | +3,8% |
| **M1** | Cédulas e moedas com o público, mais os depósitos à vista | +4,2% |
| **M2** | M1 mais poupança e títulos emitidos por bancos (CDBs, LCIs, LCAs) | −2,7% |
| **M3** | M2 mais cotas de fundos de renda fixa e operações compromissadas | −2,1% |
| **M4** | M3 mais títulos públicos em poder do público | −2,0% |

O texto usa o M2 (e chama o M1 e o M2 de "base monetária"). A tese só se sustenta com os três agregados amplos,
que são formados quase inteiramente por aplicações que rendem juros: eles crescem com os juros creditados e com o
dinheiro novo que entra nelas.

## 4. Onde as escolhas pesam

**A favor da tese do texto**

- Imposto de renda e custos ficaram de fora. Com 15% sobre o rendimento no resgate, o ganho da Selic acima da
  inflação desde 2008 cai de 4,1% para 3,4% ao ano. Em fundos, com o come-cotas, cai mais.
- O IPCA é uma cesta média. Para quem gasta mais com itens que subiram acima da média, o juro real foi menor.
- A Selic é a taxa cheia. Poucas aplicações de varejo pagam 100% dela depois de taxas.
- Nos Estados Unidos, a comparação principal usa o M2. Pela base monetária, que é a definição que o texto diz usar,
  o resultado de 2008 a 2018 se inverte: ela cresceu 360% com as compras de títulos do Federal Reserve, e a bolsa,
  123% com dividendos. No Brasil a base monetária cresceu no ritmo dos preços, e essa inversão não acontece.

**Contra a tese do texto**

- O ponto de partida "2008" é a véspera de uma queda da bolsa e de uma corrida para CDBs que inflou o M2 em 39% em
  um ano. Começando um ano depois, em janeiro de 2009, a Selic perde do M2 por 1,7% ao ano até hoje, e não por 2,7%.
  A conclusão não muda, mas o tamanho da diferença depende do ano de partida.
- O M2 de antes de 2001 é emendado com a série antiga. Um erro na emenda mudaria as comparações de 1995 a 2001, não
  as de 2008 em diante.

**Incerto para os dois lados**

- O ouro entra pela média do mês e o texto usou cotações de um dia. Em períodos curtos, como a pandemia, a
  diferença chega a dez pontos percentuais.
- O S&P 500 é a média mensal da série de Shiller, e os dividendos de depois de junho de 2023 são estimados.
- O juro real dos países usa a inflação passada. Com a inflação esperada, que é a que o investidor enxerga, os
  números mudam um pouco, principalmente nas viradas (2021 e 2022).

## 5. O que ficou de fora

- **As causas da queda da natalidade.** A segunda parte do texto as atribui a mudanças de costumes e a políticas
  públicas. Essas explicações não são testáveis com as séries usadas aqui. A checagem cobre os números de população
  (fecundidade, nascimentos, pirâmide etária) e para aí.
- **As contas da Previdência.** O projeto mostra a mudança na proporção entre idosos e pessoas em idade de trabalhar,
  não o resultado financeiro do INSS.
- **As duas projeções de população em todos os gráficos.** A pirâmide etária e a razão de dependência usam a
  projeção da ONU, que vai até 2050 e permite comparar países. A do IBGE, que vai até 2070, entra só no total da
  população, para datar o pico e medir o ritmo da queda.
- **Argentina e Turquia em detalhe.** Aparecem no mapa de juros reais; o texto as cita só como exemplo.
- **A segunda régua austríaca.** Há definições de oferta de moeda, usadas por economistas da mesma escola do texto,
  que excluem os depósitos a prazo. Não foram reconstruídas; a base monetária e o M1 dão uma ideia do resultado.

## 6. Reprodutibilidade

- `uv run python -m juro_negativo` refaz tudo a partir das fontes: baixa, trata, salva `data/processed` e exporta os
  dados da página.
- `uv run pytest` testa os leitores com arquivos pequenos no formato de cada fonte (sem rede), as contas uma a uma e
  a sanidade das tabelas tratadas.
- `npm test`, em `site/`, compara a conta em TypeScript com a de Python em 12 períodos, na matriz de períodos, no
  poder de compra e nas quedas, a partir dos mesmos níveis que a página recebe.
- Os números citados no texto dos notebooks são os da execução de outubro de 2026. Ao atualizar os dados, os
  gráficos e as tabelas mudam sozinhos; o texto dos notebooks precisa ser revisto. Na página, os números do texto
  são calculados a partir dos dados.
