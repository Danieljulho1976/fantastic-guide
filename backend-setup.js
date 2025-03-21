// server/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Cria uma instância do banco de dados
const dbPath = path.resolve(__dirname, '../db/manutencao.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite');
  }
});

// Wrapper para executar queries com Promises
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          console.error('Erro ao executar SQL:', sql);
          console.error(err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  },
  
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Erro ao executar SQL:', sql);
          console.error(err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },
  
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Erro ao executar SQL:', sql);
          console.error(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },
  
  close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco de dados:', err.message);
          reject(err);
        } else {
          console.log('Conexão com banco de dados fechada');
          resolve();
        }
      });
    });
  }
};

module.exports = { db, dbAsync };

// server/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Importação das rotas
const equipmentRoutes = require('./routes/equipment');
const employeesRoutes = require('./routes/employees');
const maintenanceTypesRoutes = require('./routes/maintenanceTypes');
const serviceOrdersRoutes = require('./routes/serviceOrders');

// Inicializa o Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Configuração das rotas
app.use('/api/equipment', equipmentRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/maintenance-types', maintenanceTypesRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);

// Rota para servir arquivos estáticos (frontend)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Ocorreu um erro no servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

module.exports = app;

// server/server.js
const app = require('./app');
const { db } = require('./config/database');
const { initializeDatabase } = require('./db/migrations');

const PORT = process.env.PORT || 3000;

// Inicializa o banco de dados antes de iniciar o servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Falha ao inicializar o banco de dados:', err);
    process.exit(1);
  });

// Gerenciamento de encerramento
process.on('SIGINT', () => {
  db.close();
  console.log('Aplicação encerrada');
  process.exit(0);
});
