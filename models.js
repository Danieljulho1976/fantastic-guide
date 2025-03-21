// server/models/equipment.js
const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Equipment {
  // Obter todos os equipamentos
  static async getAll() {
    return await dbAsync.all('SELECT * FROM equipment ORDER BY name');
  }

  // Obter um equipamento pelo ID
  static async getById(id) {
    return await dbAsync.get('SELECT * FROM equipment WHERE id = ?', [id]);
  }

  // Criar um novo equipamento
  static async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `INSERT INTO equipment (
        id, name, model, serial_number, location, 
        last_maintenance, next_maintenance, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.model || null,
        data.serial_number || null,
        data.location,
        data.last_maintenance || null,
        data.next_maintenance || null,
        data.notes || null,
        now,
        now
      ]
    );

    if (result && result.id) {
      return { id, ...data, created_at: now, updated_at: now };
    }
    throw new Error('Falha ao criar equipamento');
  }

  // Atualizar um equipamento
  static async update(id, data) {
    const equipment = await this.getById(id);
    if (!equipment) {
      throw new Error('Equipamento não encontrado');
    }

    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `UPDATE equipment SET 
        name = ?, model = ?, serial_number = ?, location = ?, 
        last_maintenance = ?, next_maintenance = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name,
        data.model || null,
        data.serial_number || null,
        data.location,
        data.last_maintenance || null,
        data.next_maintenance || null,
        data.notes || null,
        now,
        id
      ]
    );

    if (result && result.changes > 0) {
      return { id, ...data, updated_at: now };
    }
    throw new Error('Falha ao atualizar equipamento');
  }

  // Excluir um equipamento
  static async delete(id) {
    const equipment = await this.getById(id);
    if (!equipment) {
      throw new Error('Equipamento não encontrado');
    }

    // Verificar se existem ordens de serviço para este equipamento
    const orders = await dbAsync.get('SELECT COUNT(*) as count FROM service_orders WHERE equipment_id = ?', [id]);
    if (orders && orders.count > 0) {
      throw new Error('Não é possível excluir equipamento com ordens de serviço associadas');
    }

    const result = await dbAsync.run('DELETE FROM equipment WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = Equipment;

// server/models/employee.js
const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Employee {
  // Obter todos os funcionários
  static async getAll() {
    return await dbAsync.all('SELECT * FROM employees ORDER BY name');
  }

  // Obter um funcionário pelo ID
  static async getById(id) {
    return await dbAsync.get('SELECT * FROM employees WHERE id = ?', [id]);
  }

  // Criar um novo funcionário
  static async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `INSERT INTO employees (
        id, name, workload, department, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.workload,
        data.department,
        now,
        now
      ]
    );

    if (result && result.id) {
      return { id, ...data, created_at: now, updated_at: now };
    }
    throw new Error('Falha ao criar funcionário');
  }

  // Atualizar um funcionário
  static async update(id, data) {
    const employee = await this.getById(id);
    if (!employee) {
      throw new Error('Funcionário não encontrado');
    }

    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `UPDATE employees SET 
        name = ?, workload = ?, department = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name,
        data.workload,
        data.department,
        now,
        id
      ]
    );

    if (result && result.changes > 0) {
      return { id, ...data, updated_at: now };
    }
    throw new Error('Falha ao atualizar funcionário');
  }

  // Excluir um funcionário
  static async delete(id) {
    const employee = await this.getById(id);
    if (!employee) {
      throw new Error('Funcionário não encontrado');
    }

    // Verificar se existem ordens de serviço para este funcionário
    const orders = await dbAsync.get('SELECT COUNT(*) as count FROM service_orders WHERE assigned_to = ?', [id]);
    if (orders && orders.count > 0) {
      throw new Error('Não é possível excluir funcionário com ordens de serviço associadas');
    }

    const result = await dbAsync.run('DELETE FROM employees WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = Employee;

// server/models/maintenanceType.js
const { dbAsync } = require('../config/database');

class MaintenanceType {
  // Obter todos os tipos de manutenção
  static async getAll() {
    return await dbAsync.all('SELECT * FROM maintenance_types ORDER BY name');
  }

  // Obter um tipo de manutenção pelo ID
  static async getById(id) {
    return await dbAsync.get('SELECT * FROM maintenance_types WHERE id = ?', [id]);
  }

  // Obter tipo de manutenção com itens de checklist
  static async getWithChecklist(id) {
    const maintenanceType = await this.getById(id);
    if (!maintenanceType) {
      return null;
    }

    const checklistItems = await dbAsync.all(
      'SELECT * FROM checklist_items WHERE maintenance_type_id = ? ORDER BY item_order',
      [id]
    );

 // Continuação do arquivo models.js
// Modelo MaintenanceType (continuação)
class MaintenanceType {
  // Obter todos os tipos de manutenção
  static async getAll() {
    return await dbAsync.all('SELECT * FROM maintenance_types ORDER BY name');
  }

  // Obter um tipo de manutenção pelo ID
  static async getById(id) {
    return await dbAsync.get('SELECT * FROM maintenance_types WHERE id = ?', [id]);
  }

  // Obter tipo de manutenção com itens de checklist
  static async getWithChecklist(id) {
    const maintenanceType = await this.getById(id);
    if (!maintenanceType) {
      return null;
    }

    const checklistItems = await dbAsync.all(
      'SELECT * FROM checklist_items WHERE maintenance_type_id = ? ORDER BY item_order',
      [id]
    );

    // Processar opções para itens de múltipla escolha
    for (let item of checklistItems) {
      if (item.response_type === 'multiple_choice' && item.options) {
        try {
          item.options = JSON.parse(item.options);
        } catch (e) {
          console.error('Erro ao processar opções:', e);
          item.options = [];
        }
      }
    }

    return { ...maintenanceType, checklist_items: checklistItems };
  }

  // Criar um novo tipo de manutenção
  static async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `INSERT INTO maintenance_types (
        id, name, description, frequency, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.description || null,
        data.frequency,
        now
      ]
    );

    if (result && result.id) {
      const maintenanceType = { id, ...data, created_at: now };

      // Se houver itens de checklist, cria-los
      if (data.checklist_items && Array.isArray(data.checklist_items)) {
        for (let i = 0; i < data.checklist_items.length; i++) {
          const item = data.checklist_items[i];
          const itemId = uuidv4();
          
          // Prepara as opções para itens de múltipla escolha
          let options = null;
          if (item.response_type === 'multiple_choice' && item.options) {
            options = JSON.stringify(item.options);
          }

          await dbAsync.run(
            `INSERT INTO checklist_items (
              id, maintenance_type_id, description, item_order, response_type, required, options, unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId,
              id,
              item.description,
              i + 1, // Usar o índice como ordem
              item.response_type,
              item.required ? 1 : 0,
              options,
              item.unit || null
            ]
          );
        }
      }

      return maintenanceType;
    }
    throw new Error('Falha ao criar tipo de manutenção');
  }

  // Atualizar um tipo de manutenção
  static async update(id, data) {
    const maintenanceType = await this.getById(id);
    if (!maintenanceType) {
      throw new Error('Tipo de manutenção não encontrado');
    }

    const result = await dbAsync.run(
      `UPDATE maintenance_types SET 
        name = ?, description = ?, frequency = ?
      WHERE id = ?`,
      [
        data.name,
        data.description || null,
        data.frequency,
        id
      ]
    );

    // Se houver itens de checklist para atualizar
    if (data.checklist_items && Array.isArray(data.checklist_items)) {
      // Remover itens antigos
      await dbAsync.run('DELETE FROM checklist_items WHERE maintenance_type_id = ?', [id]);
      
      // Inserir novos itens
      for (let i = 0; i < data.checklist_items.length; i++) {
        const item = data.checklist_items[i];
        const itemId = uuidv4();
        
        // Prepara as opções para itens de múltipla escolha
        let options = null;
        if (item.response_type === 'multiple_choice' && item.options) {
          options = JSON.stringify(item.options);
        }

        await dbAsync.run(
          `INSERT INTO checklist_items (
            id, maintenance_type_id, description, item_order, response_type, required, options, unit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            id,
            item.description,
            i + 1, // Usar o índice como ordem
            item.response_type,
            item.required ? 1 : 0,
            options,
            item.unit || null
          ]
        );
      }
    }

    if (result && result.changes > 0) {
      return { id, ...data };
    }
    throw new Error('Falha ao atualizar tipo de manutenção');
  }

  // Excluir um tipo de manutenção
  static async delete(id) {
    const maintenanceType = await this.getById(id);
    if (!maintenanceType) {
      throw new Error('Tipo de manutenção não encontrado');
    }

    // Verificar se existem ordens de serviço para este tipo de manutenção
    const orders = await dbAsync.get('SELECT COUNT(*) as count FROM service_orders WHERE maintenance_type_id = ?', [id]);
    if (orders && orders.count > 0) {
      throw new Error('Não é possível excluir tipo de manutenção com ordens de serviço associadas');
    }

    // Excluir os itens de checklist relacionados
    await dbAsync.run('DELETE FROM checklist_items WHERE maintenance_type_id = ?', [id]);
    
    // Excluir o tipo de manutenção
    const result = await dbAsync.run('DELETE FROM maintenance_types WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = MaintenanceType;

// server/models/checklistItem.js
const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ChecklistItem {
  // Obter todos os itens de checklist
  static async getAll() {
    return await dbAsync.all('SELECT * FROM checklist_items ORDER BY maintenance_type_id, item_order');
  }

  // Obter um item de checklist pelo ID
  static async getById(id) {
    return await dbAsync.get('SELECT * FROM checklist_items WHERE id = ?', [id]);
  }

  // Obter itens por tipo de manutenção
  static async getByMaintenanceType(maintenanceTypeId) {
    const items = await dbAsync.all(
      'SELECT * FROM checklist_items WHERE maintenance_type_id = ? ORDER BY item_order',
      [maintenanceTypeId]
    );

    // Processar opções para itens de múltipla escolha
    for (let item of items) {
      if (item.response_type === 'multiple_choice' && item.options) {
        try {
          item.options = JSON.parse(item.options);
        } catch (e) {
          console.error('Erro ao processar opções:', e);
          item.options = [];
        }
      }
    }

    return items;
  }

  // Criar um novo item de checklist
  static async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Preparar opções para itens de múltipla escolha
    let options = null;
    if (data.response_type === 'multiple_choice' && data.options) {
      options = JSON.stringify(data.options);
    }

    const result = await dbAsync.run(
      `INSERT INTO checklist_items (
        id, maintenance_type_id, description, item_order, response_type, 
        required, options, unit, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.maintenance_type_id,
        data.description,
        data.item_order,
        data.response_type,
        data.required ? 1 : 0,
        options,
        data.unit || null,
        now
      ]
    );

    if (result && result.id) {
      return { id, ...data, created_at: now };
    }
    throw new Error('Falha ao criar item de checklist');
  }

  // Atualizar um item de checklist
  static async update(id, data) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('Item de checklist não encontrado');
    }

    // Preparar opções para itens de múltipla escolha
    let options = null;
    if (data.response_type === 'multiple_choice' && data.options) {
      options = JSON.stringify(data.options);
    }

    const result = await dbAsync.run(
      `UPDATE checklist_items SET 
        maintenance_type_id = ?, description = ?, item_order = ?, 
        response_type = ?, required = ?, options = ?, unit = ?
      WHERE id = ?`,
      [
        data.maintenance_type_id,
        data.description,
        data.item_order,
        data.response_type,
        data.required ? 1 : 0,
        options,
        data.unit || null,
        id
      ]
    );

    if (result && result.changes > 0) {
      return { id, ...data };
    }
    throw new Error('Falha ao atualizar item de checklist');
  }

  // Excluir um item de checklist
  static async delete(id) {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('Item de checklist não encontrado');
    }

    // Verificar se existem respostas para este item
    const responses = await dbAsync.get('SELECT COUNT(*) as count FROM order_responses WHERE checklist_item_id = ?', [id]);
    if (responses && responses.count > 0) {
      throw new Error('Não é possível excluir item com respostas associadas');
    }

    const result = await dbAsync.run('DELETE FROM checklist_items WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = ChecklistItem;

// server/models/serviceOrder.js
const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ServiceOrder {
  // Obter todas as ordens de serviço
  static async getAll(filters = {}) {
    let query = `
      SELECT so.*, 
        e.name as equipment_name, 
        mt.name as maintenance_type_name,
        emp.name as assigned_to_name
      FROM service_orders so
      LEFT JOIN equipment e ON so.equipment_id = e.id
      LEFT JOIN maintenance_types mt ON so.maintenance_type_id = mt.id
      LEFT JOIN employees emp ON so.assigned_to = emp.id
    `;

    const params = [];
    const conditions = [];

    // Filtrar por status
    if (filters.status) {
      conditions.push('so.status = ?');
      params.push(filters.status);
    }

    // Filtrar por data agendada
    if (filters.start_date) {
      conditions.push('so.scheduled_date >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('so.scheduled_date <= ?');
      params.push(filters.end_date);
    }

    // Filtrar por equipamento
    if (filters.equipment_id) {
      conditions.push('so.equipment_id = ?');
      params.push(filters.equipment_id);
    }

    // Filtrar por tipo de manutenção
    if (filters.maintenance_type_id) {
      conditions.push('so.maintenance_type_id = ?');
      params.push(filters.maintenance_type_id);
    }

    // Filtrar por responsável
    if (filters.assigned_to) {
      conditions.push('so.assigned_to = ?');
      params.push(filters.assigned_to);
    }

    // Aplicar filtros
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Ordenação
    query += ' ORDER BY so.scheduled_date DESC';

    return await dbAsync.all(query, params);
  }

  // Obter uma ordem de serviço pelo ID
  static async getById(id) {
    const order = await dbAsync.get(`
      SELECT so.*, 
        e.name as equipment_name, 
        mt.name as maintenance_type_name,
        emp.name as assigned_to_name
      FROM service_orders so
      LEFT JOIN equipment e ON so.equipment_id = e.id
      LEFT JOIN maintenance_types mt ON so.maintenance_type_id = mt.id
      LEFT JOIN employees emp ON so.assigned_to = emp.id
      WHERE so.id = ?
    `, [id]);

    if (!order) {
      return null;
    }

    // Obter as respostas do checklist
    const responses = await dbAsync.all(`
      SELECT or.*, ci.description, ci.response_type, ci.unit
      FROM order_responses or
      JOIN checklist_items ci ON or.checklist_item_id = ci.id
      WHERE or.service_order_id = ?
      ORDER BY ci.item_order
    `, [id]);

    return { ...order, responses };
  }

  // Obter uma ordem de serviço com o checklist para preenchimento
  static async getWithChecklist(id) {
    const order = await this.getById(id);
    if (!order) {
      return null;
    }

    // Obter os itens do checklist do tipo de manutenção
    const checklistItems = await dbAsync.all(`
      SELECT * FROM checklist_items 
      WHERE maintenance_type_id = ? 
      ORDER BY item_order
    `, [order.maintenance_type_id]);

    // Processar opções para itens de múltipla escolha
    for (let item of checklistItems) {
      if (item.response_type === 'multiple_choice' && item.options) {
        try {
          item.options = JSON.parse(item.options);
        } catch (e) {
          console.error('Erro ao processar opções:', e);
          item.options = [];
        }
      }
    }

    // Mapear respostas existentes para os itens do checklist
    const responseMap = {};
    if (order.responses) {
      for (const response of order.responses) {
        responseMap[response.checklist_item_id] = response;
      }
    }

    // Adicionar respostas aos itens do checklist
    const items = checklistItems.map(item => {
      const response = responseMap[item.id];
      return {
        ...item,
        response_value: response ? response.response_value : null,
        response_id: response ? response.id : null
      };
    });

    return { ...order, checklist_items: items };
  }

  // Criar uma nova ordem de serviço
  static async create(data) {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Gerar número de ordem sequencial (ex: OS202503001)
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const lastOrder = await dbAsync.get(
      "SELECT order_number FROM service_orders ORDER BY order_number DESC LIMIT 1"
    );
    
    let seq = 1;
    if (lastOrder && lastOrder.order_number) {
      const lastSeq = parseInt(lastOrder.order_number.slice(-3));
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
    
    const orderNumber = `OS${year}${month}${seq.toString().padStart(3, '0')}`;

    const result = await dbAsync.run(
      `INSERT INTO service_orders (
        id, order_number, equipment_id, maintenance_type_id, assigned_to,
        status, scheduled_date, completion_date, completion_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orderNumber,
        data.equipment_id,
        data.maintenance_type_id,
        data.assigned_to,
        data.status || 'pending',
        data.scheduled_date,
        data.completion_date || null,
        data.completion_notes || null,
        now,
        now
      ]
    );

    if (result && result.id) {
      return { id, order_number: orderNumber, ...data, created_at: now, updated_at: now };
    }
    throw new Error('Falha ao criar ordem de serviço');
  }

  // Atualizar uma ordem de serviço
  static async update(id, data) {
    const order = await this.getById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const now = new Date().toISOString();

    const result = await dbAsync.run(
      `UPDATE service_orders SET 
        equipment_id = ?, maintenance_type_id = ?, assigned_to = ?,
        status = ?, scheduled_date = ?, completion_date = ?, completion_notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.equipment_id,
        data.maintenance_type_id,
        data.assigned_to,
        data.status,
        data.scheduled_date,
        data.completion_date || null,
        data.completion_notes || null,
        now,
        id
      ]
    );

    if (result && result.changes > 0) {
      return { id, ...data, updated_at: now };
    }
    throw new Error('Falha ao atualizar ordem de serviço');
  }

  // Atualizar o status de uma ordem de serviço
  static async updateStatus(id, status, completionNotes = null) {
    const order = await this.getById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const now = new Date().toISOString();
    let completionDate = null;
    
    // Se o status for 'completed', atualiza a data de conclusão
    if (status === 'completed') {
      completionDate = now;
    }

    const result = await dbAsync.run(
      `UPDATE service_orders SET 
        status = ?, completion_date = ?, completion_notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        status,
        completionDate,
        completionNotes,
        now,
        id
      ]
    );

    if (result && result.changes > 0) {
      return {
        id,
        status,
        completion_date: completionDate,
        completion_notes: completionNotes,
        updated_at: now
      };
    }
    throw new Error('Falha ao atualizar status da ordem de serviço');
  }

  // Excluir uma ordem de serviço
  static async delete(id) {
    const order = await this.getById(id);
    if (!order) {
      throw new Error('Ordem de serviço não encontrada');
    }

    // Excluir respostas relacionadas
    await dbAsync.run('DELETE FROM order_responses WHERE service_order_id = ?', [id]);
    
    // Excluir a ordem de serviço
    const result = await dbAsync.run('DELETE FROM service_orders WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = ServiceOrder;

// server/models/orderResponse.js
const { dbAsync } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class OrderResponse {
  // Obter todas as respostas de uma ordem de serviço
  static async getByServiceOrder(serviceOrderId) {
    return await dbAsync.all(`
      SELECT or.*, ci.description, ci.response_type, ci.unit
      FROM order_responses or
      JOIN checklist_items ci ON or.checklist_item_id = ci.id
      WHERE or.service_order_id = ?
      ORDER BY ci.item_order
    `, [serviceOrderId]);
  }

  // Obter uma resposta pelo ID
  static async getById(id) {
    return await dbAsync.get(`
      SELECT or.*, ci.description, ci.response_type, ci.unit
      FROM order_responses or
      JOIN checklist_items ci ON or.checklist_item_id = ci.id
      WHERE or.id = ?
    `, [id]);
  }

  // Criar ou atualizar uma resposta
  static async createOrUpdate(data) {
    const now = new Date().toISOString();

    // Verificar se já existe uma resposta para este item na ordem
    const existingResponse = await dbAsync.get(
      'SELECT id FROM order_responses WHERE service_order_id = ? AND checklist_item_id = ?',
      [data.service_order_id, data.checklist_item_id]
    );

    if (existingResponse) {
      // Atualizar resposta existente
      const result = await dbAsync.run(
        `UPDATE order_responses SET 
          response_value = ?, updated_at = ?
        WHERE id = ?`,
        [
          data.response_value,
          now,
          existingResponse.id
        ]
      );

      if (result && result.changes > 0) {
        return { id: existingResponse.id, ...data, updated_at: now };
      }
      throw new Error('Falha ao atualizar resposta');
    } else {
      // Criar nova resposta
      const id = uuidv4();

      const result = await dbAsync.run(
        `INSERT INTO order_responses (
          id, service_order_id, checklist_item_id, response_value, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.service_order_id,
          data.checklist_item_id,
          data.response_value,
          now,
          now
        ]
      );

      if (result && result.id) {
        return { id, ...data, created_at: now, updated_at: now };
      }
      throw new Error('Falha ao criar resposta');
    }
  }

  // Salvar múltiplas respostas em uma transação
  static async saveResponses(serviceOrderId, responses) {
    // Iniciar transação
    await dbAsync.run('BEGIN TRANSACTION');

    try {
      const results = [];

      for (const response of responses) {
        const result = await this.createOrUpdate({
          service_order_id: serviceOrderId,
          checklist_item_id: response.checklist_item_id,
          response_value: response.response_value
        });
        results.push(result);
      }

      // Commit transação
      await dbAsync.run('COMMIT');
      return results;
    } catch (error) {
      // Rollback em caso de erro
      await dbAsync.run('ROLLBACK');
      throw error;
    }
  }

  // Excluir uma resposta
  static async delete(id) {
    const response = await this.getById(id);
    if (!response) {
      throw new Error('Resposta não encontrada');
    }

    const result = await dbAsync.run('DELETE FROM order_responses WHERE id = ?', [id]);
    return result && result.changes > 0;
  }
}

module.exports = OrderResponse;

// Exportar todos os modelos
module.exports = {
  Equipment: require('./equipment'),
  Employee: require('./employee'),
  MaintenanceType,
  ChecklistItem,
  ServiceOrder,
  OrderResponse
};