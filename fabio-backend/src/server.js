// src/server.js
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const session      = require('express-session');
const path         = require('path');

const pedidosRoutes = require('./routes/pedidos');
const adminRoutes   = require('./routes/admin');
const pagamentosRoutes = require('./routes/pagamentos');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── SEGURANÇA ────────────────────────────────────────────────────────────────

// Cabeçalhos de segurança HTTP
app.use(helmet({
  contentSecurityPolicy: false, // desativa para facilitar o painel inline
}));

// CORS — permite apenas seu frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // coloque a URL do seu site em produção
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));

// Rate limit — máx 20 pedidos por IP a cada 15 min (protege contra spam)
const limiterPedidos = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit mais rigoroso para o login (máx 10 tentativas / 15 min)
const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── PARSING ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── SESSÃO (para o painel admin) ─────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret-troque-em-producao',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production', // HTTPS em prod
    maxAge:   8 * 60 * 60 * 1000, // 8 horas
    sameSite: 'lax',
  },
}));

// ─── ARQUIVOS ESTÁTICOS ────────────────────────────────────────────────────────

// Comprovantes — acessíveis apenas com a URL exata (sem listagem de diretório)
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'), {
  index: false,   // impede listagem
  dotfiles: 'deny',
}));

// Serve o frontend (HTML/CSS/JS) da pasta /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/api/pedidos', limiterPedidos, pedidosRoutes);
app.use('/admin/login', limiterLogin);
app.use('/admin',       adminRoutes);
app.use('/api/pagamentos', pagamentosRoutes);

// ─── HEALTH CHECK (Render usa isso para saber se o app está vivo) ──────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// ─── ERRO GLOBAL ──────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ─── INICIAR ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Painel admin:    http://localhost:${PORT}/admin`);
  console.log(`🔗 API pedidos:     http://localhost:${PORT}/api/pedidos`);
  console.log(`🌍 Ambiente:        ${process.env.NODE_ENV || 'development'}\n`);
});