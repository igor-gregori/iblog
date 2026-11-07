import json
import re

from especificacao_antes_do_codigo import execucoes as ex
from especificacao_antes_do_codigo.caminhos import EXECUCOES, PAGINA, PRIMEIRO_LOTE, TAREFAS
from especificacao_antes_do_codigo.regras import CLASSIFICACAO, TIPOS


def test_tres_repeticoes_de_cada_combinacao_e_um_diff_de_cada():
    lista = ex.ler()
    assert len(lista) == 27
    for tarefa in ex.TAREFAS:
        for variante in ex.VARIANTES:
            assert sorted(e.repeticao for e in lista if (e.tarefa, e.variante) == (tarefa, variante)) == [1, 2, 3]
    for e in lista:
        nome = f"{e.tarefa}-{e.variante}-{e.repeticao}"
        assert (EXECUCOES / f"{nome}.diff").exists() and (EXECUCOES / f"{nome}.entrega.diff").exists()
    assert len(ex.ler(PRIMEIRO_LOTE)) == 18


def test_a_classificacao_cobre_exatamente_os_testes_de_regras():
    for tarefa, testes in CLASSIFICACAO.items():
        fonte = (TAREFAS / tarefa / "testes" / "regras.test.ts").read_text(encoding="utf-8")
        assert set(re.findall(r"^test\('([^']+)'", fonte, re.MULTILINE)) == set(testes), tarefa
        assert set(testes.values()) <= set(TIPOS)


def test_as_contas_do_resumo_batem_com_as_execucoes():
    dados = json.loads((PAGINA / "dados.json").read_text(encoding="utf-8"))
    lista = ex.ler()
    assert dados["total"]["execucoes"] == len(lista)
    for linha in dados["resumo"]:
        grupo = [e for e in lista if (e.tarefa, e.variante) == (linha["tarefa"], linha["variante"])]
        assert linha["prontas_na_entrega"] == sum(e.pronta_na_entrega for e in grupo)
        assert abs(linha["custo"] - (linha["custo_entrega"] + linha["custo_correcoes"])) < 0.01
    # Cada falha de regra na entrega aparece na contagem por tipo.
    falhas = sum(len(e.regras_que_falharam) for e in lista if e.variante in "AB")
    assert falhas == sum(t["falhas_ab"] for t in dados["tipos"])


def test_os_arquivos_das_execucoes_nao_tem_caminhos_da_maquina():
    for arquivo in EXECUCOES.rglob("*"):
        if arquivo.is_file():
            texto = arquivo.read_text(encoding="utf-8")
            assert "/home/" not in texto and "@gmail" not in texto, arquivo.name
