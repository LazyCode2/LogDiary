    // Data storage
    let projects = JSON.parse(localStorage.getItem('logDiary_projects') || '{}');
    let currentProject = localStorage.getItem('logDiary_currentProject') || null;

    // --- Search & Filter State ---
    let logSearchKeyword = '';
    let logDateFilter = '';
    let logTagFilter = '';

    // Initialize app
    document.addEventListener('DOMContentLoaded', function() {
      loadProjects();
      if (Object.keys(projects).length === 0 || !currentProject) {
        showDashboard();
      } else {
        selectProject(currentProject);
      }
      
      // Add enter key listeners
      document.getElementById('projectName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addProject();
      });
      
      document.getElementById('logInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addLog();
      });

      // Setup export/import
      setupExportImport();

      // --- Event Listeners for Search & Filter ---
      const searchInput = document.getElementById('logSearchInput');
      const dateInput = document.getElementById('logDateFilter');
      const tagSelect = document.getElementById('logTagFilter');
      if (searchInput) {
        searchInput.addEventListener('input', function(e) {
          logSearchKeyword = e.target.value.toLowerCase();
          loadLogs();
        });
      }
      if (dateInput) {
        dateInput.addEventListener('input', function(e) {
          logDateFilter = e.target.value;
          loadLogs();
        });
      }
      if (tagSelect) {
        tagSelect.addEventListener('change', function(e) {
          logTagFilter = e.target.value;
          loadLogs();
        });
      }
    });

    // Dashboard functions
    function showDashboard() {
      currentProject = null;
      localStorage.removeItem('logDiary_currentProject');
      
      document.getElementById('dashboardView').classList.remove('hidden');
      document.getElementById('projectView').classList.add('hidden');
      
      updateDashboardStats();
      updateRecentActivity();
      updateProgressInsights();
      
      // Update project list selection
      document.querySelectorAll('#projectList li').forEach(li => {
        li.classList.remove('bg-primary-500/20', 'border-primary-500/30');
        li.classList.add('bg-card-500', 'border-card-400');
      });
    }

    function showProjectView() {
      document.getElementById('dashboardView').classList.add('hidden');
      document.getElementById('projectView').classList.remove('hidden');
    }

    function updateDashboardStats() {
      const totalProjects = Object.keys(projects).length;
      const totalLogs = Object.values(projects).reduce((sum, project) => sum + (project.logs?.length || 0), 0);
      
      // Calculate weekly logs
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyLogs = Object.values(projects).reduce((sum, project) => {
        if (!project.logs) return sum;
        return sum + project.logs.filter(log => new Date(log.timestamp) > weekAgo).length;
      }, 0);
      
      // Calculate total unique tags
      const allTags = new Set();
      Object.values(projects).forEach(project => {
        if (project.tags) {
          project.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      document.getElementById('totalProjects').textContent = totalProjects;
      document.getElementById('totalLogs').textContent = totalLogs;
      document.getElementById('weeklyLogs').textContent = weeklyLogs;
      document.getElementById('totalTags').textContent = allTags.size;
    }

    function updateRecentActivity() {
      const recentActivityContainer = document.getElementById('recentActivity');
      
      // Get all logs from all projects and sort by timestamp
      const allLogs = [];
      Object.entries(projects).forEach(([projectName, project]) => {
        if (project.logs) {
          project.logs.forEach(log => {
            allLogs.push({
              ...log,
              projectName
            });
          });
        }
      });
      
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentLogs = allLogs.slice(0, 5);
      
      if (recentLogs.length === 0) {
        recentActivityContainer.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <i class="fas fa-clipboard-list text-4xl mb-3 opacity-50"></i>
            <p>No recent activity. Create your first project to get started!</p>
          </div>
        `;
      } else {
        recentActivityContainer.innerHTML = recentLogs.map(log => `
          <div class="flex items-start gap-3 p-3 bg-card-500/50 rounded-lg border border-card-400/50">
            <div class="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-primary-400">${log.projectName}</span>
                <span class="text-xs text-gray-500">${formatTimeAgo(log.timestamp)}</span>
              </div>
              <p class="text-gray-300">${log.text}</p>
              ${log.tags && log.tags.length > 0 ? `
                <div class="flex gap-1 mt-2">
                  ${log.tags.map(tag => `<span class="text-xs px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    function updateProgressInsights() {
      const progressContainer = document.getElementById('progressInsights');
      const totalProjects = Object.keys(projects).length;
      
      if (totalProjects === 0) {
        progressContainer.innerHTML = `
          <div class="text-center py-4 text-gray-500">
            <i class="fas fa-chart-pie text-2xl mb-2 opacity-50"></i>
            <p class="text-sm">Progress insights will appear here once you start logging work.</p>
          </div>
        `;
      } else {
        // Calculate some basic insights
        const totalLogs = Object.values(projects).reduce((sum, project) => sum + (project.logs?.length || 0), 0);
        const avgLogsPerProject = totalLogs > 0 ? (totalLogs / totalProjects).toFixed(1) : 0;
        
        const mostActiveProject = Object.entries(projects).reduce((max, [name, project]) => {
          const logCount = project.logs?.length || 0;
          return logCount > (max.count || 0) ? { name, count: logCount } : max;
        }, {});
        
        progressContainer.innerHTML = `
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2">
              <span class="text-gray-400">Average logs per project</span>
              <span class="font-semibold text-primary-400">${avgLogsPerProject}</span>
            </div>
            ${mostActiveProject.name ? `
              <div class="flex justify-between items-center py-2">
                <span class="text-gray-400">Most active project</span>
                <span class="font-semibold text-accent-green">${mostActiveProject.name}</span>
              </div>
            ` : ''}
            <div class="flex justify-between items-center py-2">
              <span class="text-gray-400">Total entries</span>
              <span class="font-semibold text-accent-amber">${totalLogs}</span>
            </div>
          </div>
        `;
      }
    }

    function focusNewProject() {
      document.getElementById('projectName').focus();
    }

    function formatTimeAgo(timestamp) {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    }

    // Project functions
    function loadProjects() {
      const projectList = document.getElementById('projectList');
      projectList.innerHTML = '';
      
      Object.keys(projects).forEach(projectName => {
        const li = document.createElement('li');
        li.className = 'p-3 rounded-lg cursor-pointer transition border bg-card-500 border-card-400 hover:bg-card-300';
        li.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="fas fa-folder text-primary-400"></i>
              <span class="font-medium truncate">${projectName}</span>
            </div>
            <div class="flex items-center gap-2">
              ${projects[projectName].logs ? `<span class="text-xs bg-surface-500 px-2 py-0.5 rounded-full">${projects[projectName].logs.length}</span>` : ''}
              <button onclick="event.stopPropagation(); exportProject('${projectName}')" class="text-gray-400 hover:text-primary-400 opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-download text-xs"></i>
              </button>
            </div>
          </div>
        `;
        li.onclick = () => selectProject(projectName);
        projectList.appendChild(li);
      });
      
      // Update dashboard if it's currently shown
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
        updateRecentActivity();
        updateProgressInsights();
      }
    }

    function addProject() {
      const projectName = document.getElementById('projectName').value.trim();
      if (!projectName) return;
      
      if (projects[projectName]) {
        alert('Project already exists!');
        return;
      }
      
      projects[projectName] = {
        logs: [],
        tags: [],
        version: '1.0.0',
        createdAt: new Date().toISOString()
      };
      
      saveProjects();
      loadProjects();
      selectProject(projectName);
      document.getElementById('projectName').value = '';
    }

    function selectProject(projectName) {
      currentProject = projectName;
      localStorage.setItem('logDiary_currentProject', projectName);
      
      showProjectView();
      
      // Update UI
      document.getElementById('currentProjectTitle').innerHTML = `
        <i class="fas fa-book text-primary-500"></i>
        <span>${projectName}</span>
      `;
      
      // Show version and project controls
      document.getElementById('versionDisplay').classList.remove('hidden');
      document.getElementById('deleteProjectBtn').classList.remove('hidden');
      document.getElementById('manageTagsBtn').classList.remove('hidden');
      
      // Update version display
      document.getElementById('currentVersion').textContent = projects[projectName].version || '1.0.0';
      
      // Update project list highlighting
      document.querySelectorAll('#projectList li').forEach(li => {
        li.classList.remove('bg-primary-500/20', 'border-primary-500/30');
        li.classList.add('bg-card-500', 'border-card-400');
      });
      
      // Highlight current project
      const currentLi = Array.from(document.querySelectorAll('#projectList li')).find(li => 
        li.textContent.includes(projectName)
      );
      if (currentLi) {
        currentLi.classList.remove('bg-card-500', 'border-card-400');
        currentLi.classList.add('bg-primary-500/20', 'border-primary-500/30');
      }
      
      loadLogs();
      loadTags();
    }

    function deleteProject() {
      if (!currentProject) return;
      
      if (confirm(`Are you sure you want to delete "${currentProject}"? This action cannot be undone.`)) {
        delete projects[currentProject];
        saveProjects();
        loadProjects();
        showDashboard();
      }
    }

    // Log functions
    // --- Enhanced loadLogs with Search & Filter ---
    function loadLogs() {
      const logList = document.getElementById('logList');
      const project = projects[currentProject];
      updateTagFilterDropdown();
      if (!project || !project.logs || project.logs.length === 0) {
        logList.innerHTML = `
          <li class="text-center py-8 text-gray-500">
            <i class="fas fa-clipboard-list text-4xl mb-3 opacity-50"></i>
            <p>No logs yet. Add your first log entry!</p>
          </li>
        `;
        return;
      }
      let filteredLogs = project.logs;
      // Filter by keyword
      if (logSearchKeyword) {
        filteredLogs = filteredLogs.filter(log => log.text.toLowerCase().includes(logSearchKeyword));
      }
      // Filter by date
      if (logDateFilter) {
        filteredLogs = filteredLogs.filter(log => log.timestamp && log.timestamp.startsWith(logDateFilter));
      }
      // Filter by tag
      if (logTagFilter) {
        filteredLogs = filteredLogs.filter(log => log.tags && log.tags.includes(logTagFilter));
      }
      if (filteredLogs.length === 0) {
        logList.innerHTML = `
          <li class="text-center py-8 text-gray-500">
            <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
            <p>No logs match your search/filter.</p>
          </li>
        `;
        return;
      }
      logList.innerHTML = filteredLogs.map((log, index) => `
        <li class="flex items-start gap-3 p-4 bg-card-500 rounded-lg border border-card-400 hover:bg-card-400 transition group">
          <div class="flex-shrink-0 w-2 h-2 bg-accent-green rounded-full mt-2"></div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-400">${new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <button onclick="deleteLog(${index})" class="text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-trash text-sm"></i>
              </button>
            </div>
            <p class="text-gray-200 mb-2">${log.text}</p>
            ${log.tags && log.tags.length > 0 ? `
              <div class="flex gap-1 flex-wrap">
                ${log.tags.map(tag => `<span class="tag text-xs px-2 py-1 bg-accent-purple/20 text-accent-purple rounded-full border border-accent-purple/30">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </li>
      `).reverse().join('');
    }

    function addLog() {
      const logInput = document.getElementById('logInput');
      const text = logInput.value.trim();
      
      if (!text || !currentProject) return;
      
      const selectedTags = Array.from(document.querySelectorAll('#quickTagsContainer .tag.selected')).map(tag => tag.textContent);
      
      const log = {
        text,
        timestamp: new Date().toISOString(),
        tags: selectedTags
      };
      
      if (!projects[currentProject].logs) {
        projects[currentProject].logs = [];
      }
      
      projects[currentProject].logs.push(log);
      saveProjects();
      loadLogs();
      
      // Clear input and selected tags
      logInput.value = '';
      document.querySelectorAll('#quickTagsContainer .tag').forEach(tag => {
        tag.classList.remove('selected', 'bg-accent-purple', 'text-white');
        tag.classList.add('bg-accent-purple/20', 'text-accent-purple');
      });
      
      // Update dashboard if needed
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
        updateRecentActivity();
        updateProgressInsights();
      }
    }

    function addQuickLog(text) {
      if (!currentProject) return;
      
      const log = {
        text,
        timestamp: new Date().toISOString(),
        tags: []
      };
      
      if (!projects[currentProject].logs) {
        projects[currentProject].logs = [];
      }
      
      projects[currentProject].logs.push(log);
      saveProjects();
      loadLogs();
      
      // Update dashboard if needed
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
        updateRecentActivity();
        updateProgressInsights();
      }
    }

    function deleteLog(index) {
      if (!currentProject || !projects[currentProject].logs) return;
      
      if (confirm('Are you sure you want to delete this log entry?')) {
        projects[currentProject].logs.splice(index, 1);
        saveProjects();
        loadLogs();
        
        // Update dashboard if needed
        if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
          updateDashboardStats();
          updateRecentActivity();
          updateProgressInsights();
        }
      }
    }

    // Tag functions
    function loadTags() {
      const quickTagsContainer = document.getElementById('quickTagsContainer');
      const project = projects[currentProject];
      
      if (!project || !project.tags || project.tags.length === 0) {
        quickTagsContainer.innerHTML = '';
        return;
      }
      
      quickTagsContainer.innerHTML = project.tags.map(tag => `
        <button class="tag text-xs px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-full border border-accent-purple/30 hover:bg-accent-purple/30" onclick="toggleTag(this)">
          ${tag}
        </button>
      `).join('');
    }

    function toggleTag(tagElement) {
      if (tagElement.classList.contains('selected')) {
        tagElement.classList.remove('selected', 'bg-accent-purple', 'text-white');
        tagElement.classList.add('bg-accent-purple/20', 'text-accent-purple');
      } else {
        tagElement.classList.add('selected', 'bg-accent-purple', 'text-white');
        tagElement.classList.remove('bg-accent-purple/20', 'text-accent-purple');
      }
    }

    function showTagModal() {
      if (!currentProject) return;
      
      document.getElementById('tagsModal').classList.remove('hidden');
      loadTagsList();
    }

    function hideTagModal() {
      document.getElementById('tagsModal').classList.add('hidden');
      document.getElementById('newTagInput').value = '';
    }

    function loadTagsList() {
      const tagsListContainer = document.getElementById('tagsListContainer');
      const project = projects[currentProject];
      
      if (!project.tags || project.tags.length === 0) {
        tagsListContainer.innerHTML = '<p class="text-gray-400 text-sm">No tags yet. Add your first tag above.</p>';
        return;
      }
      
      tagsListContainer.innerHTML = project.tags.map(tag => `
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-accent-purple">${tag}</span>
          <button onclick="deleteTag('${tag}')" class="text-rose-400 hover:text-rose-300">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      `).join('');
    }

    function addNewTag() {
      const newTagInput = document.getElementById('newTagInput');
      const tagName = newTagInput.value.trim();
      
      if (!tagName || !currentProject) return;
      
      if (!projects[currentProject].tags) {
        projects[currentProject].tags = [];
      }
      
      if (projects[currentProject].tags.includes(tagName)) {
        alert('Tag already exists!');
        return;
      }
      
      projects[currentProject].tags.push(tagName);
      saveProjects();
      loadTagsList();
      loadTags();
      newTagInput.value = '';
      
      // Update dashboard if needed
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
      }
    }

    function deleteTag(tagName) {
      if (!currentProject) return;
      
      if (confirm(`Are you sure you want to delete the tag "${tagName}"?`)) {
        projects[currentProject].tags = projects[currentProject].tags.filter(tag => tag !== tagName);
        
        // Remove tag from all logs
        if (projects[currentProject].logs) {
          projects[currentProject].logs.forEach(log => {
            if (log.tags) {
              log.tags = log.tags.filter(tag => tag !== tagName);
            }
          });
        }
        
        saveProjects();
        loadTagsList();
        loadTags();
        loadLogs();
        
        // Update dashboard if needed
        if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
          updateDashboardStats();
          updateRecentActivity();
        }
      }
    }

    // Version functions
    function showVersionModal() {
      if (!currentProject) return;
      
      document.getElementById('versionModal').classList.remove('hidden');
      document.getElementById('versionInput').value = projects[currentProject].version || '1.0.0';
    }

    function hideVersionModal() {
      document.getElementById('versionModal').classList.add('hidden');
    }

    function saveVersion() {
      const versionInput = document.getElementById('versionInput');
      const version = versionInput.value.trim();
      
      if (!version || !currentProject) return;
      
      projects[currentProject].version = version;
      saveProjects();
      document.getElementById('currentVersion').textContent = version;
      hideVersionModal();
    }

    // Storage functions
    function saveProjects() {
      localStorage.setItem('logDiary_projects', JSON.stringify(projects));
    }

    // Export/Import functions
    function setupExportImport() {
      document.getElementById('export-app-btn').addEventListener('click', exportAllProjects);
      document.getElementById('import-app-input').addEventListener('change', importProjects);
    }

    function exportAllProjects() {
      const zip = new JSZip();
      const exportData = {
        projects: projects,
        exportDate: new Date().toISOString(),
        version: '1.2.0'
      };
      
      zip.file('logdiary-backup.json', JSON.stringify(exportData, null, 2));
      
      zip.generateAsync({type: 'blob'}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `logdiary-backup-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
      });
    }

    function exportProject(projectName) {
      const zip = new JSZip();
      const exportData = {
        [projectName]: projects[projectName],
        exportDate: new Date().toISOString(),
        version: '1.2.0'
      };
      
      zip.file(`${projectName}-backup.json`, JSON.stringify(exportData, null, 2));
      
      zip.generateAsync({type: 'blob'}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${projectName}-backup-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
      });
    }

    function importProjects(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      JSZip.loadAsync(file).then(function(zip) {
        const jsonFile = Object.keys(zip.files).find(filename => filename.endsWith('.json'));
        if (!jsonFile) {
          alert('Invalid backup file format!');
          return;
        }
        
        return zip.files[jsonFile].async('string');
      }).then(function(content) {
        try {
          const importData = JSON.parse(content);
          
          if (importData.projects) {
            // Full backup import
            Object.assign(projects, importData.projects);
          } else {
            // Single project import
            Object.assign(projects, importData);
          }
          
          saveProjects();
          loadProjects();
          showDashboard();
          alert('Projects imported successfully!');
        } catch (error) {
          alert('Error importing backup file!');
          console.error(error);
        }
      }).catch(function(error) {
        alert('Error reading backup file!');
        console.error(error);
      });
      
      // Reset file input
      event.target.value = '';
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + N: New Project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('projectName').focus();
      }
      
      // Ctrl/Cmd + Enter: Add Log (when log input is focused)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === document.getElementById('logInput')) {
        e.preventDefault();
        addLog();
      }
      
      // Escape: Close modals
      if (e.key === 'Escape') {
        hideVersionModal();
        hideTagModal();
      }
    });

    // --- Update Tag Filter Dropdown ---
    function updateTagFilterDropdown() {
      const tagSelect = document.getElementById('logTagFilter');
      const project = projects[currentProject];
      if (!tagSelect) return;
      tagSelect.innerHTML = '<option value="">All Tags</option>';
      if (project && project.tags && project.tags.length > 0) {
        project.tags.forEach(tag => {
          const opt = document.createElement('option');
          opt.value = tag;
          opt.textContent = tag;
          tagSelect.appendChild(opt);
        });
      }
    }