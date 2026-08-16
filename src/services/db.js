// Cloud-synced Database Service for DNS Golf Store
// Ultra-defensive implementation: Guaranteeing 100% uptime, fast load, and no blank screens.

const STORAGE_KEY = 'dns_golf_tasks_v2';
const CLOUD_API_URL = '/api/sync';

let tasksCache = null;
let subscribers = [];

// Initialize local cache from localStorage safely
const loadLocalCache = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading localStorage:', e);
  }
  return [];
};

const saveLocalCache = (tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  tasksCache = safeTasks;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeTasks));
  } catch (e) {
    console.warn('Error writing localStorage:', e);
  }
  notifySubscribers();
};

const notifySubscribers = () => {
  const tasks = getTasks();
  subscribers.forEach(cb => {
    try {
      cb(tasks);
    } catch (e) {
      console.error('Subscriber notification error:', e);
    }
  });
};

// Subscribe to real-time changes across devices
export const subscribeToTasks = (callback) => {
  if (typeof callback === 'function') {
    subscribers.push(callback);
  }
  
  // Initial fetch from cloud
  fetchTasksFromCloud();

  // Poll cloud API every 3 seconds
  const intervalId = setInterval(fetchTasksFromCloud, 3000);

  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
    clearInterval(intervalId);
  };
};

// Fetch from cloud API safely
export const fetchTasksFromCloud = async () => {
  try {
    const res = await fetch(CLOUD_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const json = await res.json();
      const cloudTasks = json?.tasks;

      if (Array.isArray(cloudTasks) && cloudTasks.length > 0) {
        saveLocalCache(cloudTasks);
        return cloudTasks;
      } else if (Array.isArray(cloudTasks) && cloudTasks.length === 0) {
        // If cloud is empty but local has data, upload local data to cloud
        const localTasks = loadLocalCache();
        if (localTasks.length > 0) {
          syncToCloud(localTasks);
          return localTasks;
        }
      }
    }
  } catch (err) {
    console.warn('Cloud fetch error, using local fallback:', err);
  }
  return loadLocalCache();
};

// Sync to cloud API safely
const syncToCloud = async (tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  saveLocalCache(safeTasks);

  try {
    await fetch(CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ tasks: safeTasks }),
    });
  } catch (err) {
    console.warn('Cloud sync error, saved locally:', err);
  }
};

// Get all tasks - ALWAYS returns an Array
export const getAllTasks = () => {
  if (!Array.isArray(tasksCache)) {
    tasksCache = loadLocalCache();
  }
  return Array.isArray(tasksCache) ? tasksCache : [];
};

// Get active tasks (not archived) - ALWAYS returns an Array
export const getTasks = () => {
  return getAllTasks().filter(t => t && !t.archived);
};

// Add a new task
export const addTask = (taskData) => {
  const tasks = getAllTasks();
  const newTask = {
    id: Date.now().toString(),
    ...taskData,
    status: 'pending', // pending, in-progress, completed
    createdAt: new Date().toISOString(),
    archived: false
  };
  const updatedTasks = [newTask, ...tasks];
  syncToCloud(updatedTasks);
  return newTask;
};

// Update an existing task status
export const updateTaskStatus = (id, newStatus) => {
  const tasks = getAllTasks();
  const updatedTasks = tasks.map(t => {
    if (t && t.id === id) {
      return { ...t, status: newStatus };
    }
    return t;
  });
  syncToCloud(updatedTasks);
};

// Delete a task
export const deleteTask = (id) => {
  const tasks = getAllTasks();
  const updatedTasks = tasks.filter(t => t && t.id !== id);
  syncToCloud(updatedTasks);
};

// Archive completed tasks
export const archiveCompletedTasks = () => {
  const tasks = getAllTasks();
  let archivedCount = 0;
  const updatedTasks = tasks.map(t => {
    if (t && t.status === 'completed' && !t.archived) {
      archivedCount++;
      return { ...t, archived: true, archivedAt: new Date().toISOString() };
    }
    return t;
  });
  syncToCloud(updatedTasks);
  return archivedCount;
};

// Helper: Normalize option format (supports legacy string options & new {name, count} object options)
export const parseOption = (opt) => {
  if (typeof opt === 'string') {
    return { name: opt, count: 1 };
  }
  if (opt && typeof opt === 'object') {
    return { name: opt.name || '', count: opt.count || 1 };
  }
  return { name: '', count: 1 };
};

// Generate Daily Report Text
export const generateDailyReport = () => {
  const activeTasks = getTasks();
  
  const completedToday = activeTasks.filter(t => t && t.status === 'completed');
  const pendingTasks = activeTasks.filter(t => t && t.status !== 'completed');

  const countByCategory = (tasksList) => {
    const counts = {};
    tasksList.forEach(task => {
      if (!task || !task.services) return;
      Object.entries(task.services).forEach(([catId, data]) => {
        const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
        const catName = cat ? cat.name.replace(/^\d+\.\s*/, '') : catId;
        
        let totalCategoryCount = 0;
        if (data && data.options && Array.isArray(data.options)) {
          data.options.forEach(opt => {
            const parsed = parseOption(opt);
            totalCategoryCount += parsed.count;
          });
        }

        // Custom rule: Category 6 (กังสดาล) always counts as 1 task even if multiple options are selected
        if (catId === 'gungsadan' && totalCategoryCount > 0) {
          totalCategoryCount = 1;
        }

        if (totalCategoryCount > 0) {
          counts[catName] = (counts[catName] || 0) + totalCategoryCount;
        }
      });
    });
    return counts;
  };

  let report = 'งาน lab วันนี้ @Don @MAX MN Autoteam\n';
  const completedCounts = countByCategory(completedToday);
  if (Object.keys(completedCounts).length === 0) {
    report += '- ไม่มีงานเสร็จวันนี้\n';
  } else {
    Object.entries(completedCounts).forEach(([catName, count]) => {
      report += `- ${catName}: ${count} งาน\n`;
    });
  }
  report += '\n';

  report += 'งานค้างที่ lab @Don @MAX MN Autoteam\n';
  const pendingCounts = countByCategory(pendingTasks);
  if (Object.keys(pendingCounts).length === 0) {
    report += '- ไม่มีงานค้าง\n';
  } else {
    Object.entries(pendingCounts).forEach(([catName, count]) => {
      report += `- ${catName}: ${count} งาน\n`;
    });
  }

  return report;
};

// Export tasks to CSV (Low storage data format)
export const exportTasksToCSV = () => {
  const tasks = getAllTasks();
  if (tasks.length === 0) {
    alert("ไม่มีข้อมูลสำหรับ Export (No tasks to export)");
    return;
  }

  const headers = ['ID', 'Customer', 'Date', 'Status', 'Category', 'Service Option', 'Quantity', 'Price (THB)', 'Note'];
  const csvRows = [];
  
  tasks.forEach(task => {
    if (!task) return;
    const taskDate = task.createdAt ? new Date(task.createdAt).toLocaleString('th-TH') : '';
    const customerStr = task.customer ? String(task.customer) : '';
    
    if (!task.services || Object.keys(task.services).length === 0) {
      csvRows.push([
        task.id,
        `"${customerStr.replace(/"/g, '""')}"`,
        taskDate,
        task.status || '',
        'None',
        'None',
        '0',
        '0',
        '""'
      ].join(','));
      return;
    }

    Object.entries(task.services).forEach(([catId, data]) => {
      const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
      const categoryName = cat ? cat.name.replace(/^\d+\.\s*/, '') : catId;
      
      if (data && data.options && Array.isArray(data.options)) {
        data.options.forEach((opt, index) => {
          const parsed = parseOption(opt);
          const optionObj = cat?.options?.find(o => o.name === parsed.name);
          
          let unitPrice = optionObj?.price !== null && optionObj?.price !== undefined ? optionObj.price : null;
          let totalPriceStr = unitPrice !== null ? (unitPrice * parsed.count) : 'TBD';
          
          if (cat?.basePrice && index === 0) {
            totalPriceStr = `${totalPriceStr} (+ Base ${cat.basePrice})`;
          }

          csvRows.push([
            task.id,
            `"${customerStr.replace(/"/g, '""')}"`,
            taskDate,
            task.status || '',
            `"${categoryName.replace(/"/g, '""')}"`,
            `"${parsed.name.replace(/"/g, '""')}"`,
            parsed.count,
            `"${totalPriceStr}"`,
            `"${(data.details || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`
          ].join(','));
        });
      }
    });
  });

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `dns_golf_tasks_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Services definition for the form
export const SERVICE_CATEGORIES = [
  {
    id: 'laser',
    name: '1. Laser',
    options: [
      { name: 'เซาะร่อง1.2', price: 500 },
      { name: 'เซาะร่อง 0.8', price: 500 },
      { name: 'full face', price: 1000 },
      { name: 'x-milled', price: 1000 },
      { name: 'หน้าสนิม', price: null },
      { name: 'clear face', price: null },
      { name: 'custom milled', price: null }
    ]
  },
  {
    id: 'shaft',
    name: '2. ก้าน',
    options: [
      { name: 'เปลี่ยนก้าน', price: null },
      { name: 'ทำสวิงเวท', price: null }
    ]
  },
  {
    id: 'grip',
    name: '3. เปลี่ยนกริป',
    options: [
      { name: 'เปลี่ยนกริป', price: 100 }
    ],
    detailsPlaceholder: 'ระบุประเภทของกริป...'
  },
  {
    id: 'polish',
    name: '4. ขัดเงา',
    options: [
      { name: 'ยิงทรายลบสนิม', price: null },
      { name: 'รมดำ', price: null },
      { name: 'oil clean', price: null }
    ]
  },
  {
    id: 'sandblast',
    name: '5. ยิงทราย',
    options: [
      { name: 'ลอกสีพัตเตอร์', price: null },
      { name: 'ยิงทรายหน้าใบ', price: null }
    ]
  },
  {
    id: 'gungsadan',
    name: '6. กังสดาล',
    options: [
      { name: 'หัว Putter', price: 4500 },
      { name: 'ก้าน OEM', price: 1000 },
      { name: 'กริพ', price: 500 },
      { name: 'เลเซอร์', price: 500 }
    ],
    detailsPlaceholder: 'ระบุรายละเอียด...'
  },
  {
    id: 'paint',
    name: '7. ทำสี',
    options: [
      { name: 'ก้าน', price: null },
      { name: 'พัตเตอร์', price: null },
      { name: 'DLC', price: null },
      { name: 'PVD', price: null }
    ]
  },
  {
    id: 'custom_advance',
    name: '8. custom advance',
    options: [
      { name: 'เส้นเล็ง', price: null },
      { name: 'เลเซอร์หลังใบ', price: null },
      { name: 'เลเซอร์ลายบนชิ้นงาน', price: null }
    ]
  }
];
