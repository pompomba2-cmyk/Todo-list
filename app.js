// Initial Team Members
const MEMBERS = ['Jay', 'Joh', 'Gop'];

// Detect if running locally via file:// (Offline/LocalStorage Mode)
const IS_LOCAL_FILE = window.location.protocol === 'file:';

// App State
let state = {
    tasks: [],
    currentRole: 'supervisor', // 'supervisor', 'Jay', 'Joh', 'Gop'
    theme: 'dark',
    supervisorNotes: ''
};

// Date Helpers
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era (B.E.)
    return `${day} ${month} ${year}`;
};

const isTaskOverdue = (deadlineStr, status) => {
    if (status === 'completed') return false;
    if (!deadlineStr) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    
    return deadline < today;
};

const isTaskDueSoon = (deadlineStr, status) => {
    if (status === 'completed') return false;
    if (!deadlineStr) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= 1; // Today or Tomorrow
};

// Initial Mock Data (used for offline first load)
const MOCK_TASKS = [
    {
        id: 'task-1',
        title: 'ออกแบบ UI แดชบอร์ดหลักของระบบ',
        desc: 'ออกแบบโครงสร้าง Wireframe หน้าจอภาพรวมสำหรับหัวหน้างาน (Supervisor Dashboard) ให้ทันสมัยและใช้งานง่าย',
        assignee: 'Jay',
        status: 'todo',
        created: getTodayDateString(),
        deadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            return d.toISOString().split('T')[0];
        })()
    },
    {
        id: 'task-2',
        title: 'พัฒนาระบบสลับบทบาทผู้ใช้งาน (SPA)',
        desc: 'เขียนระบบ JavaScript สลับการแสดงผลระหว่างมุมมองหัวหน้างานและบอร์ดของแต่ละบุคคลอย่างลื่นไหล',
        assignee: 'Joh',
        status: 'in_progress',
        created: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        })(),
        deadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        })()
    },
    {
        id: 'task-3',
        title: 'ทำระบบลากวางการ์ด (Drag and Drop)',
        desc: 'พัฒนาฟังก์ชัน HTML5 Drag and Drop สำหรับบอร์ด Kanban เพื่อให้ทีมงานลากย้ายสถานะการทำงานได้อย่างมีประสิทธิภาพ',
        assignee: 'Gop',
        status: 'completed',
        created: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 3);
            return d.toISOString().split('T')[0];
        })(),
        deadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        })()
    },
    {
        id: 'task-4',
        title: 'ทำความสะอาดข้อมูลและเตรียมสรุปรายสัปดาห์',
        desc: 'รวบรวมข้อมูลสถานะงานของทุกคนในระบบเพื่อจัดส่งให้หัวหน้างานพิจารณาความเร่งด่วน',
        assignee: 'Jay',
        status: 'todo',
        created: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 4);
            return d.toISOString().split('T')[0];
        })(),
        deadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 2);
            return d.toISOString().split('T')[0];
        })()
    }
];

// Initialize Application
const initApp = async () => {
    // Load theme setting (always local to device)
    const storedTheme = localStorage.getItem('teamflow_theme');
    if (storedTheme) {
        state.theme = storedTheme;
        if (state.theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    }

    setupEventListeners();
    
    // Load Tasks & Notes from server or LocalStorage fallback
    await loadData();
};

// Fetch data from Cloudflare D1 or Fallback to LocalStorage
const loadData = async () => {
    if (IS_LOCAL_FILE) {
        // --- OFFLINE / LOCAL FILE MODE (localStorage) ---
        const storedTasks = localStorage.getItem('teamflow_tasks');
        if (storedTasks) {
            state.tasks = JSON.parse(storedTasks);
        } else {
            state.tasks = MOCK_TASKS;
            saveTasksToStorage();
        }

        const storedNotes = localStorage.getItem('teamflow_notes');
        state.supervisorNotes = storedNotes || '';
        const notesTextArea = document.getElementById('supervisor-notes');
        if (notesTextArea) {
            notesTextArea.value = state.supervisorNotes;
        }
        
        render();
        return;
    }

    // --- ONLINE MODE (Cloudflare Pages Functions + D1 DB) ---
    try {
        // 1. Fetch Tasks
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
            state.tasks = await tasksRes.json();
        } else {
            throw new Error("Failed to fetch tasks from Cloudflare API");
        }

        // 2. Fetch Notes
        const notesRes = await fetch('/api/notes');
        if (notesRes.ok) {
            const noteData = await notesRes.json();
            state.supervisorNotes = noteData.content || '';
            const notesTextArea = document.getElementById('supervisor-notes');
            if (notesTextArea) {
                notesTextArea.value = state.supervisorNotes;
            }
        } else {
            throw new Error("Failed to fetch notes from Cloudflare API");
        }

        render();
    } catch (err) {
        console.error("Cloudflare Database Connection Error:", err);
        // Fallback to local storage in case of API failure
        alert("ไม่สามารถติดต่อ Cloudflare Database ได้ ระบบจะเปิดใช้โหมดออฟไลน์ชั่วคราว");
        
        const storedTasks = localStorage.getItem('teamflow_tasks') || JSON.stringify(MOCK_TASKS);
        state.tasks = JSON.parse(storedTasks);
        state.supervisorNotes = localStorage.getItem('teamflow_notes') || '';
        
        const notesTextArea = document.getElementById('supervisor-notes');
        if (notesTextArea) {
            notesTextArea.value = state.supervisorNotes;
        }
        render();
    }
};

// Save Tasks (used primarily for Local File mode)
const saveTasksToStorage = () => {
    if (IS_LOCAL_FILE) {
        localStorage.setItem('teamflow_tasks', JSON.stringify(state.tasks));
    }
};

// Event Listeners Setup
const setupEventListeners = () => {
    // Sidebar Role Buttons
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            roleButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            const role = button.dataset.role;
            switchRole(role);
        });
    });

    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        if (state.theme === 'dark') {
            state.theme = 'light';
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        } else {
            state.theme = 'dark';
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('teamflow_theme', state.theme);
    });

    // Supervisor Notes Auto-save Listener
    const notesTextArea = document.getElementById('supervisor-notes');
    const saveStatus = document.getElementById('notes-save-status');
    let saveTimeout;

    if (notesTextArea && saveStatus) {
        notesTextArea.addEventListener('input', (e) => {
            state.supervisorNotes = e.target.value;
            
            // Show typing/saving status
            saveStatus.textContent = 'กำลังบันทึก...';
            saveStatus.className = 'save-status saving';
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                if (IS_LOCAL_FILE) {
                    localStorage.setItem('teamflow_notes', state.supervisorNotes);
                } else {
                    try {
                        await fetch('/api/notes', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: state.supervisorNotes })
                        });
                    } catch (err) {
                        console.error("Failed to auto-save notes to server:", err);
                    }
                }
                saveStatus.textContent = 'บันทึกอัตโนมัติแล้ว ✓';
                saveStatus.className = 'save-status saved';
            }, 600);
        });
    }

    // Task Modal Controls
    const addBtn = document.getElementById('add-task-btn');
    const modal = document.getElementById('task-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const taskForm = document.getElementById('task-form');
    const deleteBtn = document.getElementById('delete-task-btn');

    addBtn.addEventListener('click', () => openTaskModal());
    closeModalBtn.addEventListener('click', () => closeModal());
    cancelModalBtn.addEventListener('click', () => closeModal());
    
    // Close modal by clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle Form Submit
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });

    // Handle Delete Button
    deleteBtn.addEventListener('click', () => {
        const taskId = document.getElementById('task-id').value;
        if (confirm('คุณต้องการลบงานนี้ใช่หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้')) {
            deleteTask(taskId);
        }
    });

    // Supervisor Table Filters
    document.getElementById('search-input').addEventListener('input', () => renderSupervisorView());
    document.getElementById('filter-assignee').addEventListener('change', () => renderSupervisorView());
    document.getElementById('filter-status').addEventListener('change', () => renderSupervisorView());

    // Setup Drag and Drop Containers
    const columns = document.querySelectorAll('.kanban-cards-container');
    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const targetStatus = col.parentElement.dataset.status;
            
            updateTaskStatus(taskId, targetStatus);
        });
    });
};

// Switch active view/role
const switchRole = (role) => {
    state.currentRole = role;
    
    const titleEl = document.getElementById('current-view-title');
    const subtitleEl = document.getElementById('current-view-subtitle');
    const addBtn = document.getElementById('add-task-btn');
    
    const viewSupervisor = document.getElementById('view-supervisor');
    const viewMember = document.getElementById('view-member');

    // Remove active class from both panels to animate out
    viewSupervisor.classList.remove('active');
    viewMember.classList.remove('active');

    setTimeout(() => {
        if (role === 'supervisor') {
            titleEl.textContent = 'ภาพรวมงานของทีม (Supervisor)';
            subtitleEl.textContent = 'ดูสถานะและติดตามความคืบหน้าของทุกคนในทีม';
            addBtn.style.display = 'none';
            
            viewSupervisor.classList.add('active');
            renderSupervisorView();
        } else {
            titleEl.textContent = `บอร์ดงานของ ${role}`;
            subtitleEl.textContent = 'ลากและวางการ์ดเพื่อจัดการสถานะงานของคุณ';
            addBtn.style.display = 'inline-flex';
            
            viewMember.classList.add('active');
            renderMemberView();
        }
    }, 150);
};

// Render function dispatcher
const render = () => {
    if (state.currentRole === 'supervisor') {
        renderSupervisorView();
    } else {
        renderMemberView();
    }
};

// RENDER: SUPERVISOR DASHBOARD
const renderSupervisorView = () => {
    const tasks = state.tasks;
    
    // Calculate stats
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const progress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => isTaskOverdue(t.deadline, t.status)).length;

    // Render stats counts
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-todo').textContent = todo;
    document.getElementById('stat-progress').textContent = progress;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-overdue').textContent = overdue;

    // Render Workload Bars
    const workloadList = document.getElementById('workload-list');
    workloadList.innerHTML = '';

    MEMBERS.forEach(member => {
        const memberTasks = tasks.filter(t => t.assignee === member);
        const memberTotal = memberTasks.length;
        const memberCompleted = memberTasks.filter(t => t.status === 'completed').length;
        const pct = memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0;
        
        let avatarBg = '';
        if (member === 'Jay') avatarBg = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
        else if (member === 'Joh') avatarBg = 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
        else if (member === 'Gop') avatarBg = 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)';

        const workloadHTML = `
            <div class="workload-item">
                <div class="workload-meta">
                    <div class="workload-name-group">
                        <div class="avatar" style="background: ${avatarBg}; width: 22px; height: 22px; font-size: 9px; color: #1e293b;">${member.substring(0, 2).toUpperCase()}</div>
                        <span>${member}</span>
                    </div>
                    <span>${memberCompleted}/${memberTotal} งาน (${pct}%)</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
        workloadList.insertAdjacentHTML('beforeend', workloadHTML);
    });

    // Render Global Task Table (with filters)
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const filterAssignee = document.getElementById('filter-assignee').value;
    const filterStatus = document.getElementById('filter-status').value;

    const tbody = document.getElementById('global-task-table-body');
    tbody.innerHTML = '';

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery) || 
                              (task.desc && task.desc.toLowerCase().includes(searchQuery));
        const matchesAssignee = filterAssignee === 'all' || task.assignee === filterAssignee;
        
        let matchesStatus = false;
        if (filterStatus === 'all') {
            matchesStatus = true;
        } else if (filterStatus === 'overdue') {
            matchesStatus = isTaskOverdue(task.deadline, task.status);
        } else {
            matchesStatus = task.status === filterStatus;
        }

        return matchesSearch && matchesAssignee && matchesStatus;
    });

    if (filteredTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 32px;">
                    ไม่พบข้อมูลงานที่ค้นหา
                </td>
            </tr>
        `;
        return;
    }

    filteredTasks.forEach(task => {
        const isOverdue = isTaskOverdue(task.deadline, task.status);
        
        let statusBadgeClass = '';
        let statusLabel = '';
        
        if (isOverdue) {
            statusBadgeClass = 'overdue';
            statusLabel = 'เลยกำหนดส่ง';
        } else if (task.status === 'todo') {
            statusBadgeClass = 'todo';
            statusLabel = 'รอดำเนินการ';
        } else if (task.status === 'in_progress') {
            statusBadgeClass = 'in-progress';
            statusLabel = 'กำลังทำ';
        } else if (task.status === 'completed') {
            statusBadgeClass = 'completed';
            statusLabel = 'เสร็จสิ้น';
        }

        let avatarBg = '';
        if (task.assignee === 'Jay') avatarBg = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
        else if (task.assignee === 'Joh') avatarBg = 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
        else if (task.assignee === 'Gop') avatarBg = 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)';

        const rowHTML = `
            <tr>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${task.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">${task.desc || '-'}</div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="avatar" style="background: ${avatarBg}; width: 24px; height: 24px; font-size: 10px; color: #1e293b;">${task.assignee.substring(0, 2).toUpperCase()}</div>
                        <span>${task.assignee}</span>
                    </div>
                </td>
                <td style="color: var(--text-secondary);">${formatThaiDate(task.created)}</td>
                <td style="${isOverdue ? 'color: var(--color-overdue); font-weight:600;' : 'color: var(--text-secondary);'}">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${isOverdue ? '⚠️ ' : ''}${formatThaiDate(task.deadline)}
                    </div>
                </td>
                <td>
                    <span class="badge ${statusBadgeClass}">${statusLabel}</span>
                </td>
                <td>
                    <button class="icon-btn" onclick="openTaskModal('${task.id}')" title="แก้ไขงาน">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', rowHTML);
    });
};

// RENDER: MEMBER KANBAN BOARD
const renderMemberView = () => {
    const tasks = state.tasks.filter(t => t.assignee === state.currentRole);
    
    const todoContainer = document.getElementById('cards-todo');
    const progressContainer = document.getElementById('cards-inprogress');
    const completedContainer = document.getElementById('cards-completed');

    todoContainer.innerHTML = '';
    progressContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    let todoCount = 0;
    let progressCount = 0;
    let completedCount = 0;

    tasks.forEach(task => {
        const isOverdue = isTaskOverdue(task.deadline, task.status);
        const isSoon = isTaskDueSoon(task.deadline, task.status);
        
        let cardClass = 'kanban-card';
        if (isOverdue) cardClass += ' overdue';
        else if (isSoon) cardClass += ' due-soon';

        const cardHTML = `
            <div class="${cardClass}" draggable="true" id="card-${task.id}" data-id="${task.id}">
                <div class="card-title">${task.title}</div>
                ${task.desc ? `<div class="card-desc">${task.desc}</div>` : ''}
                <div class="card-footer">
                    <div class="card-deadline-group">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>${isOverdue ? 'เลยกำหนด: ' : 'ครบกำหนด: '}${formatThaiDate(task.deadline)}</span>
                    </div>
                    <button class="icon-btn" onclick="openTaskModal('${task.id}')" title="แก้ไขงาน" style="padding: 2px; width: 24px; height: 24px; border-radius: 4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        if (task.status === 'todo') {
            todoContainer.insertAdjacentHTML('beforeend', cardHTML);
            todoCount++;
        } else if (task.status === 'in_progress') {
            progressContainer.insertAdjacentHTML('beforeend', cardHTML);
            progressCount++;
        } else if (task.status === 'completed') {
            completedContainer.insertAdjacentHTML('beforeend', cardHTML);
            completedCount++;
        }

        const cardElement = document.getElementById(`card-${task.id}`);
        cardElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            setTimeout(() => cardElement.classList.add('dragging'), 0);
        });

        cardElement.addEventListener('dragend', () => {
            cardElement.classList.remove('dragging');
        });
    });

    document.getElementById('count-todo').textContent = todoCount;
    document.getElementById('count-inprogress').textContent = progressCount;
    document.getElementById('count-completed').textContent = completedCount;
};

// Drag & drop update handler
const updateTaskStatus = async (taskId, targetStatus) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Optimistic Update
    task.status = targetStatus;
    render();
    
    if (IS_LOCAL_FILE) {
        saveTasksToStorage();
    } else {
        try {
            const res = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (!res.ok) throw new Error("API update failed");
            await loadData(); // Re-sync
        } catch (err) {
            console.error("Failed to update task status on Cloudflare D1:", err);
            alert("ไม่สามารถอัปเดตงานบนฐานข้อมูลคลาวด์ได้");
        }
    }
};

// MODAL INTERACTIONS
const openTaskModal = (taskId = null) => {
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-task-btn');
    const taskForm = document.getElementById('task-form');
    
    taskForm.reset();
    
    if (taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.title;
        document.getElementById('task-desc').value = task.desc || '';
        document.getElementById('task-assignee').value = task.assignee;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-created').value = task.created;
        document.getElementById('task-deadline').value = task.deadline;
        
        modalTitle.textContent = 'แก้ไขรายละเอียดงาน';
        deleteBtn.style.display = 'inline-flex';
        
        const assigneeSelect = document.getElementById('task-assignee');
        if (state.currentRole !== 'supervisor') {
            assigneeSelect.disabled = true;
        } else {
            assigneeSelect.disabled = false;
        }
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('task-created').value = getTodayDateString();
        
        const assigneeSelect = document.getElementById('task-assignee');
        if (state.currentRole !== 'supervisor') {
            assigneeSelect.value = state.currentRole;
            assigneeSelect.disabled = true;
        } else {
            assigneeSelect.value = '';
            assigneeSelect.disabled = false;
        }

        document.getElementById('task-status').value = 'todo';
        
        modalTitle.textContent = 'สร้างงานใหม่';
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
};

const closeModal = () => {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('active');
    document.getElementById('task-assignee').disabled = false;
};

// Save task (Create / Update)
const saveTask = async () => {
    const taskId = document.getElementById('task-id').value;
    const title = document.getElementById('task-name').value.trim();
    const desc = document.getElementById('task-desc').value.trim();
    
    const assigneeSelect = document.getElementById('task-assignee');
    const assigneeDisabled = assigneeSelect.disabled;
    assigneeSelect.disabled = false;
    const assignee = assigneeSelect.value;
    assigneeSelect.disabled = assigneeDisabled;

    const status = document.getElementById('task-status').value;
    const deadline = document.getElementById('task-deadline').value;
    const created = document.getElementById('task-created').value;

    if (!title || !assignee || !deadline) {
        alert('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
        return;
    }

    if (IS_LOCAL_FILE) {
        if (taskId) {
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                state.tasks[index] = { ...state.tasks[index], title, desc, assignee, status, deadline };
            }
        } else {
            const newTask = { id: `task-${Date.now()}`, title, desc, assignee, status, created, deadline };
            state.tasks.push(newTask);
        }
        saveTasksToStorage();
        closeModal();
        render();
        return;
    }

    // Cloudflare D1 Save Mode
    try {
        if (taskId) {
            const task = { id: taskId, title, desc, assignee, status, deadline };
            const res = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (!res.ok) throw new Error("PUT API failed");
        } else {
            const newTask = { id: `task-${Date.now()}`, title, desc, assignee, status, created, deadline };
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (!res.ok) throw new Error("POST API failed");
        }
        closeModal();
        await loadData(); // Reload from DB
    } catch (err) {
        console.error("Failed to save task to Cloudflare D1:", err);
        alert("ไม่สามารถบันทึกข้อมูลไปยังฐานข้อมูลคลาวด์ได้");
    }
};

// Delete Task
const deleteTask = async (taskId) => {
    if (IS_LOCAL_FILE) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveTasksToStorage();
        closeModal();
        render();
        return;
    }

    // Cloudflare D1 Delete Mode
    try {
        const res = await fetch(`/api/tasks?id=${taskId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("DELETE API failed");
        closeModal();
        await loadData(); // Reload from DB
    } catch (err) {
        console.error("Failed to delete task on Cloudflare D1:", err);
        alert("ไม่สามารถลบงานออกจากฐานข้อมูลคลาวด์ได้");
    }
};

// Attach initApp to window load
window.addEventListener('DOMContentLoaded', initApp);
