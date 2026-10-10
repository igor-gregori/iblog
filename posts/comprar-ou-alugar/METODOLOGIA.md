# Metodologia

Como os dados foram obtidos e tratados, como a simulação funciona, quais são as premissas e onde elas podem
favorecer um lado ou o outro. O texto dos notebooks descreve os dados disponíveis em outubro de 2026 (preços e
aluguéis até agosto de 2026).

## 1. Fontes e tratamento

Cada fonte tem um módulo em `src/comprar_ou_alugar/fontes/`, com uma função que baixa o arquivo bruto para
`data/raw` e outra que o lê. Todas as taxas ficam em fração (0,5% é `0.005`) e todas as datas mensais, no primeiro
dia do mês.

| Fonte | O que entra | Observações |
|---|---|---|
| **FipeZAP** (Fipe) | Preço médio de venda e de aluguel do m², índice e rentabilidade do aluguel, por cidade e por número de dormitórios | Preço de **anúncio** de **apartamentos prontos**. 56 cidades; as séries começam entre 2008 e 2022. Belo Horizonte só tem aluguel desde dez/2015. O leitor confere os títulos da planilha e falha se o formato mudar |
| **IFIX** (B3) | Fechamento diário desde 30/12/2010 | Índice de retorno total: já inclui os rendimentos reinvestidos. O endereço usado não é documentado pela B3, então as respostas brutas ficam versionadas. O mês em andamento é descartado |
| **CVM** | Informe mensal de cada fundo imobiliário desde 2016 | Usado para separar o rendimento distribuído do retorno total. O rendimento do informe é calculado sobre o **valor patrimonial** da cota, não sobre o preço em bolsa |
| **IBGE** | IPCA (número-índice e variação mensal) | Tabela 1737 do SIDRA |
| **Banco Central** (SGS) | CDI (4391), IGP-M (189), IVG-R (21340) e taxa média de juros do financiamento imobiliário para pessoa física: total (20774), taxas de mercado (20772) e taxas reguladas (20773) | Lido pelo serviço SOAP do SGS. A API REST (`api.bcb.gov.br`) não resolvia DNS quando o projeto foi feito |
| **Tesouro Nacional** | Taxa de compra do Tesouro IPCA+ (sem juros semestrais) | Média entre os vencimentos de cada dia e entre os dias de cada mês |

**Preço real.** Os preços são corrigidos pelo IPCA até o último mês com inflação divulgada. Meses mais recentes
que isso ficam sem valor real.

**Rendimento dos FIIs.** Média ponderada pelo patrimônio dos fundos negociados em bolsa, com pelo menos mil
cotistas e rendimento mensal entre 0% e 5% (fora disso é erro de preenchimento). Meses com menos de 50 fundos, ou
em que os informes ainda estão sendo entregues, são descartados. Como os FIIs têm sido negociados abaixo do valor
patrimonial, o rendimento sobre o preço de mercado é um pouco maior que o medido aqui.

## 2. A simulação

O código está em `src/comprar_ou_alugar/simulador.py`. Duas pessoas começam com o mesmo dinheiro e têm o mesmo
desembolso em todos os meses.

**No dia da compra**

- A compradora paga a entrada e os custos da compra, e financia o resto.
- A inquilina investe o valor da entrada mais os custos.

**Em cada mês**

1. A compradora paga a parcela do financiamento e a manutenção (uma fração do valor atual do imóvel).
2. A inquilina paga o aluguel. O contrato é reajustado ao valor de mercado a cada 12 meses.
3. Quem gastou menos investe a diferença. No começo é a inquilina; quando a parcela fica menor que o aluguel, e
   depois que o financiamento acaba, é a compradora.
4. As carteiras rendem, o imóvel valoriza e o aluguel de mercado muda.

**No fim**

- Patrimônio da compradora: valor do imóvel, menos a corretagem de uma venda, menos o saldo devedor, mais a
  carteira dela.
- Patrimônio da inquilina: a carteira.
- As carteiras entram líquidas do imposto sobre o ganho de capital. Os rendimentos reinvestidos aumentam o custo de
  aquisição, então só a valorização das cotas é tributada.

O resultado é a **vantagem do aluguel**: patrimônio da inquilina menos o da compradora, em valores do dia da compra,
como fração do preço inicial do imóvel.

### Premissas

| Premissa | Valor | De onde vem |
|---|---|---|
| Imóvel | 65 m² ao preço médio do m² da cidade | O resultado relativo não depende da área; ela só dá escala aos valores em reais |
| Entrada | 20% | Mínimo usual dos bancos |
| Custos da compra | 5% | ITBI (2% a 3%), escritura e registro |
| Juros | Taxa média do financiamento imobiliário para pessoa física no mês da decisão (SGS 20774), fixa até o fim | Antes de mar/2011, a série não existe: vale a primeira taxa disponível |
| Sistema e prazo | SAC, 30 anos | O mais comum |
| Manutenção | 1% do valor do imóvel ao ano | Reformas, obras do prédio e o desgaste de um imóvel específico em relação ao índice |
| Corretagem na venda | 6% | Descontada do imóvel ao medir o patrimônio |
| Carteira | IFIX | Rendimentos isentos para pessoa física; 20% sobre o ganho de capital |
| Disciplina | 100% | Toda a diferença mensal é investida |
| Condomínio e IPTU | Fora da conta | Quem mora paga os dois, seja dono ou inquilino |

### Compra à vista: a pergunta da página

A página e o notebook 6 usam o mesmo simulador com **entrada de 100%** (`cenarios.compra_a_vista`): quem tem o
dinheiro compra à vista o maior imóvel que ele paga, já descontados os 5% de custos da compra, e quem aluga aplica
o valor inteiro. Sem parcela, quem compra gasta só a manutenção e investe nos mesmos fundos o aluguel que não paga.
Isso dá no mesmo que a renda dos fundos pagar o aluguel de quem aluga: nos dois casos, a diferença entre os
patrimônios é a mesma.

| Premissa | Valor | De onde vem |
|---|---|---|
| Dinheiro disponível | R$ 500 mil | A pergunta do projeto |
| Imóvel e aluguel | Mediana do preço e do aluguel por m² na amostra de Varginha | O aluguel é o do imóvel comprado: valor × aluguel por m² ÷ preço por m² |
| Carteira | Rendimento mensal fixo e variação fixa do preço da cota (`cenarios.fundos_a_taxas_fixas`) | O rendimento é reinvestido e isento; o ganho com a cota paga 20% de imposto na venda |
| Inflação | 4,5% ao ano | Imóvel e aluguel acompanham a inflação, salvo quando o cenário diz outra coisa |
| "Média dos FIIs hoje" | Média do rendimento mensal dos últimos 12 meses, pelo informe da CVM (0,73%) | Sobre o valor patrimonial: na bolsa, o rendimento sobre o preço pode ser maior |
| "Como desde 2011" | Rendimento médio de hoje e a variação da cota que, somada a ele, dá o retorno real do IFIX de 2011 a 2026 (2,9% ao ano) | Na prática, a cota cai cerca de 1,5% ao ano sem descontar a inflação |

A página chama de rentabilidade do aluguel o aluguel de um ano dividido pelo preço (5,7% em Varginha). O FipeZAP e
o notebook 5 compõem os doze meses e chegam a 5,8%; o aluguel em reais é o mesmo.

### Três jeitos de usar o simulador com financiamento

**Backtest** (`cenarios.backtest`). Para cada mês com história suficiente pela frente, a simulação usa preço,
aluguel e juros daquele mês e segue os dados reais: valorização do m², aluguel de mercado, IFIX e IPCA. Há 129
janelas de cinco anos e 69 de dez em São Paulo e no Rio. As janelas se sobrepõem, então não são experimentos
independentes.

**Monte Carlo** (`cenarios.monte_carlo`). Parte das condições de hoje e sorteia 10 mil futuros de 30 anos. Cada
futuro é uma sequência de blocos de 12 meses consecutivos tirados da história da cidade, com reposição. Cada bloco
leva junto imóvel, aluguel, IFIX e inflação do mesmo período, o que preserva a relação entre as séries e a inércia
de curto prazo dos preços. A amostra vai de jan/2011 a ago/2026 (em Belo Horizonte, desde jan/2016).

**Sensibilidade** (`cenarios.sensibilidade`). Grade de cenários com taxas reais fixas para a valorização do imóvel
e o retorno da carteira. O aluguel acompanha o preço do imóvel (a rentabilidade do aluguel não muda) e a inflação é
de 4,5% ao ano.

## 3. Onde as premissas pesam

**A favor de comprar**

- Os seguros obrigatórios do financiamento (MIP e DFI) e as tarifas do banco não estão na conta. Eles somam algo
  como meio ponto percentual ao ano sobre o saldo devedor.
- O aluguel é reajustado ao valor de mercado todo ano. Na prática, inquilinos antigos costumam pagar menos que o
  mercado quando os aluguéis sobem depressa, como de 2022 a 2025.
- A taxa média de financiamento inclui operações subsidiadas. Quem não se enquadra paga mais: com a taxa média de
  mercado (14,2% ao ano), a chance de alugar ganhar em dez anos em São Paulo sobe de 39% para 62%.

**A favor de alugar**

- O FGTS, que pode entrar na entrada ou amortizar a dívida, ficou de fora.
- Toda a diferença mensal é investida, sem falhar um mês em 30 anos. Investindo metade, a chance em dez anos cai
  para 18%.
- Custos de mudança, e o risco de o proprietário pedir o imóvel, não entram.
- O preço de anúncio demora a mostrar quedas. Em mercado fraco, o imóvel vale menos do que o índice diz.

**Incerto para os dois lados**

- O Monte Carlo reamostra 15 anos em que os imóveis ficaram perto da inflação e os FIIs renderam 2,9% ao ano
  em termos reais. Um futuro diferente desse não está representado. A análise de sensibilidade existe para isso.
- A rentabilidade do aluguel está no nível mais alto em uma década. Se voltar à média pela queda dos aluguéis,
  alugar fica melhor do que a simulação diz; se voltar pela alta dos preços, comprar fica melhor.

## 4. Varginha

A cidade não está no FipeZAP, e a API do IBGE não traz o valor do aluguel do Censo 2022 por município. O nível de
preço e de aluguel vem de uma amostra de anúncios de apartamentos (`data/manual/varginha_anuncios.csv`): os que
apareciam em 03/10/2026 na primeira página de venda e na primeira página de aluguel de uma rede de imobiliárias da
cidade, com área e preço informados. Cada linha guarda a origem e a data.

- Dois anúncios com preço por m² impossível (erro de área) foram descartados; a regra está em
  `fontes/varginha.py`. Ficaram 28 de venda e 12 de aluguel.
- A medida é a **mediana** do preço por m². O intervalo de 90% vem de um *bootstrap* com 10 mil reamostragens.
- A rentabilidade do aluguel estimada é de 5,8% ao ano, com intervalo de 4,6% a 10,3%. A incerteza é grande o
  bastante para mudar a conclusão.
- A dinâmica (valorização, reajustes) é emprestada de Belo Horizonte, São Paulo, Rio e do índice nacional, e os
  resultados são mostrados para as quatro.

## 5. Reprodutibilidade

- `uv run python -m comprar_ou_alugar` refaz tudo a partir das fontes: baixa, trata, salva `data/processed` e
  exporta os dados da página. Os sorteios usam semente fixa.
- `uv run pytest` testa os leitores com arquivos pequenos no formato de cada fonte (sem rede), as regras do
  simulador uma a uma e a sanidade das tabelas tratadas.
- `npm test`, em `site/`, compara o simulador em TypeScript com o de Python em onze cenários, dois deles de
  compra à vista.
- Os números citados no texto dos notebooks são os da execução de outubro de 2026. Ao atualizar os dados, os
  gráficos e as tabelas mudam sozinhos; o texto precisa ser revisto.
