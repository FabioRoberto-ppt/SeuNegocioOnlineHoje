// src/config/migrate.js
// Execute com: node src/config/migrate.js
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('⏳ Criando tabelas...');

    await client.query(`
      -- Tabela de pedidos
      CREATE TABLE IF NOT EXISTS pedidos (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome        VARCHAR(200)  NOT NULL,
        whatsapp    VARCHAR(30)   NOT NULL,
        marca       VARCHAR(200)  NOT NULL,
        o_que_vende TEXT          NOT NULL,
        cores       VARCHAR(200),
        tem_logo    VARCHAR(30)   NOT NULL,
        tem_fotos   VARCHAR(50)   NOT NULL,
        referencia  TEXT,
        info_extra  TEXT,
        status      VARCHAR(30)   NOT NULL DEFAULT 'aguardando_confirmacao',
        -- status possíveis:
        --   aguardando_confirmacao
        --   pix_confirmado
        --   em_desenvolvimento
        --   aguardando_aprovacao
        --   concluido
        --   cancelado
        comprovante_url  VARCHAR(500),
        comprovante_nome VARCHAR(200),
        valor_total      NUMERIC(10,2) DEFAULT 75.00,
        valor_entrada    NUMERIC(10,2) DEFAULT 37.50,
        criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      -- Índices para buscas rápidas no painel
      CREATE INDEX IF NOT EXISTS idx_pedidos_status    ON pedidos(status);
      CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em ON pedidos(criado_em DESC);
      CREATE INDEX IF NOT EXISTS idx_pedidos_whatsapp  ON pedidos(whatsapp);
    `);

    await client.query(`
      -- Função que atualiza atualizado_em automaticamente
      CREATE OR REPLACE FUNCTION set_atualizado_em()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.atualizado_em = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trg_pedidos_atualizado_em ON pedidos;
      CREATE TRIGGER trg_pedidos_atualizado_em
        BEFORE UPDATE ON pedidos
        FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
    `);

    console.log('✅ Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();