    let projects = JSON.parse(localStorage.getItem('logDiary_projects') || '{}');
    let currentProject = localStorage.getItem('logDiary_currentProject') || null;

    let logSearchKeyword = '';
    let logDateFilter = '';
    let logTagFilter = '';
    let hideCommits = false;

    document.addEventListener('DOMContentLoaded', function() {
      loadProjects();
      
      const hasSeenWarning = localStorage.getItem('logDiary_warningSeen');
      if (!hasSeenWarning) {
        document.getElementById('firstTimeModal').classList.remove('hidden');
      }
      
      if (Object.keys(projects).length === 0 || !currentProject) {
        showDashboard();
      } else {
        selectProject(currentProject);
      }
      
      // Restore hideCommits preference
      hideCommits = localStorage.getItem('logDiary_hideCommits') === 'true';
      applyHideCommitsState();
      
      // Apply input bar state after DOM is ready
      applyInputBarState();
      
      document.getElementById('projectName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addProject();
      });
      
      document.getElementById('logInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addLog();
      });

      setupExportImport();

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

    function hideFirstTimeModal() {
      document.getElementById('firstTimeModal').classList.add('hidden');
      localStorage.setItem('logDiary_warningSeen', 'true');
    }

    function toggleCommitsFilter() {
      hideCommits = !hideCommits;
      localStorage.setItem('logDiary_hideCommits', hideCommits.toString());
      const button = document.getElementById('hideCommitsToggle');
      const text = document.getElementById('hideCommitsText');
      
      if (hideCommits) {
        button.classList.remove('bg-card-500');
        button.classList.add('bg-primary-500/20', 'border', 'border-primary-500/30');
        text.textContent = 'Show Commits';
      } else {
        button.classList.remove('bg-primary-500/20', 'border', 'border-primary-500/30');
        button.classList.add('bg-card-500');
        text.textContent = 'Hide Commits';
      }
      
      loadLogs();
    }

    function applyHideCommitsState() {
      const button = document.getElementById('hideCommitsToggle');
      const text = document.getElementById('hideCommitsText');
      if (!button || !text) return;
      if (hideCommits) {
        button.classList.remove('bg-card-500');
        button.classList.add('bg-primary-500/20', 'border', 'border-primary-500/30');
        text.textContent = 'Show Commits';
      } else {
        button.classList.remove('bg-primary-500/20', 'border', 'border-primary-500/30');
        button.classList.add('bg-card-500');
        text.textContent = 'Hide Commits';
      }
    }

    function showDashboard() {
      currentProject = null;
      localStorage.removeItem('logDiary_currentProject');
      
      document.getElementById('dashboardView').classList.remove('hidden');
      document.getElementById('projectView').classList.add('hidden');
      document.getElementById('fixedInputBar').classList.add('hidden');
      
      updateDashboardStats();
      updateRecentActivity();
      updateProgressInsights();
      
      document.querySelectorAll('#projectList li').forEach(li => {
        li.classList.remove('bg-primary-500/20', 'border-primary-500/30');
        li.classList.add('bg-card-500', 'border-card-400');
      });
    }

    function showProjectView() {
      document.getElementById('dashboardView').classList.add('hidden');
      document.getElementById('projectView').classList.remove('hidden');
      document.getElementById('fixedInputBar').classList.remove('hidden');
      
      // input bar 
      applyInputBarState();
    }

    function updateDashboardStats() {
      const totalProjects = Object.keys(projects).length;
      const totalLogs = Object.values(projects).reduce((sum, project) => sum + (project.logs?.length || 0), 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyLogs = Object.values(projects).reduce((sum, project) => {
        if (!project.logs) return sum;
        return sum + project.logs.filter(log => new Date(log.timestamp) > weekAgo).length;
      }, 0);
      
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
            <div class="border-t border-surface-500 my-2"></div>
            <div class="text-xs text-gray-500 text-center">
              💾 Remember to export your data regularly
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

    function loadProjects() {
      const projectList = document.getElementById('projectList');
      projectList.innerHTML = '';
      
      Object.keys(projects).forEach(projectName => {
        const li = document.createElement('li');
        li.className = 'group p-3 rounded-lg cursor-pointer transition border bg-card-500 border-card-400 hover:bg-card-300';
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
        showToast('Project already exists', 'error');
        return;
      }
      
      projects[projectName] = {
        logs: [],
        tags: [],
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        gitRepo: null,
        planning: {
          backlog: [],
          inProgress: [],
          completed: []
        }
      };
      
      saveProjects();
      loadProjects();
      selectProject(projectName);
      document.getElementById('projectName').value = '';
      showToast('Project created', 'success');
    }

    function selectProject(projectName) {
      if (!projects[projectName]) {
        // Fallback if project was removed or name is invalid
        currentProject = null;
        localStorage.removeItem('logDiary_currentProject');
        showDashboard();
        return;
      }

      currentProject = projectName;
      localStorage.setItem('logDiary_currentProject', projectName);
      
      showProjectView();
      
      document.getElementById('currentProjectTitle').innerHTML = `
        <i class="fas fa-book text-primary-500"></i>
        <span>${projectName}</span>
      `;
      
      document.getElementById('versionDisplay').classList.remove('hidden');
      document.getElementById('deleteProjectBtn').classList.remove('hidden');
      document.getElementById('manageTagsBtn').classList.remove('hidden');
      document.getElementById('planningBtn').classList.remove('hidden');
      document.getElementById('gitBtn').classList.remove('hidden');
      
      document.getElementById('currentVersion').textContent = projects[projectName].version || '1.0.0';
      
      if (projects[projectName].gitRepo) {
        document.getElementById('gitStatusDisplay').classList.remove('hidden');
        document.getElementById('gitPanel').classList.remove('hidden');
        document.getElementById('gitRepoName').textContent = projects[projectName].gitRepo.name || 'Repository';
        document.getElementById('gitBranch').textContent = projects[projectName].gitRepo.branch || 'main';
        updateGitStatus();
      } else {
        document.getElementById('gitStatusDisplay').classList.add('hidden');
        document.getElementById('gitPanel').classList.add('hidden');
      }
      
      document.querySelectorAll('#projectList li').forEach(li => {
        li.classList.remove('bg-primary-500/20', 'border-primary-500/30');
        li.classList.add('bg-card-500', 'border-card-400');
      });
      
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
      
      safeConfirm(`Are you sure you want to delete "${currentProject}"? This action cannot be undone.`).then((ok) => {
        if (!ok) return;
        delete projects[currentProject];
        saveProjects();
        loadProjects();
        showDashboard();
        showToast('Project deleted', 'info');
      });
    }

    function showGitModal() {
      if (!currentProject) {
        showToast('Please select a project first', 'error');
        return;
      }
      
      document.getElementById('gitModal').classList.remove('hidden');
      
      if (projects[currentProject].gitRepo && projects[currentProject].gitRepo.url) {
        document.getElementById('gitRepoInput').value = projects[currentProject].gitRepo.url;
      }
    }

    function hideGitModal() {
      document.getElementById('gitModal').classList.add('hidden');
      document.getElementById('gitRepoInput').value = '';
    }

    function toggleGitPanel() {
      const content = document.getElementById('gitStatusContent');
      const toggle = document.getElementById('gitPanelToggle');
      
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggle.style.transform = 'rotate(0deg)';
      } else {
        content.classList.add('expanded');
        toggle.style.transform = 'rotate(180deg)';
      }
    }

    function connectGitRepo() {
      const repoUrl = document.getElementById('gitRepoInput').value.trim();
      if (!repoUrl) {
        showToast('Please enter a repository URL', 'error');
        return;
      }
      
      let repoName = repoUrl.split('/').pop().replace('.git', '');
      let owner = '';
      
      if (repoName.includes(':')) {
        repoName = repoName.split(':').pop().replace('.git', '');
        owner = repoUrl.split(':')[1].split('/')[0];
      } else {
        const urlParts = repoUrl.split('/');
        owner = urlParts[urlParts.length - 2];
      }
      
      if (!currentProject) {
        showToast('Please select a project first', 'error');
        return;
      }
      
      if (!projects[currentProject].gitRepo) {
        projects[currentProject].gitRepo = {};
      }
      
      projects[currentProject].gitRepo.url = repoUrl;
      projects[currentProject].gitRepo.name = repoName;
      projects[currentProject].gitRepo.owner = owner;
      projects[currentProject].gitRepo.branch = 'main';
      projects[currentProject].gitRepo.connected = true;
      projects[currentProject].gitRepo.lastSync = new Date().toISOString();
      
      saveProjects();
      
      document.getElementById('gitStatusDisplay').classList.remove('hidden');
      document.getElementById('gitPanel').classList.remove('hidden');
      document.getElementById('gitRepoName').textContent = repoName;
      document.getElementById('gitBranch').textContent = 'main';
      
      importCommitHistory();
      
      hideGitModal();
      showToast('Repository connected. Importing commits...', 'success');
    }

    async function importCommitHistory() {
      if (!currentProject || !projects[currentProject].gitRepo) return;
      
      const repo = projects[currentProject].gitRepo;
      const owner = repo.owner;
      const repoName = repo.name;
      
      const gitStatusContent = document.getElementById('gitStatusContent');
      gitStatusContent.innerHTML = `
        <div class="p-4 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p class="text-sm text-gray-400">Fetching commit history...</p>
        </div>
      `;
      
      try {
        const commits = await fetchGitHubCommits(owner, repoName);
        
        commits.forEach(commit => {
          const commitLog = {
            text: `Git commit: ${commit.commit.message}`,
            timestamp: commit.commit.author.date,
            tags: ['git', 'commit'],
            type: 'commit',
            commitHash: commit.sha,
            commitMessage: commit.commit.message,
            commitAuthor: commit.commit.author.name,
            commitFiles: commit.files ? commit.files.map(file => file.filename) : []
          };
          
          if (!projects[currentProject].logs) {
            projects[currentProject].logs = [];
          }
          
          const existingCommit = projects[currentProject].logs.find(log => 
            log.type === 'commit' && log.commitHash === commit.sha
          );
          
          if (!existingCommit) {
            projects[currentProject].logs.push(commitLog);
          }
        });
        
        projects[currentProject].gitRepo.lastSync = new Date().toISOString();
        saveProjects();
        loadLogs();
        updateGitStatus();
        
        if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
          updateDashboardStats();
          updateRecentActivity();
          updateProgressInsights();
        }
        
      } catch (error) {
        console.error('Error fetching GitHub commits:', error);
        showToast('Error fetching commit history', 'error');
      }
    }

    async function fetchGitHubCommits(owner, repo) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LogDiary-App'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found. Please check the repository URL.');
        } else if (response.status === 403) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`GitHub API error: ${response.status}`);
        }
      }
      
      const commits = await response.json();
      
      const commitsWithFiles = await Promise.all(
        commits.map(async (commit) => {
          try {
            const commitResponse = await fetch(commit.url, {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LogDiary-App'
              }
            });
            
            if (commitResponse.ok) {
              const commitData = await commitResponse.json();
              return {
                ...commit,
                files: commitData.files || []
              };
            }
            
            return commit;
          } catch (error) {
            console.warn('Error fetching commit details:', error);
            return commit;
          }
        })
      );
      
      return commitsWithFiles;
    }

    function generateMockCommits(repoName, lastSync) {
      const commitMessages = [
        'Initial commit',
        'Add basic functionality',
        'Fix UI issues',
        'Add new features',
        'Update documentation',
        'Bug fixes and improvements',
        'Refactor code structure',
        'Add tests',
        'Performance optimizations',
        'Security updates'
      ];
      
      const authors = ['Developer', 'Team Lead', 'Contributor', 'Maintainer'];
      const files = ['app.js', 'index.html', 'styles.css', 'package.json', 'README.md', 'config.js', 'utils.js', 'api.js'];
      
      const commits = [];
      const baseTime = lastSync ? new Date(lastSync) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < Math.floor(Math.random() * 8) + 3; i++) {
        const commitTime = new Date(baseTime.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
        const commitFiles = files.slice(0, Math.floor(Math.random() * 4) + 1);
        
        commits.push({
          hash: Math.random().toString(36).substring(2, 9),
          message: commitMessages[Math.floor(Math.random() * commitMessages.length)],
          author: authors[Math.floor(Math.random() * authors.length)],
          date: commitTime.toISOString(),
          files: commitFiles
        });
      }
      
      return commits.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function updateGitStatus() {
      if (!currentProject || !projects[currentProject].gitRepo) return;
      
      const gitStatusContent = document.getElementById('gitStatusContent');
      
      const commitLogs = projects[currentProject].logs?.filter(log => log.type === 'commit') || [];
      const totalCommits = commitLogs.length;
      const recentCommits = commitLogs.slice(-3);
      const lastSync = projects[currentProject].gitRepo.lastSync;
      
      const statusHTML = `
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Total Commits</span>
            <span class="text-primary-400 font-semibold">${totalCommits}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Last Sync</span>
            <span class="text-xs text-gray-400">${lastSync ? formatTimeAgo(lastSync) : 'Never'}</span>
          </div>
          <div class="border-t border-surface-500 my-2"></div>
          <div class="text-sm">
            <div class="text-gray-400 mb-2">Recent Commits:</div>
            ${recentCommits.length > 0 ? recentCommits.map(commit => `
              <div class="bg-card-500 rounded-lg p-2 mb-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-primary-400 font-mono">${commit.commitHash.substring(0, 7)}</span>
                  <span class="text-xs text-gray-400">${formatTimeAgo(commit.timestamp)}</span>
                </div>
                <p class="text-sm">${commit.commitMessage}</p>
                <p class="text-xs text-gray-400">by ${commit.commitAuthor}</p>
              </div>
            `).join('') : '<p class="text-gray-400 text-sm">No commits found</p>'}
          </div>
          <div class="border-t border-surface-500 my-2"></div>
          <button onclick="importCommitHistory()" class="w-full px-3 py-2 bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors text-sm">
            <i class="fas fa-sync-alt"></i> Sync Commit History
          </button>
        </div>
      `;
      
      gitStatusContent.innerHTML = statusHTML;
    }

    async function refreshGitStatus() {
      try {
        await importCommitHistory();
      } catch (error) {
        console.error('Error refreshing Git status:', error);
        alert('Error refreshing commit history. Please try again.');
      }
    }

    function showPlanningModal() {
      if (!currentProject) return;
      
      document.getElementById('planningModal').classList.remove('hidden');
      loadPlanningItems();
    }

    function hidePlanningModal() {
      document.getElementById('planningModal').classList.add('hidden');
    }

    function loadPlanningItems() {
      const project = projects[currentProject];
      if (!project.planning) {
        project.planning = {
          backlog: [],
          inProgress: [],
          completed: []
        };
      }
      
      const backlogList = document.getElementById('backlogList');
      backlogList.innerHTML = project.planning.backlog.map((item, index) => `
        <div class="bg-surface-500 rounded-lg p-3 border border-surface-400">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium">${item.title}</p>
              ${item.description ? `<p class="text-xs text-gray-400 mt-1">${item.description}</p>` : ''}
            </div>
            <button onclick="deletePlanningItem('backlog', ${index})" class="text-rose-400 hover:text-rose-300 ml-2">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
      
      const inProgressList = document.getElementById('inProgressList');
      inProgressList.innerHTML = project.planning.inProgress.map((item, index) => `
        <div class="bg-surface-500 rounded-lg p-3 border border-surface-400">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium">${item.title}</p>
              ${item.description ? `<p class="text-xs text-gray-400 mt-1">${item.description}</p>` : ''}
            </div>
            <button onclick="deletePlanningItem('inProgress', ${index})" class="text-rose-400 hover:text-rose-300 ml-2">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
      
      const completedList = document.getElementById('completedList');
      completedList.innerHTML = project.planning.completed.map((item, index) => `
        <div class="bg-surface-500 rounded-lg p-3 border border-surface-400">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium">${item.title}</p>
              ${item.description ? `<p class="text-xs text-gray-400 mt-1">${item.description}</p>` : ''}
            </div>
            <button onclick="deletePlanningItem('completed', ${index})" class="text-rose-400 hover:text-rose-300 ml-2">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    function addPlanningItem(category) {
      const title = prompt(`Enter title for ${category} item:`);
      if (!title) return;
      
      const description = prompt(`Enter description (optional):`);
      
      if (!currentProject) return;
      
      if (!projects[currentProject].planning) {
        projects[currentProject].planning = {
          backlog: [],
          inProgress: [],
          completed: []
        };
      }
      
      const item = {
        title: title,
        description: description || '',
        createdAt: new Date().toISOString()
      };
      
      projects[currentProject].planning[category].push(item);
      saveProjects();
      loadPlanningItems();
    }

    function deletePlanningItem(category, index) {
      if (!currentProject) return;
      
      if (confirm('Are you sure you want to delete this item?')) {
        projects[currentProject].planning[category].splice(index, 1);
        saveProjects();
        loadPlanningItems();
      }
    }

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

      // Build working list with original indices
      let working = project.logs.map((log, originalIndex) => ({ log, originalIndex }));

      if (logSearchKeyword) {
        working = working.filter(item => item.log.text.toLowerCase().includes(logSearchKeyword));
      }
      if (logDateFilter) {
        working = working.filter(item => item.log.timestamp && item.log.timestamp.startsWith(logDateFilter));
      }
      if (logTagFilter) {
        working = working.filter(item => item.log.tags && item.log.tags.includes(logTagFilter));
      }
      if (hideCommits) {
        working = working.filter(item => item.log.type !== 'commit');
      }

      if (working.length === 0) {
        logList.innerHTML = `
          <li class="text-center py-8 text-gray-500">
            <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
            <p>No logs match your search/filter.</p>
          </li>
        `;
        return;
      }

      logList.innerHTML = working.map(({ log, originalIndex }) => `
        <li class="flex items-start gap-3 p-4 bg-card-500 rounded-lg border border-card-400 hover:bg-card-400 transition group">
          <div class="flex-shrink-0 w-2 h-2 ${log.type === 'commit' ? 'bg-primary-500' : 'bg-accent-green'} rounded-full mt-2"></div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-400">${new Date(log.timestamp).toLocaleString()}</span>
                ${log.type === 'commit' ? '<span class="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">Git</span>' : ''}
              </div>
              <button onclick="deleteLog(${originalIndex})" class="text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-trash text-sm"></i>
              </button>
            </div>
            <p class="text-gray-200 mb-2">${log.text}</p>
            ${log.type === 'commit' ? `
              <div class="bg-surface-500 rounded-lg p-3 mb-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-primary-400 font-mono">${log.commitHash}</span>
                  <span class="text-xs text-gray-400">by ${log.commitAuthor}</span>
                </div>
                <p class="text-sm text-primary-400 font-medium">"${log.commitMessage}"</p>
                ${log.commitFiles && log.commitFiles.length > 0 ? `
                  <div class="mt-2">
                    <span class="text-xs text-gray-400">Files:</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                      ${log.commitFiles.map(file => `<span class="text-xs bg-card-400 px-2 py-0.5 rounded">${file}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
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
      
      showToast('Log added', 'success');
      
      logInput.value = '';
      document.querySelectorAll('#quickTagsContainer .tag').forEach(tag => {
        tag.classList.remove('selected', 'bg-accent-purple', 'text-white');
        tag.classList.add('bg-accent-purple/20', 'text-accent-purple');
      });
      
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
      
      showToast('Quick log added', 'success');
      
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
        updateRecentActivity();
        updateProgressInsights();
      }
    }

    async function deleteLog(index) {
      if (!currentProject || !projects[currentProject].logs) return;
      
      if (await safeConfirm('Are you sure you want to delete this log entry?')) {
        // index is original index in projects[currentProject].logs
        projects[currentProject].logs.splice(index, 1);
        saveProjects();
        loadLogs();
        
        showToast('Log deleted', 'info');
        
        if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
          updateDashboardStats();
          updateRecentActivity();
          updateProgressInsights();
        }
      }
    }

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
        showToast('Tag already exists', 'error');
        return;
      }
      
      projects[currentProject].tags.push(tagName);
      saveProjects();
      loadTagsList();
      loadTags();
      newTagInput.value = '';
      
      showToast('Tag added', 'success');
      
      if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
        updateDashboardStats();
      }
    }

    function deleteTag(tagName) {
      if (!currentProject) return;
      
      safeConfirm(`Are you sure you want to delete the tag "${tagName}"?`).then((ok) => {
        if (!ok) return;
        projects[currentProject].tags = projects[currentProject].tags.filter(tag => tag !== tagName);
        
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
        
        showToast('Tag deleted', 'info');
        
        if (document.getElementById('dashboardView').classList.contains('hidden') === false) {
          updateDashboardStats();
          updateRecentActivity();
        }
      });
    }

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

    function saveProjects() {
      localStorage.setItem('logDiary_projects', JSON.stringify(projects));
    }

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
          showToast('Invalid backup file format!', 'error');
          return;
        }
        
        return zip.files[jsonFile].async('string');
      }).then(function(content) {
        try {
          const importData = JSON.parse(content);
          
          if (importData.projects) {
            Object.assign(projects, importData.projects);
          } else {
            Object.assign(projects, importData);
          }
          
          saveProjects();
          loadProjects();
          showDashboard();
          showToast('Projects imported successfully', 'success');
        } catch (error) {
          showToast('Error importing backup file', 'error');
          console.error(error);
        }
      }).catch(function(error) {
        showToast('Error reading backup file', 'error');
        console.error(error);
      });
      
      event.target.value = '';
    }

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

    // Collapsible Input Bar
    function applyInputBarState() {
      const isCollapsed = localStorage.getItem('logDiary_inputCollapsed') === 'true';
      const content = document.getElementById('inputBarContent');
      const toggleText = document.getElementById('inputBarToggleText');
      const toggleIcon = document.getElementById('inputBarToggleIcon');
      const fixedBar = document.getElementById('fixedInputBar');

      if (!fixedBar) return;

      if (isCollapsed) {
        if (content) content.classList.remove('expanded');
        if (toggleText) toggleText.textContent = 'Expand';
        if (toggleIcon) {
          toggleIcon.classList.remove('fa-chevron-up');
          toggleIcon.classList.add('fa-chevron-down');
        }
      } else {
        if (content) content.classList.add('expanded');
        if (toggleText) toggleText.textContent = 'Collapse';
        if (toggleIcon) {
          toggleIcon.classList.remove('fa-chevron-down');
          toggleIcon.classList.add('fa-chevron-up');
        }
        const logInput = document.getElementById('logInput');
        if (logInput) setTimeout(() => logInput.focus(), 50);
      }
    }

    function toggleInputBar() {
      const isCollapsed = localStorage.getItem('logDiary_inputCollapsed') === 'true';
      localStorage.setItem('logDiary_inputCollapsed', (!isCollapsed).toString());
      applyInputBarState();
    }

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('projectName').focus();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === document.getElementById('logInput')) {
        e.preventDefault();
        addLog();
      }
      
      if (e.key === 'Escape') {
        hideVersionModal();
        hideTagModal();
        hidePlanningModal();
        hideGitModal();
        hideFirstTimeModal();
      }
    });

    // Toasts
    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const wrap = document.createElement('div');
      const colors = {
        info: 'bg-card-500 border-card-400',
        success: 'bg-accent-green/10 border-accent-green/20',
        error: 'bg-rose-500/10 border-rose-500/20'
      };
      wrap.className = `px-4 py-3 rounded-lg border refined-shadow text-sm ${colors[type] || colors.info}`;
      wrap.textContent = message;
      container.appendChild(wrap);
      setTimeout(() => {
        wrap.style.opacity = '0';
        wrap.style.transition = 'opacity 200ms ease';
        setTimeout(() => wrap.remove(), 250);
      }, 2500);
    }

    // Confirm Modal
    let confirmResolver = null;
    function showConfirm(message) {
      return new Promise((resolve) => {
        confirmResolver = resolve;
        const modal = document.getElementById('confirmModal');
        const msg = document.getElementById('confirmMessage');
        if (msg) msg.textContent = message;
        if (modal) modal.classList.remove('hidden');
      });
    }
    function hideConfirmModal(confirmed) {
      const modal = document.getElementById('confirmModal');
      if (modal) modal.classList.add('hidden');
      if (confirmResolver) {
        confirmResolver(confirmed);
        confirmResolver = null;
      }
    }

    async function safeConfirm(message) {
      // Prefer custom modal; fallback to native confirm if unavailable
      const modal = document.getElementById('confirmModal');
      if (!modal) return confirm(message);
      return await showConfirm(message);
    }

    // Clear Filters
    function clearLogFilters() {
      const searchInput = document.getElementById('logSearchInput');
      const dateInput = document.getElementById('logDateFilter');
      const tagSelect = document.getElementById('logTagFilter');
      if (searchInput) searchInput.value = '';
      if (dateInput) dateInput.value = '';
      if (tagSelect) tagSelect.value = '';
      logSearchKeyword = '';
      logDateFilter = '';
      logTagFilter = '';
      loadLogs();
      showToast('Filters cleared', 'info');
    }
