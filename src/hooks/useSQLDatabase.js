import { useEffect, useState, useRef } from 'react';
import initSqlJs from 'sql.js';

export function useSQLDatabase(flips) {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dbRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function initDB() {
      try {
        const SQL = await initSqlJs({
          locateFile: _file => `/sql-wasm.wasm`,
        });

        if (!mounted) return;

        const database = new SQL.Database();

        // Create a simple flips table (no categories for now)
        database.run(`
          CREATE TABLE flips (
            id INTEGER,
            item TEXT NOT NULL,
            buy_price INTEGER,
            sell_price INTEGER,
            profit INTEGER,
            roi REAL,
            quantity INTEGER,
            buy_time TEXT,
            sell_time TEXT,
            account TEXT,
            flip_duration_minutes INTEGER,
            date TEXT
          )
        `);

        // Insert flip data
        if (flips && flips.length > 0) {
          const stmt = database.prepare(`
            INSERT INTO flips 
            (id, item, buy_price, sell_price, profit, roi, quantity, buy_time, sell_time, account, flip_duration_minutes, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          flips.forEach((flip, index) => {
            const itemName = flip.item || flip.item_name || 'Unknown';
            const profit = flip.profit || 0;
            const roi = flip.roi || 0;
            const account = flip.account || 'main';

            // Handle date formatting
            let dateStr = flip.date;
            if (!dateStr && flip.sell_time) {
              dateStr = new Date(flip.sell_time).toISOString().split('T')[0];
            }
            if (!dateStr) {
              dateStr = new Date().toISOString().split('T')[0];
            }

            // Handle various field name formats
            const buyPrice =
              flip.avgBuyPrice || flip.avg_buy_price || flip.buyPrice || flip.buy_price || 0;
            const sellPrice =
              flip.avgSellPrice || flip.avg_sell_price || flip.sellPrice || flip.sell_price || 0;
            const buyTime =
              flip.firstBuyTime || flip.first_buy_time || flip.buy_time || flip.buyTime || '';
            const sellTime =
              flip.lastSellTime || flip.last_sell_time || flip.sell_time || flip.sellTime || '';
            const duration = flip.hoursHeld
              ? Math.round(flip.hoursHeld * 60)
              : flip.flip_duration_minutes || flip.duration || 0;
            const actualQuantity = flip.bought || flip.sold || flip.quantity || 1;

            stmt.run([
              index,
              itemName,
              buyPrice,
              sellPrice,
              profit,
              roi,
              actualQuantity,
              buyTime,
              sellTime,
              account,
              duration,
              dateStr,
            ]);
          });

          stmt.free();
        }

        dbRef.current = database;
        setDb(database);
        setLoading(false);

        console.log(`✅ SQL Database initialized with ${flips?.length || 0} flips`);
      } catch (err) {
        console.error('Failed to initialize SQL database:', err);
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    if (flips && flips.length > 0) {
      initDB();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
      if (dbRef.current) {
        try {
          dbRef.current.close();
          dbRef.current = null;
        } catch (e) {
          console.warn('Error closing database:', e);
        }
      }
    };
  }, [flips]);

  const executeQuery = (sql, params = []) => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    let stmt;
    try {
      stmt = db.prepare(sql);

      if (Array.isArray(params) && params.length > 0) {
        stmt.bind(params);
      }

      const columnNames = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) {
        const rowObject = stmt.getAsObject();
        const rowArray = columnNames.map(col => rowObject[col]);
        rows.push(rowArray);
      }

      if (rows.length === 0) {
        return { columns: columnNames, values: [] };
      }
      return { columns: columnNames, values: rows };
    } catch (err) {
      console.error('SQL execution error:', err);
      throw err;
    } finally {
      if (stmt) {
        try {
          stmt.free();
        } catch (freeErr) {
          console.warn('Failed to free statement:', freeErr);
        }
      }
    }
  };

  return {
    executeQuery,
    loading,
    error,
  };
}
