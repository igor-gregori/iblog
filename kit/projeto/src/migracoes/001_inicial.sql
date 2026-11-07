CREATE TABLE produtos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  preco INTEGER NOT NULL,
  preco_promocional INTEGER,
  estoque INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL
);

CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL
);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes (id),
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  criado_em TEXT NOT NULL,
  enviado_em TEXT,
  entregue_em TEXT
);

CREATE TABLE itens_pedido (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos (id),
  produto_id INTEGER NOT NULL REFERENCES produtos (id),
  quantidade INTEGER NOT NULL,
  preco_unitario INTEGER NOT NULL
);

CREATE TABLE eventos_pedido (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos (id),
  de TEXT,
  para TEXT NOT NULL,
  em TEXT NOT NULL
);

CREATE INDEX itens_pedido_por_pedido ON itens_pedido (pedido_id);
CREATE INDEX pedidos_por_cliente ON pedidos (cliente_id);
CREATE INDEX eventos_por_pedido ON eventos_pedido (pedido_id);
