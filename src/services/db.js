// Cloud-synced Database Service for DNS Golf Store
// Real-time synchronization across all PCs, iPhones, iPads, and Android devices.

const STORAGE_KEY = 'dns_golf_tasks';
const CLOUD_API_URL = 'https://api.restful-api.dev/objects/ff8081819ff5b11001a008978e5028cb';

let tasksCache = null;
let subscribers = [];

// Initialize local cache from localStorage
const loadLocalCache = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalCache = (tasks) => {
  tasksCache = tasks;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  notifySubscribers();
};

const notifySubscribers = () => {
  subscribers.forEach(cb => cb(getTasks()));
};

// Subscribe to real-time changes across devices
export const subscribeToTasks = (callback) => {
  subscribers.push(callback);
  
  // Initial fetch
  fetchTasksFromCloud();

  // Poll cloud API every 2.5 seconds to sync across all computers/iphones automatically
  const intervalId = setInterval(fetchTasksFromCloud, 2500);

  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
    clearInterval(intervalId);
  };
};

// Fetch from cloud API
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
      const cloudTasks = json?.data?.tasks;
      if (Array.isArray(cloudTasks)) {
        // If local has tasks that aren't in cloud yet, merge them
        const localTasks = loadLocalCache();
        let merged = [...cloudTasks];
        let hasNewLocal = false;

        localTasks.forEach(lt => {
          if (!merged.some(ct => ct.id === lt.id)) {
            merged.push(lt);
            hasNewLocal = true;
          }
        });

        if (hasNewLocal) {
          syncToCloud(merged);
        } else {
          saveLocalCache(cloudTasks);
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Cloud fetch error, using local data:', err);
  }
  return loadLocalCache();
};

// Sync to cloud API
const syncToCloud = async (tasks) => {
  saveLocalCache(tasks);
  try {
    await fetch(CLOUD_API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'dns_golf_tasks',
        data: { tasks }
      }),
    });
  } catch (err) {
    console.warn('Cloud sync error, saved locally:', err);
  }
};

// Get all tasks
export const getAllTasks = () => {
  if (!tasksCache) {
    tasksCache = loadLocalCache();
  }
  return tasksCache;
};

// Get active tasks (not archived)
export const getTasks = () => {
  return getAllTasks().filter(t => !t.archived);
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
    if (t.id === id) {
      return { ...t, status: newStatus };
    }
    return t;
  });
  syncToCloud(updatedTasks);
};

// Delete a task
export const deleteTask = (id) => {
  const tasks = getAllTasks();
  const updatedTasks = tasks.filter(t => t.id !== id);
  syncToCloud(updatedTasks);
};

// Archive completed tasks
export const archiveCompletedTasks = () => {
  const tasks = getAllTasks();
  let archivedCount = 0;
  const updatedTasks = tasks.map(t => {
    if (t.status === 'completed' && !t.archived) {
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
  return { name: opt.name || '', count: opt.count || 1 };
};

// Generate Daily Report Text
export const generateDailyReport = () => {
  const activeTasks = getTasks();
  
  const completedToday = activeTasks.filter(t => t.status === 'completed');
  const pendingTasks = activeTasks.filter(t => t.status !== 'completed');

  const countByCategory = (tasksList) => {
    const counts = {};
    tasksList.forEach(task => {
      if (!task.services) return;
      Object.entries(task.services).forEach(([catId, data]) => {
        const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
        const catName = cat ? cat.name.replace(/^\d+\.\s*/, '') : catId;
        
        let totalCategoryCount = 0;
        if (data.options && Array.isArray(data.options)) {
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
    const taskDate = new Date(task.createdAt).toLocaleString('th-TH');
    
    if (!task.services || Object.keys(task.services).length === 0) {
      csvRows.push([
        task.id,
        `"${task.customer.replace(/"/g, '""')}"`,
        taskDate,
        task.status,
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
      
      if (data.options && Array.isArray(data.options)) {
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
            `"${task.customer.replace(/"/g, '""')}"`,
            taskDate,
            task.status,
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
