// Simple database mock for demo mode
const database = {
  query: async (sql, params = []) => {
    console.log(`[DB] Query: ${sql}`, params);
    
    // Mock response
    return {
      rows: [],
      rowCount: 0
    };
  },
  
  connect: async () => {
    console.log('[DB] Connected to demo database');
    return true;
  },
  
  disconnect: async () => {
    console.log('[DB] Disconnected from demo database');
    return true;
  }
};

const connectDatabases = async () => {
  if (process.env.SKIP_DATABASE === 'true') {
    console.log('[DB] Skipping database connection (demo mode)');
    return true;
  }
  
  return await database.connect();
};

module.exports = { database, connectDatabases };