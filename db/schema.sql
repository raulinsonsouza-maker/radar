-- Schema CNPJ / Prospecção (Receita Federal - dados abertos)
-- Pronto para amostragem e carga completa

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Domínios
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cnaes (
    codigo      CHAR(7) PRIMARY KEY,
    descricao   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS municipios (
    codigo      CHAR(4) PRIMARY KEY,
    nome        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS naturezas_juridicas (
    codigo      CHAR(4) PRIMARY KEY,
    descricao   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paises (
    codigo      CHAR(3) PRIMARY KEY,
    nome        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qualificacoes (
    codigo      CHAR(2) PRIMARY KEY,
    descricao   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS motivos (
    codigo      CHAR(2) PRIMARY KEY,
    descricao   TEXT NOT NULL
);

-- Nichos comerciais (divisão CNAE → subclasses) com nomes amigáveis
CREATE TABLE IF NOT EXISTS nichos (
    slug            TEXT PRIMARY KEY,
    nome_amigavel   TEXT NOT NULL,
    nome_oficial    TEXT,
    parent_slug     TEXT REFERENCES nichos(slug) ON DELETE CASCADE,
    ordem           INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nicho_cnaes (
    nicho_slug TEXT NOT NULL REFERENCES nichos(slug) ON DELETE CASCADE,
    tipo       TEXT NOT NULL CHECK (tipo IN ('prefixo', 'codigo')),
    valor      TEXT NOT NULL,
    PRIMARY KEY (nicho_slug, tipo, valor)
);

CREATE INDEX IF NOT EXISTS ix_nichos_parent ON nichos (parent_slug);
CREATE INDEX IF NOT EXISTS ix_nicho_cnaes_valor ON nicho_cnaes (tipo, valor);

-- ---------------------------------------------------------------------------
-- Fatos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS empresas (
    cnpj_basico              CHAR(8) PRIMARY KEY,
    razao_social             TEXT,
    natureza_juridica        CHAR(4),
    qualificacao_responsavel CHAR(2),
    capital_social           NUMERIC(18, 2),
    porte                    CHAR(2),
    ente_federativo          TEXT
);

CREATE TABLE IF NOT EXISTS estabelecimentos (
    cnpj_basico                 CHAR(8) NOT NULL,
    cnpj_ordem                  CHAR(4) NOT NULL,
    cnpj_dv                     CHAR(2) NOT NULL,
    cnpj                        CHAR(14) GENERATED ALWAYS AS (cnpj_basico || cnpj_ordem || cnpj_dv) STORED,
    identificador_matriz_filial CHAR(1),
    nome_fantasia               TEXT,
    situacao_cadastral          CHAR(2),
    data_situacao_cadastral     DATE,
    motivo_situacao_cadastral   CHAR(2),
    nome_cidade_exterior        TEXT,
    pais                        CHAR(3),
    data_inicio_atividade       DATE,
    cnae_fiscal_principal       CHAR(7),
    cnae_fiscal_secundaria      TEXT,
    tipo_logradouro             TEXT,
    logradouro                  TEXT,
    numero                      TEXT,
    complemento                 TEXT,
    bairro                      TEXT,
    cep                         CHAR(8),
    uf                          CHAR(2),
    municipio                   CHAR(4),
    ddd_1                       TEXT,
    telefone_1                  TEXT,
    ddd_2                       TEXT,
    telefone_2                  TEXT,
    ddd_fax                     TEXT,
    fax                         TEXT,
    correio_eletronico          TEXT,
    situacao_especial           TEXT,
    data_situacao_especial      DATE,
    PRIMARY KEY (cnpj_basico, cnpj_ordem, cnpj_dv)
);

CREATE TABLE IF NOT EXISTS simples (
    cnpj_basico            CHAR(8) PRIMARY KEY,
    opcao_simples          CHAR(1),
    data_opcao_simples     DATE,
    data_exclusao_simples  DATE,
    opcao_mei              CHAR(1),
    data_opcao_mei         DATE,
    data_exclusao_mei      DATE
);

CREATE TABLE IF NOT EXISTS socios (
    id                              BIGSERIAL PRIMARY KEY,
    cnpj_basico                     CHAR(8) NOT NULL,
    identificador_socio             CHAR(1),
    nome_socio                      TEXT,
    cnpj_cpf_socio                  TEXT,
    qualificacao_socio              CHAR(2),
    data_entrada_sociedade          DATE,
    pais                            CHAR(3),
    representante_legal             TEXT,
    nome_representante              TEXT,
    qualificacao_representante_legal CHAR(2),
    faixa_etaria                    CHAR(1)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS ix_empresas_porte ON empresas (porte);
CREATE INDEX IF NOT EXISTS ix_empresas_natureza ON empresas (natureza_juridica);
CREATE INDEX IF NOT EXISTS ix_empresas_capital ON empresas (capital_social);
CREATE INDEX IF NOT EXISTS ix_empresas_razao ON empresas USING gin (to_tsvector('portuguese', coalesce(razao_social, '')));
CREATE INDEX IF NOT EXISTS ix_empresas_razao_trgm ON empresas USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_estab_fantasia_trgm ON estabelecimentos USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_estab_cnpj_trgm ON estabelecimentos USING gin ((cnpj::text) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_estab_cnpj_basico ON estabelecimentos (cnpj_basico);
CREATE INDEX IF NOT EXISTS ix_estab_situacao ON estabelecimentos (situacao_cadastral);
CREATE INDEX IF NOT EXISTS ix_estab_uf ON estabelecimentos (uf);
CREATE INDEX IF NOT EXISTS ix_estab_municipio ON estabelecimentos (municipio);
CREATE INDEX IF NOT EXISTS ix_estab_cnae ON estabelecimentos (cnae_fiscal_principal);
CREATE INDEX IF NOT EXISTS ix_estab_matriz ON estabelecimentos (identificador_matriz_filial);
CREATE INDEX IF NOT EXISTS ix_estab_inicio ON estabelecimentos (data_inicio_atividade);
CREATE INDEX IF NOT EXISTS ix_estab_contato_ativo ON estabelecimentos (cnpj_basico)
    WHERE situacao_cadastral = '02'
      AND (
          (telefone_1 IS NOT NULL AND telefone_1 <> '')
          OR (correio_eletronico IS NOT NULL AND correio_eletronico <> '')
      );

CREATE INDEX IF NOT EXISTS ix_simples_opcoes ON simples (opcao_simples, opcao_mei);
CREATE INDEX IF NOT EXISTS ix_socios_cnpj ON socios (cnpj_basico);

-- Índices parciais para a busca típica (ativa + matriz + telefone)
CREATE INDEX IF NOT EXISTS ix_estab_prospect_tel_cnpj
    ON estabelecimentos (cnpj)
    WHERE situacao_cadastral = '02'
      AND identificador_matriz_filial = '1'
      AND telefone_1 IS NOT NULL
      AND telefone_1 <> '';

CREATE INDEX IF NOT EXISTS ix_estab_prospect_tel_uf_cnpj
    ON estabelecimentos (uf, cnpj)
    WHERE situacao_cadastral = '02'
      AND identificador_matriz_filial = '1'
      AND telefone_1 IS NOT NULL
      AND telefone_1 <> '';

CREATE INDEX IF NOT EXISTS ix_estab_prospect_tel_cnae_cnpj
    ON estabelecimentos (cnae_fiscal_principal, cnpj)
    WHERE situacao_cadastral = '02'
      AND identificador_matriz_filial = '1'
      AND telefone_1 IS NOT NULL
      AND telefone_1 <> '';

CREATE INDEX IF NOT EXISTS ix_empresas_natureza_cnpj
    ON empresas (natureza_juridica, cnpj_basico);

CREATE INDEX IF NOT EXISTS ix_simples_mei_cnpj
    ON simples (cnpj_basico)
    WHERE opcao_mei = 'S';

-- ---------------------------------------------------------------------------
-- View de prospecção
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_prospectos AS
SELECT
    e.cnpj,
    e.cnpj_basico,
    e.cnpj_ordem,
    e.cnpj_dv,
    e.identificador_matriz_filial,
    CASE e.identificador_matriz_filial
        WHEN '1' THEN 'Matriz'
        WHEN '2' THEN 'Filial'
        ELSE e.identificador_matriz_filial
    END AS tipo_estabelecimento,
    emp.razao_social,
    e.nome_fantasia,
    emp.porte,
    CASE emp.porte
        WHEN '00' THEN 'Não informado'
        WHEN '01' THEN 'Microempresa (ME)'
        WHEN '03' THEN 'Pequena empresa (EPP)'
        WHEN '05' THEN 'Médio e grande'
        ELSE emp.porte
    END AS porte_descricao,
    emp.capital_social,
    emp.natureza_juridica,
    nj.descricao AS natureza_descricao,
    emp.qualificacao_responsavel,
    q.descricao AS qualificacao_responsavel_descricao,
    e.situacao_cadastral,
    CASE e.situacao_cadastral
        WHEN '01' THEN 'Nula'
        WHEN '02' THEN 'Ativa'
        WHEN '03' THEN 'Suspensa'
        WHEN '04' THEN 'Inapta'
        WHEN '08' THEN 'Baixada'
        ELSE e.situacao_cadastral
    END AS situacao_descricao,
    e.motivo_situacao_cadastral,
    m.descricao AS motivo_descricao,
    e.data_situacao_cadastral,
    e.data_inicio_atividade,
    e.cnae_fiscal_principal,
    c.descricao AS cnae_descricao,
    e.cnae_fiscal_secundaria,
    e.uf,
    e.municipio AS municipio_codigo,
    mu.nome AS municipio_nome,
    e.bairro,
    e.tipo_logradouro,
    e.logradouro,
    e.numero,
    e.complemento,
    e.cep,
    e.pais AS pais_codigo,
    p.nome AS pais_nome,
    NULLIF(TRIM(CONCAT_WS(' ', NULLIF(e.ddd_1, ''), NULLIF(e.telefone_1, ''))), '') AS telefone,
    NULLIF(TRIM(CONCAT_WS(' ', NULLIF(e.ddd_2, ''), NULLIF(e.telefone_2, ''))), '') AS telefone_2,
    NULLIF(TRIM(e.correio_eletronico), '') AS email,
    s.opcao_simples,
    s.opcao_mei,
    s.data_opcao_simples,
    s.data_opcao_mei,
    e.telefone_1,
    e.telefone_2 AS telefone_2_num,
    e.correio_eletronico
FROM estabelecimentos e
LEFT JOIN empresas emp ON emp.cnpj_basico = e.cnpj_basico
LEFT JOIN simples s ON s.cnpj_basico = e.cnpj_basico
LEFT JOIN cnaes c ON c.codigo = e.cnae_fiscal_principal
LEFT JOIN municipios mu ON mu.codigo = e.municipio
LEFT JOIN naturezas_juridicas nj ON nj.codigo = emp.natureza_juridica
LEFT JOIN qualificacoes q ON q.codigo = emp.qualificacao_responsavel
LEFT JOIN motivos m ON m.codigo = e.motivo_situacao_cadastral
LEFT JOIN paises p ON p.codigo = e.pais;

-- ---------------------------------------------------------------------------
-- Usuários da plataforma (acesso comercial)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    nome            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'cliente'
                    CHECK (role IN ('admin', 'cliente')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS ix_usuarios_ativo ON usuarios (ativo);
