"""Comprar × alugar e investir: a conta, mês a mês.

Duas pessoas começam com o mesmo dinheiro e gastam exatamente o mesmo todo mês.

- A **compradora** dá a entrada, paga os custos da compra e financia o resto.
  Todo mês paga a parcela e a manutenção do imóvel.
- A **inquilina** aluga um imóvel equivalente e aplica em fundos imobiliários o
  que a compradora gastou na entrada e nos custos.

Quem gastar menos no mês investe a diferença nos mesmos fundos. No começo é a
inquilina (a parcela é maior que o aluguel); perto do fim do financiamento, ou
depois dele, é a compradora. Assim as duas desembolsam o mesmo valor e o que se
compara é o patrimônio que cada uma tem no fim.

`site/src/simulador.ts` repete esta lógica; os testes do site conferem que os
dois dão os mesmos números.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd

from . import financiamento


@dataclass(frozen=True)
class Parametros:
    valor_imovel: float  # preço do imóvel hoje
    aluguel_mensal: float  # aluguel de um imóvel equivalente hoje
    entrada_pct: float = 0.20
    custos_compra_pct: float = 0.05  # ITBI, escritura e registro
    juros_aa: float = 0.11  # taxa efetiva anual do financiamento
    prazo_meses: int = 360
    sistema: str = "SAC"
    manutencao_aa: float = 0.01  # reformas, obras do prédio e desgaste: gasto anual só do dono, em fração do imóvel
    corretagem_venda_pct: float = 0.06  # descontada do imóvel ao medir o patrimônio
    ir_ganho_carteira: float = 0.20  # imposto sobre o ganho de capital ao vender as cotas
    disciplina: float = 1.0  # fração da diferença mensal que é de fato investida


@dataclass(frozen=True)
class Cenario:
    """O que acontece com preços e investimentos em cada mês depois da compra.

    Cada campo é uma matriz (caminhos × meses) de variações mensais em fração.
    """

    valorizacao_mes: np.ndarray  # preço do imóvel
    aluguel_var_mes: np.ndarray  # aluguel de mercado
    carteira_retorno_mes: np.ndarray  # retorno total da carteira (rendimentos reinvestidos)
    carteira_rendimento_mes: np.ndarray  # parte do retorno que veio de rendimento distribuído
    inflacao_mes: np.ndarray  # IPCA, só para trazer os resultados a valores de hoje

    @classmethod
    def constante(
        cls,
        meses: int,
        *,
        valorizacao_aa: float,
        reajuste_aluguel_aa: float,
        carteira_retorno_aa: float,
        carteira_rendimento_aa: float,
        inflacao_aa: float,
    ) -> Cenario:
        """Um único caminho em que tudo cresce a taxas anuais fixas."""
        taxas = (valorizacao_aa, reajuste_aluguel_aa, carteira_retorno_aa, carteira_rendimento_aa, inflacao_aa)
        return cls(*(np.full((1, meses), financiamento.taxa_mensal(taxa)) for taxa in taxas))

    @property
    def meses(self) -> int:
        return self.valorizacao_mes.shape[1]


@dataclass(frozen=True)
class Resultado:
    """Matrizes (caminhos × meses + 1); a coluna 0 é o dia da compra. Valores nominais."""

    valor_imovel: np.ndarray
    saldo_devedor: np.ndarray
    gasto_comprador: np.ndarray  # parcela + manutenção
    aluguel: np.ndarray
    carteira_comprador: np.ndarray
    carteira_inquilino: np.ndarray
    patrimonio_comprador: np.ndarray  # imóvel − corretagem − dívida + carteira líquida de imposto
    patrimonio_inquilino: np.ndarray  # carteira líquida de imposto
    deflator: np.ndarray  # inflação acumulada desde a compra

    def vantagem_do_aluguel(self) -> np.ndarray:
        """Patrimônio da inquilina menos o da compradora, em valores do dia da compra
        e como fração do preço inicial do imóvel. Positivo: alugar e investir ganhou."""
        diferenca = (self.patrimonio_inquilino - self.patrimonio_comprador) / self.deflator
        return diferenca / self.valor_imovel[:, :1]

    def tabela(self, caminho: int = 0) -> pd.DataFrame:
        """Um caminho como tabela, uma linha por mês."""
        colunas = {nome: matriz[caminho] for nome, matriz in vars(self).items()}
        return pd.DataFrame(colunas).rename_axis("mes").reset_index()


def simular(p: Parametros, cenario: Cenario) -> Resultado:
    caminhos, meses = cenario.valorizacao_mes.shape

    # O financiamento não depende do cenário: é o mesmo em todos os caminhos.
    financiado = p.valor_imovel * (1 - p.entrada_pct)
    parcelas = financiamento.tabela(financiado, p.juros_aa, p.prazo_meses, p.sistema)
    parcela = np.zeros(meses + 1)
    saldo = np.zeros(meses + 1)
    saldo[0] = financiado
    pagos = min(meses, p.prazo_meses)
    parcela[1 : pagos + 1] = parcelas["parcela"].to_numpy()[:pagos]
    saldo[1 : pagos + 1] = parcelas["saldo"].to_numpy()[:pagos]

    forma = (caminhos, meses + 1)
    valor_imovel = np.empty(forma)
    aluguel_mercado = np.empty(forma)
    aluguel = np.zeros(forma)
    gasto_comprador = np.zeros(forma)
    carteira = {"comprador": np.zeros(forma), "inquilino": np.zeros(forma)}
    custo = {"comprador": np.zeros(forma), "inquilino": np.zeros(forma)}  # base para o imposto

    valor_imovel[:, 0] = p.valor_imovel
    aluguel_mercado[:, 0] = p.aluguel_mensal
    # A inquilina começa investindo o que a compradora gastou para comprar.
    carteira["inquilino"][:, 0] = custo["inquilino"][:, 0] = p.valor_imovel * (p.entrada_pct + p.custos_compra_pct)

    for t in range(1, meses + 1):
        k = t - 1  # posição do mês t nas matrizes do cenário

        gasto_comprador[:, t] = parcela[t] + valor_imovel[:, k] * p.manutencao_aa / 12
        # O contrato de aluguel é reajustado ao valor de mercado uma vez por ano.
        aluguel[:, t] = aluguel_mercado[:, k - k % 12]

        diferenca = gasto_comprador[:, t] - aluguel[:, t]
        aporte = {
            "inquilino": np.maximum(diferenca, 0) * p.disciplina,
            "comprador": np.maximum(-diferenca, 0) * p.disciplina,
        }
        for quem, saldo_carteira in carteira.items():
            anterior = saldo_carteira[:, k]
            rendimento = anterior * cenario.carteira_rendimento_mes[:, k]
            saldo_carteira[:, t] = anterior * (1 + cenario.carteira_retorno_mes[:, k]) + aporte[quem]
            # Rendimento reinvestido é uma compra nova: aumenta o custo de aquisição.
            custo[quem][:, t] = custo[quem][:, k] + rendimento + aporte[quem]

        valor_imovel[:, t] = valor_imovel[:, k] * (1 + cenario.valorizacao_mes[:, k])
        aluguel_mercado[:, t] = aluguel_mercado[:, k] * (1 + cenario.aluguel_var_mes[:, k])

    liquida = {
        quem: carteira[quem] - p.ir_ganho_carteira * np.maximum(carteira[quem] - custo[quem], 0) for quem in carteira
    }
    deflator = np.ones(forma)
    deflator[:, 1:] = np.cumprod(1 + cenario.inflacao_mes, axis=1)

    return Resultado(
        valor_imovel=valor_imovel,
        saldo_devedor=np.broadcast_to(saldo, forma),
        gasto_comprador=gasto_comprador,
        aluguel=aluguel,
        carteira_comprador=carteira["comprador"],
        carteira_inquilino=carteira["inquilino"],
        patrimonio_comprador=valor_imovel * (1 - p.corretagem_venda_pct) - saldo + liquida["comprador"],
        patrimonio_inquilino=liquida["inquilino"],
        deflator=deflator,
    )
