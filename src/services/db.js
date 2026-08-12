// LocalStorage based mock database for the prototype
const STORAGE_KEY = 'dns_golf_tasks';

// Get all tasks (both active and archived)
export const getAllTasks = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
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
  tasks.push(newTask);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return newTask;
};

// Update an existing task status
export const updateTaskStatus = (id, newStatus) => {
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    tasks[index].status = newStatus;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
};

// Delete a task
export const deleteTask = (id) => {
  let tasks = getAllTasks();
  tasks = tasks.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

// Archive completed tasks
export const archiveCompletedTasks = () => {
  const tasks = getAllTasks();
  let archivedCount = 0;
  tasks.forEach(t => {
    if (t.status === 'completed' && !t.archived) {
      t.archived = true;
      t.archivedAt = new Date().toISOString();
      archivedCount++;
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return archivedCount;
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
        let numOptions = data.options ? data.options.length : 0;
        
        // Custom rule: Category 6 (กังสดาล) always counts as 1 task even if multiple options are selected
        if (catId === 'gungsadan' && numOptions > 0) {
          numOptions = 1;
        }

        if (numOptions > 0) {
          counts[catName] = (counts[catName] || 0) + numOptions;
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

  // We separate each service option into its own row for easier filtering and reading in Excel
  const headers = ['ID', 'Customer', 'Date', 'Status', 'Category', 'Service Option', 'Price (THB)', 'Note'];
  
  const csvRows = [];
  
  tasks.forEach(task => {
    const taskDate = new Date(task.createdAt).toLocaleString('th-TH');
    
    // If a task has no services (rare but possible), still export a row
    if (!task.services || Object.keys(task.services).length === 0) {
      csvRows.push([
        task.id,
        `"${task.customer.replace(/"/g, '""')}"`,
        taskDate,
        task.status,
        'None',
        'None',
        '0',
        '""'
      ].join(','));
      return;
    }

    Object.entries(task.services).forEach(([catId, data]) => {
      const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
      const categoryName = cat ? cat.name.replace(/^\d+\.\s*/, '') : catId; // Remove the "1. " from category name
      
      if (data.options && Array.isArray(data.options)) {
        data.options.forEach((optName, index) => {
          const option = cat?.options?.find(o => o.name === optName);
          let price = option?.price !== null && option?.price !== undefined ? option.price : 'TBD';
          
          if (cat?.basePrice && index === 0) {
            price = `${price} (+ Base ${cat.basePrice})`;
          }

          csvRows.push([
            task.id,
            `"${task.customer.replace(/"/g, '""')}"`,
            taskDate,
            task.status,
            `"${categoryName.replace(/"/g, '""')}"`,
            `"${optName.replace(/"/g, '""')}"`,
            `"${price}"`,
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
