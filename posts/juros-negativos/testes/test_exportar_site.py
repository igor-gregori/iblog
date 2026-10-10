import math

from juros_negativos import exportar_site


def test_numero_arredonda_por_casas_ou_por_algarismos():
    assert exportar_site._numero(0.123456, 4) == 0.1235
    assert exportar_site._numero(109522.88) == 109522.9  # sete algarismos significativos
    assert exportar_site._numero(0.000123456789) == 0.0001234568
    assert exportar_site._numero(-0.00001, 4) == 0.0  # sem "-0.0" no JSON
    assert exportar_site._numero(math.nan) is None
    assert exportar_site._numero(0.0) == 0.0


def test_nome_da_faixa():
    assert exportar_site._nome_da_faixa("0004") == "0 a 4"
    assert exportar_site._nome_da_faixa("7579") == "75 a 79"
    assert exportar_site._nome_da_faixa("80UP") == "80 ou mais"
