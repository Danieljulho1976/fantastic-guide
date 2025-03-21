// server/db/migrations/index.js
const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../../config/database');

const createTables = async () => {
  // Tabela de equipamentos
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      location TEXT NOT NULL,
      last_maintenance TEXT,
      next_maintenance TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de funcionários
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workload TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de tipos de manutenção
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS maintenance_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de itens de checklist
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      maintenance_type_id TEXT,
      description TEXT NOT NULL,
      item_order INTEGER NOT NULL,
      response_type TEXT NOT NULL CHECK (response_type IN ('yes_no_na', 'numeric', 'text', 'multiple_choice')),
      required BOOLEAN DEFAULT 1,
      options TEXT,
      unit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (maintenance_type_id) REFERENCES maintenance_types (id)
    )
  `);

  // Tabela de ordens de serviço
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      equipment_id TEXT,
      maintenance_type_id TEXT,
      assigned_to TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
      scheduled_date TEXT NOT NULL,
      completion_date TEXT,
      completion_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipment_id) REFERENCES equipment (id),
      FOREIGN KEY (maintenance_type_id) REFERENCES maintenance_types (id),
      FOREIGN KEY (assigned_to) REFERENCES employees (id)
    )
  `);

  // Tabela de respostas às ordens
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS order_responses (
      id TEXT PRIMARY KEY,
      service_order_id TEXT,
      checklist_item_id TEXT,
      response_value TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_order_id) REFERENCES service_orders (id),
      FOREIGN KEY (checklist_item_id) REFERENCES checklist_items (id)
    )
  `);

  // Criar índices para melhor performance
  await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(name)');
  await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment(next_maintenance)');
  await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status)');
  await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled_date ON service_orders(scheduled_date)');
  await dbAsync.run('CREATE INDEX IF NOT EXISTS idx_order_responses_service_order ON order_responses(service_order_id)');
};

const insertMaintenanceTypes = async () => {
  // Verificar se já existem registros
  const count = await dbAsync.get('SELECT COUNT(*) as count FROM maintenance_types');
  if (count && count.count > 0) return;

  // Inserir tipos de manutenção
  const maintenanceTypes = [
    {
      id: 'ac6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b0',
      name: 'Preventiva Mensal de Ar Condicionado',
      description: 'Manutenção preventiva mensal em equipamentos de ar condicionado',
      frequency: 'monthly'
    },
    {
      id: 'bc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b1',
      name: 'Preventiva Mensal de Quadros Elétricos',
      description: 'Manutenção preventiva mensal em quadros elétricos',
      frequency: 'monthly'
    },
    {
      id: 'cc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b2',
      name: 'Ronda Diária de Geradores',
      description: 'Inspeção diária de geradores',
      frequency: 'daily'
    },
    {
      id: 'dc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b3',
      name: 'Ronda Diária de Bombas de Recalque',
      description: 'Inspeção diária de bombas de recalque',
      frequency: 'daily'
    }
  ];

  for (const type of maintenanceTypes) {
    await dbAsync.run(
      'INSERT INTO maintenance_types (id, name, description, frequency) VALUES (?, ?, ?, ?)',
      [type.id, type.name, type.description, type.frequency]
    );
  }
};

const insertChecklistItems = async () => {
  // Verificar se já existem registros
  const count = await dbAsync.get('SELECT COUNT(*) as count FROM checklist_items');
  if (count && count.count > 0) return;

  // Inserir itens de checklist para Ar Condicionado
  const acItems = [
    { description: 'Limpeza do filtro de ar', item_order: 1, response_type: 'yes_no_na', required: 1 },
    { description: 'Verificação de vazamentos de gás refrigerante', item_order: 2, response_type: 'yes_no_na', required: 1 },
    { description: 'Lubrificação dos componentes mecânicos', item_order: 3, response_type: 'yes_no_na', required: 1 },
    { description: 'Verificação do sistema elétrico', item_order: 4, response_type: 'yes_no_na', required: 1 },
    { description: 'Verificação da pressão do sistema', item_order: 5, response_type: 'numeric', required: 1, unit: 'PSI' },
    { description: 'Verificação da temperatura de saída de ar', item_order: 6, response_type: 'numeric', required: 1, unit: '°C' },
    { description: 'Verificação do controle remoto', item_order: 7, response_type: 'yes_no_na', required: 1 },
    { description: 'Verificação do sistema de dreno', item_order: 8, response_type: 'yes_no_na', required: 1 },
    { description: 'Medir TENSÃO(V) do Equipamento', item_order: 9, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medir CORRENTE (A) do Equipamento', item_order: 10, response_type: 'numeric', required: 1, unit: 'A' }
  ];

  for (const item of acItems) {
    await dbAsync.run(
      'INSERT INTO checklist_items (id, maintenance_type_id, description, item_order, response_type, required, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        generateUUID(),
        'ac6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b0',
        item.description,
        item.item_order,
        item.response_type,
        item.required,
        item.unit || null
      ]
    );
  }

  // Inserir itens de checklist para Quadros Elétricos
  const elItems = [
    { description: 'Limpeza geral do gabinete', item_order: 1, response_type: 'yes_no_na', required: 1 },
    { description: 'Verificar se o quadro possui tranca ou cadeado na porta', item_order: 2, response_type: 'yes_no_na', required: 1 },
    { description: 'Realizar reaperto de possível', item_order: 3, response_type: 'yes_no_na', required: 1 },
    { description: 'Medição de Tensão entre Fases (RS)', item_order: 4, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Tensão entre Fases (RT)', item_order: 5, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Tensão entre Fases (ST)', item_order: 6, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Tensão Fase/Neutro (RN)', item_order: 7, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Tensão Fase/Neutro (SN)', item_order: 8, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Tensão Fase/Neutro (TN)', item_order: 9, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Medição de Corrente (Fase R)', item_order: 10, response_type: 'numeric', required: 1, unit: 'A' },
    { description: 'Medição de Corrente (Fase S)', item_order: 11, response_type: 'numeric', required: 1, unit: 'A' },
    { description: 'Medição de Corrente (Fase T)', item_order: 12, response_type: 'numeric', required: 1, unit: 'A' },
    { description: 'Medição de Tensão Fase/Terra', item_order: 13, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Verificar sinais de aquecimento', item_order: 14, response_type: 'yes_no_na', required: 1 }
  ];

  for (const item of elItems) {
    await dbAsync.run(
      'INSERT INTO checklist_items (id, maintenance_type_id, description, item_order, response_type, required, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        generateUUID(),
        'bc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b1',
        item.description,
        item.item_order,
        item.response_type,
        item.required,
        item.unit || null
      ]
    );
  }

  // Inserir itens de checklist para Geradores
  const genItems = [
    { description: 'Nível do óleo diesel (litros)', item_order: 1, response_type: 'numeric', required: 1, unit: 'L' },
    { description: 'Tensão da bateria (V)', item_order: 2, response_type: 'numeric', required: 1, unit: 'V' },
    { description: 'Nível do óleo lubrificante', item_order: 3, response_type: 'multiple_choice', required: 1, options: JSON.stringify(['OK', 'NOK']) },
    { description: 'Nível da água do radiador', item_order: 4, response_type: 'multiple_choice', required: 1, options: JSON.stringify(['OK', 'NOK']) },
    { description: 'Funcionamento do sistema de pré-aquecimento', item_order: 5, response_type: 'multiple_choice', required: 1, options: JSON.stringify(['OK', 'NOK']) }
  ];

  for (const item of genItems) {
    await dbAsync.run(
      'INSERT INTO checklist_items (id, maintenance_type_id, description, item_order, response_type, required, unit, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        generateUUID(),
        'cc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b2',
        item.description,
        item.item_order,
        item.response_type,
        item.required,
        item.unit || null,
        item.options || null
      ]
    );
  }

  // Inserir itens de checklist para Bombas
  const pumpItems = [
    { description: 'Verificar pontos de vazamento na bomba/tubulações', item_order: 1, response_type: 'yes_no_na', required: 1 },
    { description: 'Bomba em uso', item_order: 2, response_type: 'multiple_choice', required: 1, options: JSON.stringify(['BOMBA 01', 'BOMBA 02']) },
    { description: 'Condições gerais do quadro elétrico', item_order: 3, response_type: 'yes_no_na', required: 1 },
    { description: 'Corrente Fase R (A)', item_order: 4, response_type: 'numeric', required: 1, unit: 'A' },
    { description: 'Corrente Fase S (A)', item_order: 5, response_type: 'numeric', required: 1, unit: 'A' },
    { description: 'Corrente Fase T (A)', item_order: 6, response_type: 'numeric', required: 1, unit: 'A' }
  ];

  for (const item of pumpItems) {
    await dbAsync.run(
      'INSERT INTO checklist_items (id, maintenance_type_id, description, item_order, response_type, required, unit, options) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        generateUUID(),
        'dc6a7e7a-c6a9-4c1f-8f7d-d3f2d7e8c9b3',
        item.description,
        item.item_order,
        item.response_type,
        item.required,
        item.unit || null,
        item.options || null
      ]
    );
  }
};

// Função auxiliar para gerar UUIDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para garantir que o diretório do banco de dados existe
const ensureDatabaseDir = () => {
  const dbDir = path.resolve(__dirname, '..');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
};

// Função principal para inicializar o banco de dados
const initializeDatabase = async () => {
  console.log('Inicializando banco de dados...');
  
  ensureDatabaseDir();
  
  try {
    await createTables();
    await insertMaintenanceTypes();
    await insertChecklistItems();
    console.log('Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

module.exports = { initializeDatabase };
