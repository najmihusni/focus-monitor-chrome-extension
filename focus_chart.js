// ✅ Global Variables
let chartData = { labels: [], values: [], points: [] };
let currentUser = null;
let currentRole = null;
let fullDetailedData = [];
let classData = [];
let enrollmentData = [];

// ✅ Initialize and Auto-detect User Role
async function initializeApp() {
  try {
    // Get current user from storage (passed from popup)
    await getCurrentUser();
    
    // Setup UI based on role
    setupRoleBasedUI();
    
    // Load initial data
    await loadAllData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup chart interactions
    setupHoverTooltip();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showError('Failed to load dashboard. Please try refreshing the page.');
  }
}

// ✅ Get Current User from Chrome Storage or URL params
async function getCurrentUser() {
  return new Promise((resolve) => {
    // Try to get user from Chrome extension storage first
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['user'], (result) => {
        if (result.user) {
          currentUser = result.user;
          currentRole = result.user.role;
          resolve();
        } else {
          // Fallback: try to get from URL parameters or localStorage
          const urlParams = new URLSearchParams(window.location.search);
          const storedUser = localStorage.getItem('currentUser');
          
          if (urlParams.get('user')) {
            currentUser = { name: urlParams.get('user'), role: urlParams.get('role') || 'student' };
            currentRole = currentUser.role;
          } else if (storedUser) {
            currentUser = JSON.parse(storedUser);
            currentRole = currentUser.role;
          } else {
            // Default to student view if no user found
            currentUser = { name: 'Guest', role: 'student' };
            currentRole = 'student';
          }
          resolve();
        }
      });
    } else {
      // Not in extension context, use fallback
      const urlParams = new URLSearchParams(window.location.search);
      const storedUser = localStorage.getItem('currentUser');
      
      if (urlParams.get('user')) {
        currentUser = { name: urlParams.get('user'), role: urlParams.get('role') || 'student' };
        currentRole = currentUser.role;
      } else if (storedUser) {
        currentUser = JSON.parse(storedUser);
        currentRole = currentUser.role;
      } else {
        currentUser = { name: 'Guest', role: 'student' };
        currentRole = 'student';
      }
      resolve();
    }
  });
}

// ✅ Setup UI Based on User Role
function setupRoleBasedUI() {
  const userInfo = document.getElementById('userInfo');
  const welcomeText = document.getElementById('welcomeText');
  const roleBadge = document.getElementById('roleBadge');
  const lecturerControls = document.getElementById('lecturerControls');
  const statsOverview = document.getElementById('statsOverview');
  const studentList = document.getElementById('studentList');
  const comparisonOption = document.getElementById('comparisonOption');

  // Update welcome message
  welcomeText.textContent = `Welcome, ${currentUser.name}`;
  roleBadge.textContent = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  roleBadge.className = `role-badge ${currentRole}`;

  if (currentRole === 'lecturer') {
    // Show lecturer-specific controls
    lecturerControls.classList.add('visible');
    statsOverview.classList.add('visible');
    studentList.classList.add('visible');
    comparisonOption.style.display = 'flex';
  } else {
    // Student view - hide lecturer controls
    lecturerControls.classList.remove('visible');
    statsOverview.classList.remove('visible');
    studentList.classList.remove('visible');
    comparisonOption.style.display = 'none';
  }
}

// ✅ Load All Required Data
async function loadAllData() {
  try {
    // Load focus history data
    const historyResponse = await fetch('https://chrome-focus-plugin.onrender.com/api/focus/history');
    fullDetailedData = await historyResponse.json();

    // Load classes and enrollments for lecturers
    if (currentRole === 'lecturer') {
      await loadLecturerData();
    }

    // Initialize selectors
    initializeSelectors();
    
    // Load initial chart data
    loadInitialChartData();
    
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data from server.');
  }
}

// ✅ Load Lecturer-specific Data
async function loadLecturerData() {
  try {
    // Use the lecturer's UUID directly since it's stored as staff_id in classes table
    if (!currentUser || !currentUser.databaseId) {
      console.error('No lecturer UUID found');
      return;
    }
    
    const lecturerUUID = currentUser.databaseId;
    console.log('Loading data for lecturer UUID:', lecturerUUID);
    
    // Get lecturer's classes directly using their UUID
    const classesResponse = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes?staff_id=eq.${lecturerUUID}&select=*`, {
      headers: {
        "Accept": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
      }
    });
    
    console.log('Classes API response status:', classesResponse.status);
    classData = await classesResponse.json() || [];
    console.log('Classes loaded:', classData.length);
    console.log('Class data:', classData);
    
    // Get enrollments for lecturer's classes
    if (classData.length > 0) {
      const classIds = classData.map(c => c.id).join(',');
      console.log('Getting enrollments for class IDs:', classIds);
      
      const enrollmentResponse = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments?class_id=in.(${classIds})&select=*,users(name,matric_no)`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });
      
      enrollmentData = await enrollmentResponse.json() || [];
      console.log('Enrollments loaded:', enrollmentData.length);
    } else {
      console.log('No classes found for lecturer');
      enrollmentData = [];
    }
    
    // Update lecturer dashboard
    updateLecturerDashboard();
    
    console.log('=== LECTURER DATA LOADED ===');
    console.log('Classes found:', classData.length);
    console.log('Enrollments found:', enrollmentData.length);
    
  } catch (error) {
    console.error('Error loading lecturer data:', error);
    classData = [];
    enrollmentData = [];
  }
}

// ✅ Initialize Selectors
function initializeSelectors() {
  const userSelect = document.getElementById('userSelect');
  const dateSelect = document.getElementById('dateSelector');
  const classSelect = document.getElementById('classSelect');

  // Get unique users and dates from focus data
  const users = [...new Set(fullDetailedData.map(e => e.user_name).filter(Boolean))];
  const dates = [...new Set(fullDetailedData.map(e => e.timestamp.substring(0, 8)))].sort().reverse();

  // Populate date selector
  dateSelect.innerHTML = '';
  dates.forEach(dateYmd => {
    const formatted = formatDate(dateYmd);
    const option = document.createElement('option');
    option.value = formatted;
    option.textContent = formatted;
    dateSelect.appendChild(option);
  });

  if (currentRole === 'lecturer') {
    // Populate class selector
    classSelect.innerHTML = '<option value="">All Classes</option>';
    if (classData && classData.length > 0) {
      classData.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.name;
        classSelect.appendChild(option);
      });
    }

    // Populate user selector
    userSelect.innerHTML = '<option value="">All Students</option>';
    // Use all students who have focus data as fallback
    const allStudents = [...new Set(fullDetailedData.map(e => e.user_name).filter(Boolean))];
    allStudents.forEach(student => {
      const option = document.createElement('option');
      option.value = student;
      option.textContent = student;
      userSelect.appendChild(option);
    });
    
    console.log('=== SELECTOR DEBUG ===');
    console.log('Classes in selector:', classData.length);
    console.log('Students in selector:', allStudents.length);
  }

  // Set default date to today or most recent
  if (dates.length > 0) {
    dateSelect.value = formatDate(dates[0]);
  }
}

function updateLecturerDashboard(classId = null) {
  if (currentRole !== 'lecturer') return;

  // Get all students who have focus data (since enrollmentData might be empty)
  let studentsToInclude;
  if (classId && enrollmentData.length > 0) {
    // Use enrollment data if available
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    studentsToInclude = classEnrollments.map(e => e.users?.name).filter(Boolean);
  } else if (enrollmentData.length > 0) {
    // Use all enrolled students if available
    studentsToInclude = [...new Set(enrollmentData.map(e => e.users?.name).filter(Boolean))];
  } else {
    // Fallback: use all students who have focus data
    studentsToInclude = [...new Set(fullDetailedData.map(e => e.user_name).filter(Boolean))];
  }

  const totalStudents = studentsToInclude.length;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayData = fullDetailedData.filter(d => 
    d.timestamp.slice(0, 8) === today && studentsToInclude.includes(d.user_name)
  );
  
  // Calculate stats
  const activeStudents = new Set(todayData.map(d => d.user_name)).size;
  const averageFocus = todayData.length > 0 ? 
    Math.round(todayData.reduce((sum, d) => sum + d.accuracy, 0) / todayData.length) : 0;
  
  let performanceLevel = 'Good';
  if (averageFocus >= 80) performanceLevel = 'Excellent';
  else if (averageFocus >= 60) performanceLevel = 'Good';
  else if (averageFocus >= 40) performanceLevel = 'Fair';
  else performanceLevel = 'Needs Improvement';

  // Update stats cards
  document.getElementById('totalStudents').textContent = totalStudents;
  document.getElementById('activeStudents').textContent = activeStudents;
  document.getElementById('averageFocus').textContent = averageFocus + '%';
  document.getElementById('classPerformance').textContent = performanceLevel;

  // Update student grid
  updateStudentGrid(classId);
}

// ✅ Update Student Grid
function updateStudentGrid(classId = null) {
  const studentsGrid = document.getElementById('studentsGrid');
  const selectedDate = document.getElementById('dateSelector').value.replace(/-/g, '');
  
  studentsGrid.innerHTML = '';
  
// Filter students by class if specified
let enrolledStudents;
if (classId && enrollmentData.length > 0) {
  const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
  enrolledStudents = classEnrollments.map(e => e.users?.name).filter(Boolean);
} else if (enrollmentData.length > 0) {
  enrolledStudents = [...new Set(enrollmentData.map(e => e.users?.name).filter(Boolean))];
} else {
  // Fallback: show all students who have focus data
  const selectedDate = document.getElementById('dateSelector').value.replace(/-/g, '');
  const dateData = fullDetailedData.filter(d => d.timestamp.slice(0, 8) === selectedDate);
  enrolledStudents = [...new Set(dateData.map(e => e.user_name).filter(Boolean))];
}
  
  enrolledStudents.forEach(studentName => {
    const studentData = fullDetailedData.filter(d => 
      d.user_name === studentName && d.timestamp.slice(0, 8) === selectedDate
    );
    
    const card = document.createElement('div');
    card.className = 'student-card';
    card.dataset.student = studentName;

    // Only show cards for students who have data
    if (studentData.length > 0) {
      const avgFocus = studentData.reduce((sum, d) => sum + d.accuracy, 0) / studentData.length;
      let focusStatus, statusText;
      
      if (avgFocus >= 80) {
        focusStatus = 'focused';
        statusText = `${Math.round(avgFocus)}% Focused`;
      } else if (avgFocus >= 50) {
        focusStatus = 'moderate';
        statusText = `${Math.round(avgFocus)}% Moderate`;
      } else {
        focusStatus = 'distracted';
        statusText = `${Math.round(avgFocus)}% Distracted`;
        card.classList.add('not-focused');
      }

      card.innerHTML = `
        <div class="student-name">${studentName}</div>
        <div class="focus-status ${focusStatus}">${statusText}</div>
      `;
      
      card.addEventListener('click', () => {
        // Clear previous selections
        document.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        // Update user selector and load data
        document.getElementById('userSelect').value = studentName;
        loadFocusData(studentName, document.getElementById('dateSelector').value);
      });
      
      studentsGrid.appendChild(card);
    }
  });
}

// ✅ Setup Event Listeners
function setupEventListeners() {
  const dateSelector = document.getElementById('dateSelector');
  const userSelect = document.getElementById('userSelect');
  const classSelect = document.getElementById('classSelect');
  const toggleDetailed = document.getElementById('toggleDetailed');
  const showComparison = document.getElementById('showComparison');
  const refreshBtn = document.getElementById('refreshData');

// Date change
dateSelector.addEventListener('change', () => {
  const selectedUser = currentRole === 'student' ? currentUser.name : userSelect.value;
  const selectedClass = document.getElementById('classSelect')?.value || null;
  loadFocusData(selectedUser, dateSelector.value, selectedClass);
  if (currentRole === 'lecturer') {
    updateLecturerDashboard(selectedClass);
    updateStudentGrid(selectedClass);
  }
});

  // User selection (lecturer only)
if (userSelect) {
  userSelect.addEventListener('change', () => {
    const selectedClass = document.getElementById('classSelect')?.value || null;
    loadFocusData(userSelect.value, dateSelector.value, selectedClass);
  });
}

// Class selection (lecturer only)
// Class selection (lecturer only)
if (classSelect) {
  classSelect.addEventListener('change', () => {
    const selectedClass = classSelect.value;
    console.log('=== CLASS SELECTION DEBUG ===');
    console.log('Selected class ID:', selectedClass);
    
    // Update user selector for the selected class
    updateUserSelectorForClass(selectedClass);
    
    // Update dashboard and chart
    updateLecturerDashboard(selectedClass);
    
    // Clear user selection and reload chart with class filter
    document.getElementById('userSelect').value = '';
    const selectedDate = document.getElementById('dateSelector').value;
    
    // Pass the class filter to loadFocusData
    loadFocusData('', selectedDate, selectedClass);
  });
}

  // Toggle detailed view
if (toggleDetailed) {
  toggleDetailed.addEventListener('change', () => {
    const selectedUser = currentRole === 'student' ? currentUser.name : userSelect.value;
    const selectedClass = document.getElementById('classSelect')?.value || null;
    loadFocusData(selectedUser, dateSelector.value, selectedClass);
  });
}

// Show comparison (lecturer only)
// Show all students (lecturer only)
if (showComparison) {
  showComparison.addEventListener('change', () => {
    console.log('=== SHOW ALL STUDENTS CHANGED ===');
    console.log('Checked:', showComparison.checked);
    
    const selectedUser = userSelect.value;
    const selectedClass = document.getElementById('classSelect')?.value || null;
    
    // Always allow this feature regardless of user selection
    console.log('Reloading chart with all students:', showComparison.checked);
    loadFocusData(selectedUser, dateSelector.value, selectedClass);
  });
}
  // Refresh data
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

// Load Initial Chart Data
function loadInitialChartData() {
  const dateSelector = document.getElementById('dateSelector');
  const selectedDate = dateSelector.value;
  
  if (selectedDate) {
    if (currentRole === 'student') {
      loadFocusData(currentUser.name, selectedDate);
    } else {
      loadInitialLecturerView();
    }
  }
}

// ✅ Show Message Function
function showMessage(text, type) {
  // Create a temporary message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    ${type === 'success' ? 'background-color: #22c55e;' : ''}
    ${type === 'error' ? 'background-color: #ef4444;' : ''}
    ${type === 'info' ? 'background-color: #3b82f6;' : ''}
  `;
  
  document.body.appendChild(messageDiv);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

function updateUserSelectorForClass(classId) {
  const userSelect = document.getElementById('userSelect');
  
  if (classId && enrollmentData.length > 0) {
    // Filter by enrolled students in the class
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    const classStudents = classEnrollments.map(e => e.users?.name).filter(Boolean);
    
    userSelect.innerHTML = '<option value="">All Students in Class</option>';
    classStudents.forEach(student => {
      const option = document.createElement('option');
      option.value = student;
      option.textContent = student;
      userSelect.appendChild(option);
    });
    
    console.log('Updated user selector for class:', classStudents);
  } else {
    // Reset to all students or use focus data as fallback
    userSelect.innerHTML = '<option value="">All Students</option>';
    const allStudents = [...new Set(fullDetailedData.map(e => e.user_name).filter(Boolean))];
    allStudents.forEach(student => {
      const option = document.createElement('option');
      option.value = student;
      option.textContent = student;
      userSelect.appendChild(option);
    });
  }
}
function loadInitialLecturerView() {
  if (currentRole !== 'lecturer') return;
  
  const selectedDate = document.getElementById('dateSelector').value;
  
  // Always show class aggregate data by default for lecturers
  // This ensures the chart displays data even when no specific student is selected
  loadFocusData('', selectedDate);
  
  // Optional: Still identify distracted students for potential alerts
  const dateStr = selectedDate.replace(/-/g, '');
  const dayData = fullDetailedData.filter(d => d.timestamp.substring(0, 8) === dateStr);
  
  if (dayData.length > 0) {
    // Find students with low focus (below 50%) for potential highlighting
    const studentFocusMap = {};
    dayData.forEach(entry => {
      if (!studentFocusMap[entry.user_name]) {
        studentFocusMap[entry.user_name] = [];
      }
      studentFocusMap[entry.user_name].push(entry.accuracy);
    });
    
    // Find students with average focus < 50%
    let distractedStudents = [];
    Object.keys(studentFocusMap).forEach(student => {
      const avgFocus = studentFocusMap[student].reduce((sum, acc) => sum + acc, 0) / studentFocusMap[student].length;
      if (avgFocus < 50) {
        distractedStudents.push(student);
      }
    });
    
    // Log distracted students for potential future features
    if (distractedStudents.length > 0) {
      console.log('Students needing attention:', distractedStudents);
    }
  }
}

// ✅ Filter by Class
function filterByClass(classId) {
  console.log('Filtering by class:', classId);
  
  // Update lecturer dashboard with class filter
  updateLecturerDashboard(classId);
  
  // Update user selector for the selected class
  updateUserSelectorForClass(classId);
  
  // Clear user selection when class changes
  document.getElementById('userSelect').value = '';
}
// ✅ Load Focus Data
function loadFocusData(userName, date, classId = null) {

    console.log('=== LOAD FOCUS DATA DEBUG ===');
  console.log('Called with:', { userName, date, classId });
  console.log('Current role:', currentRole);

  const showDetailed = document.getElementById('toggleDetailed')?.checked || false;
  const showComparison = document.getElementById('showComparison')?.checked || false;
  
  // Get selected class if not provided
  if (!classId) {
    classId = document.getElementById('classSelect')?.value || null;
  }
    console.log('Final classId to use:', classId);
  console.log('Show detailed:', showDetailed);
  
  if (!date) {
    showNoDataMessage();
    return;
  }
  
  // For students, use their own name
  if (currentRole === 'student') {
    userName = currentUser.name;
  }
  
  if (!userName && currentRole === 'student') {
    showNoDataMessage();
    return;
  }

 if (showDetailed) {
  loadDetailedView(userName, date, showComparison, classId);
} else {
  loadGroupedView(userName, date, showComparison, classId);
}
  
  // Update summary table
  updateSummaryTable(userName, date, classId);
}

// ✅ Load Detailed View
function loadDetailedView(userName, date, showComparison, classId = null) {
  console.log('=== LOAD DETAILED VIEW CALLED ===');
  console.log('Parameters:', { userName, date, showComparison, classId });
  
  const dateStr = date.replace(/-/g, '');
  console.log('Date string for filtering:', dateStr);
  let filtered = fullDetailedData.filter(entry => 
    entry.timestamp.substring(0, 8) === dateStr
  );

    console.log('Initial filtered data (by date):', filtered.length);


// Apply class filter FIRST if a specific class is selected
const selectedClass = classId || document.getElementById('classSelect').value;
if (selectedClass && currentRole === 'lecturer') {
  const classEnrollments = enrollmentData.filter(e => e.class_id === selectedClass);
  const classStudentNames = classEnrollments.map(e => e.users?.name).filter(Boolean);
  
  // Filter by user_name directly
  filtered = filtered.filter(entry => classStudentNames.includes(entry.user_name));
}

  // Add this right after the class filter section
if (selectedClass && currentRole === 'lecturer') {
  console.log('=== CLASS FILTER DEBUG ===');
  console.log('Selected class ID:', selectedClass);
  const classEnrollments = enrollmentData.filter(e => e.class_id === selectedClass);
  console.log('Class enrollments found:', classEnrollments.length);
  console.log('Class enrollments:', classEnrollments);
  
  const classStudentNames = classEnrollments.map(e => e.users?.name).filter(Boolean);
  console.log('Student names in class:', classStudentNames);
  
  console.log('Focus data before filter:', filtered.length);
  console.log('Sample focus entries:', filtered.slice(0, 3).map(f => ({ 
    user_name: f.user_name, 
    timestamp: f.timestamp 
  })));
  
  // After filtering
  filtered = filtered.filter(entry => {
    const userEnrollment = enrollmentData.find(e => e.users?.name === entry.user_name);
    const isEnrolled = userEnrollment && classStudentNames.includes(entry.user_name);
    console.log(`User ${entry.user_name}: enrolled=${isEnrolled}`);
    return isEnrolled;
  });
  
  console.log('Focus data after filter:', filtered.length);
}

  // Then apply user filter if specified
  if (userName) {
    filtered = filtered.filter(entry => entry.user_name === userName);
  }

  // Rest of the function remains the same...
  if (filtered.length === 0) {
    showNoDataMessage();
    return;
  }

  if (!userName && currentRole === 'lecturer') {
    // Show class aggregate data
    filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    const timeSlots = {};
    filtered.forEach(entry => {
      const timeSlot = entry.timestamp.substring(9, 13);
      if (!timeSlots[timeSlot]) {
        timeSlots[timeSlot] = [];
      }
      timeSlots[timeSlot].push(entry.accuracy);
    });
    
    const labels = Object.keys(timeSlots).sort();
    const values = labels.map(time => {
      const slotValues = timeSlots[time];
      return slotValues.reduce((sum, val) => sum + val, 0) / slotValues.length;
    });
    
    if (labels.length > 0) {
      drawLineChart(labels, values);
    } else {
      showNoDataMessage();
    }
  } else {
    // Show individual student data
    filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const labels = filtered.map(e => e.timestamp.substring(9, 13));
    const values = filtered.map(e => e.accuracy);

if (showComparison && currentRole === 'lecturer') {
  console.log('=== SHOWING ALL STUDENTS ===');
  drawAllStudentsChart(filtered, dateStr, userName, classId);
} else {
  drawLineChart(labels, values);
}
  }
}

function drawAllStudentsChart(filteredData, dateStr, selectedUser, classId) {
  console.log('=== DRAWING ALL STUDENTS CHART ===');
  
  // Get students to include
  let studentsToInclude;
  if (classId && enrollmentData.length > 0) {
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    studentsToInclude = classEnrollments.map(e => e.users?.name).filter(Boolean);
  } else {
    studentsToInclude = [...new Set(filteredData.map(e => e.user_name).filter(Boolean))];
  }
  
  console.log('Students to show:', studentsToInclude);
  
  const canvas = document.getElementById('focusLineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padL = 60, padR = 20, padT = 30, padB = 40;
  const cW = canvas.width, cH = canvas.height;
  const chartW = cW - padL - padR;
  const chartH = cH - padT - padB;
  const maxY = 100;
  const yStep = 20;

  chartData.points = [];

  // Grid lines and Y labels
  ctx.strokeStyle = '#ccc';
  ctx.fillStyle = '#444';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= maxY; i += yStep) {
    const y = padT + chartH - (i / maxY) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cW - padR, y);
    ctx.stroke();
    ctx.fillText(`${i}%`, padL - 10, y + 3);
  }

  // Colors for different students
  const colors = ['#1e88e5', '#e53e3e', '#38a169', '#d69e2e', '#805ad5', '#dd6b20', '#0bc5ea', '#ed64a6'];
  
  // Get all time slots from all students
  const allTimeSlots = new Set();
  studentsToInclude.forEach(student => {
    const studentData = filteredData.filter(d => d.user_name === student);
    studentData.forEach(point => {
      allTimeSlots.add(point.timestamp.substring(9, 13));
    });
  });
  const sortedTimes = Array.from(allTimeSlots).sort();
  
  if (sortedTimes.length === 0) {
    showNoDataMessage();
    return;
  }

  const xSpacing = sortedTimes.length > 1 ? chartW / (sortedTimes.length - 1) : 0;
  
  // Process each student
  studentsToInclude.forEach((student, index) => {
    const studentData = filteredData.filter(d => d.user_name === student);
    if (studentData.length === 0) return;
    
    studentData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const studentColor = colors[index % colors.length];
    const isSelected = student === selectedUser;
    const lineWidth = isSelected ? 4 : 2;
    const pointSize = isSelected ? 5 : 3;
    
    // Create time-value map for this student
    const studentTimeMap = {};
    studentData.forEach(point => {
      const timeSlot = point.timestamp.substring(9, 13);
      studentTimeMap[timeSlot] = point.accuracy;
    });
    
    // Draw line
    ctx.beginPath();
    let hasMoveTo = false;
    sortedTimes.forEach((time, i) => {
      if (studentTimeMap[time] !== undefined) {
        const x = padL + i * xSpacing;
        const y = padT + chartH - (studentTimeMap[time] / maxY) * chartH;
        
        if (!hasMoveTo) {
          ctx.moveTo(x, y);
          hasMoveTo = true;
        } else {
          ctx.lineTo(x, y);
        }
        
        // Store points for tooltip
        chartData.points.push({ 
          x, y, 
          label: time, 
          value: studentTimeMap[time], 
          student: student 
        });
      }
    });
    
    ctx.strokeStyle = studentColor;
    ctx.lineWidth = lineWidth;
    if (!isSelected) {
      ctx.globalAlpha = 0.7; // Make non-selected lines slightly transparent
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    
    // Draw points
    sortedTimes.forEach((time, i) => {
      if (studentTimeMap[time] !== undefined) {
        const x = padL + i * xSpacing;
        const y = padT + chartH - (studentTimeMap[time] / maxY) * chartH;
        
        ctx.beginPath();
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        ctx.fillStyle = studentColor;
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });
  });
  
  // Draw X labels (time slots)
  ctx.fillStyle = '#444';
  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  
  sortedTimes.forEach((time, i) => {
    const x = padL + i * xSpacing;
    ctx.fillText(time, x, cH - padB + 20);
  });

  // Update legend
  updateAllStudentsLegend(studentsToInclude, colors, selectedUser);
}

function updateAllStudentsLegend(students, colors, selectedUser) {
  const legend = document.querySelector('.chart-legend');
  let legendHTML = '<div style="margin-bottom: 10px; font-weight: bold;">All Students:</div>';
  
  students.forEach((student, index) => {
    const color = colors[index % colors.length];
    const isSelected = student === selectedUser;
    const style = isSelected ? 'font-weight: bold; font-size: 14px;' : '';
    
    legendHTML += `
      <div style="${style}">
        <span class="dot" style="background: ${color};"></span>
        ${student} ${isSelected ? '(Selected)' : ''}
      </div>
    `;
  });
  
  legend.innerHTML = legendHTML;
}


// ✅ Load Grouped View
function loadGroupedView(userName, date, showComparison, classId = null) {
  console.log('=== LOAD GROUPED VIEW DEBUG ===');
  console.log('Parameters:', { userName, date, showComparison, classId });
  
  fetch('https://chrome-focus-plugin.onrender.com/api/focus/grouped-history')
    .then(r => r.json())
    .then(grouped => {
      console.log('Grouped data received:', Object.keys(grouped).length, 'users');
      
      let labels = [];
      let values = [];
      
      if (userName && grouped[userName] && grouped[userName][date]) {
        // Individual user data
        console.log('Loading individual user data for:', userName);
        const timeAcc = grouped[userName][date];
        labels = Object.keys(timeAcc).sort();
        values = labels.map(k => timeAcc[k]);
      } else if (!userName && currentRole === 'lecturer') {
        // Show class average data
        console.log('Loading class average data');
        const selectedClass = classId || document.getElementById('classSelect').value;
        console.log('Using classId for filtering:', selectedClass);
        
        let studentsToInclude;
        
        if (selectedClass && enrollmentData.length > 0) {
          // Filter by enrolled students in the selected class
          const classEnrollments = enrollmentData.filter(e => e.class_id === selectedClass);
          studentsToInclude = classEnrollments.map(e => e.users?.name).filter(Boolean);
          console.log('Students in selected class:', studentsToInclude);
        } else if (enrollmentData.length > 0) {
          // All enrolled students
          studentsToInclude = [...new Set(enrollmentData.map(e => e.users?.name).filter(Boolean))];
          console.log('All enrolled students:', studentsToInclude);
        } else {
          // Fallback: all students with focus data
          studentsToInclude = [...new Set(fullDetailedData.map(e => e.user_name).filter(Boolean))];
          console.log('All students with focus data:', studentsToInclude);
        }
        
        const timeSlots = {};
        let studentsWithData = 0;
        
        studentsToInclude.forEach(student => {
          if (grouped[student] && grouped[student][date]) {
            console.log(`Processing data for student: ${student}`);
            studentsWithData++;
            const studentData = grouped[student][date];
            Object.keys(studentData).forEach(time => {
              if (!timeSlots[time]) {
                timeSlots[time] = [];
              }
              timeSlots[time].push(studentData[time]);
            });
          } else {
            console.log(`No data found for student: ${student} on date: ${date}`);
          }
        });
        
        console.log('Students with data:', studentsWithData);
        console.log('Time slots created:', Object.keys(timeSlots));
        
        if (Object.keys(timeSlots).length > 0) {
          labels = Object.keys(timeSlots).sort();
          values = labels.map(time => {
            const slotValues = timeSlots[time];
            return slotValues.reduce((sum, val) => sum + val, 0) / slotValues.length;
          });
          
          console.log('Final labels:', labels);
          console.log('Final values:', values);
        }
      }

      if (labels.length > 0) {
        console.log('Drawing chart with data points:', labels.length);
if (showComparison && currentRole === 'lecturer') {
  console.log('=== SHOWING ALL STUDENTS GROUPED ===');
  drawAllStudentsGroupedChart(grouped, date, userName, classId);
} else {
  drawLineChart(labels, values);
}
      } else {
        console.log('No data to display - showing no data message');
        showNoDataMessage();
      }
    })
    .catch(err => {
      console.error('Grouped history fetch failed:', err);
      showNoDataMessage();
    });
}

function drawAllStudentsGroupedChart(groupedData, date, selectedUser, classId) {
  console.log('=== DRAWING ALL STUDENTS GROUPED CHART ===');
  
  // Get students to include
  let studentsToInclude;
  if (classId && enrollmentData.length > 0) {
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    studentsToInclude = classEnrollments.map(e => e.users?.name).filter(Boolean);
  } else {
    studentsToInclude = Object.keys(groupedData).filter(student => 
      groupedData[student] && groupedData[student][date]
    );
  }
  
  console.log('Students with data:', studentsToInclude);
  
  const canvas = document.getElementById('focusLineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padL = 60, padR = 20, padT = 30, padB = 40;
  const cW = canvas.width, cH = canvas.height;
  const chartW = cW - padL - padR;
  const chartH = cH - padT - padB;
  const maxY = 100;
  const yStep = 20;

  chartData.points = [];

  // Grid lines and Y labels
  ctx.strokeStyle = '#ccc';
  ctx.fillStyle = '#444';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= maxY; i += yStep) {
    const y = padT + chartH - (i / maxY) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cW - padR, y);
    ctx.stroke();
    ctx.fillText(`${i}%`, padL - 10, y + 3);
  }

  // Get all time slots
  const allTimeSlots = new Set();
  studentsToInclude.forEach(student => {
    if (groupedData[student] && groupedData[student][date]) {
      Object.keys(groupedData[student][date]).forEach(time => allTimeSlots.add(time));
    }
  });
  const sortedTimes = Array.from(allTimeSlots).sort();
  
  if (sortedTimes.length === 0) {
    showNoDataMessage();
    return;
  }

  const xSpacing = sortedTimes.length > 1 ? chartW / (sortedTimes.length - 1) : 0;

  // Colors for different students
const colors = [
  '#1e88e5', // Blue
  '#e53e3e', // Red
  '#38a169', // Green
  '#d69e2e', // Orange
  '#805ad5', // Purple
  '#dd6b20', // Dark Orange
  '#0bc5ea', // Cyan
  '#ed64a6', // Pink
  '#f56565', // Light Red
  '#48bb78', // Light Green
  '#ed8936', // Amber
  '#9f7aea', // Light Purple
  '#4299e1', // Light Blue
  '#f093fb', // Light Pink
  '#38b2ac', // Teal
  '#68d391', // Mint Green
  '#fbb6ce', // Rose
  '#a78bfa', // Indigo
  '#fbd38d', // Yellow
  '#81e6d9'  // Aqua
];  
  // Process each student
  studentsToInclude.forEach((student, index) => {
    if (!groupedData[student] || !groupedData[student][date]) return;
    
    const studentData = groupedData[student][date];
    const studentColor = colors[index % colors.length];
    const isSelected = student === selectedUser;
    const lineWidth = isSelected ? 4 : 2;
    const pointSize = isSelected ? 5 : 3;
    
    // Draw line
    ctx.beginPath();
    let hasMoveTo = false;
    sortedTimes.forEach((time, i) => {
      if (studentData[time] !== undefined) {
        const x = padL + i * xSpacing;
        const y = padT + chartH - (studentData[time] / maxY) * chartH;
        
        if (!hasMoveTo) {
          ctx.moveTo(x, y);
          hasMoveTo = true;
        } else {
          ctx.lineTo(x, y);
        }
        
        // Store points for tooltip
        chartData.points.push({ 
          x, y, 
          label: time, 
          value: studentData[time], 
          student: student 
        });
      }
    });
    
    ctx.strokeStyle = studentColor;
    ctx.lineWidth = lineWidth;
    if (!isSelected) {
      ctx.globalAlpha = 0.7;
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    
    // Draw points
    sortedTimes.forEach((time, i) => {
      if (studentData[time] !== undefined) {
        const x = padL + i * xSpacing;
        const y = padT + chartH - (studentData[time] / maxY) * chartH;
        
        ctx.beginPath();
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        ctx.fillStyle = studentColor;
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });
  });
  
  // Draw X labels
  ctx.fillStyle = '#444';
  ctx.textAlign = 'center';
  ctx.font = '12px sans-serif';
  sortedTimes.forEach((time, i) => {
    const x = padL + i * xSpacing;
    ctx.fillText(time, x, cH - padB + 20);
  });

  // Update legend
  updateAllStudentsLegend(studentsToInclude, colors, selectedUser);
}

// ✅ Get Class Average Data
function getClassAverageForDate(dateStr) {
  console.log('=== CLASS AVERAGE DEBUG ===');
  console.log('Input dateStr:', dateStr);
  
  const classId = document.getElementById('classSelect').value;
  console.log('Class ID for average:', classId);
  
  // Get all data for the date
  const dayData = fullDetailedData.filter(d => d.timestamp.substring(0, 8) === dateStr);
  console.log('Day data found:', dayData.length);
  
  let filteredData;
  
  if (classId && enrollmentData.length > 0) {
    // Filter by enrolled students in the selected class
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    const classStudentNames = classEnrollments.map(e => e.users?.name).filter(Boolean);
    console.log('Class student names:', classStudentNames);
    
    filteredData = dayData.filter(d => classStudentNames.includes(d.user_name));
  } else {
    // Use all students with data
    filteredData = dayData;
  }
  
  console.log('Filtered data for class:', filteredData.length);
  
  const timeSlots = {};
  
  filteredData.forEach(entry => {
    const timeSlot = entry.timestamp.substring(9, 13);
    if (!timeSlots[timeSlot]) {
      timeSlots[timeSlot] = [];
    }
    timeSlots[timeSlot].push(entry.accuracy);
  });
  
  const averages = {};
  Object.keys(timeSlots).forEach(time => {
    const values = timeSlots[time];
    averages[time] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });
  
  console.log('Time slots created:', Object.keys(timeSlots));
  console.log('Final averages:', averages);
  return averages;
}

// ✅ Get Class Data for Date
function getClassDataForDate(groupedData, date) {
  const classId = document.getElementById('classSelect').value;
  let enrolledStudents;
  
  if (classId) {
    const classEnrollments = enrollmentData.filter(e => e.class_id === classId);
    enrolledStudents = classEnrollments.map(e => e.users?.name).filter(Boolean);
  } else {
    enrolledStudents = [...new Set(enrollmentData.map(e => e.users?.name).filter(Boolean))];
  }

  const timeSlots = {};
  
  enrolledStudents.forEach(student => {
    if (groupedData[student] && groupedData[student][date]) {
      const studentData = groupedData[student][date];
      Object.keys(studentData).forEach(time => {
        if (!timeSlots[time]) {
          timeSlots[time] = [];
        }
        timeSlots[time].push(studentData[time]);
      });
    }
  });
  
  const averages = {};
  Object.keys(timeSlots).forEach(time => {
    const values = timeSlots[time];
    averages[time] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });
  
  return averages;
}

// ✅ Draw Comparison Chart
function drawComparisonChart(labels, studentValues, classAverageData, studentName) {
  console.log('=== DRAWING COMPARISON CHART ===');
  console.log('Labels:', labels);
  console.log('Student values:', studentValues);
  console.log('Class average data:', classAverageData);
  console.log('Student name:', studentName);
  
  const canvas = document.getElementById('focusLineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padL = 60, padR = 20, padT = 30, padB = 40;
  const cW = canvas.width, cH = canvas.height;
  const chartW = cW - padL - padR;
  const chartH = cH - padT - padB;
  const maxY = 100;
  const yStep = 20;
  const xSpacing = labels.length > 1 ? chartW / (labels.length - 1) : 0;

  chartData.points = [];

  // Grid lines and Y labels
  ctx.strokeStyle = '#ccc';
  ctx.fillStyle = '#444';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= maxY; i += yStep) {
    const y = padT + chartH - (i / maxY) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cW - padR, y);
    ctx.stroke();
    ctx.fillText(`${i}%`, padL - 10, y + 3);
  }

  // X labels
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const x = padL + i * xSpacing;
    ctx.fillText(lbl, x, cH - padB + 20);
  });

  // Draw class average line FIRST (so it appears behind student line)
  const classAverageValues = labels.map(label => classAverageData[label] || 0);
  console.log('Class average values for chart:', classAverageValues);
  
  if (classAverageValues.some(v => v > 0)) {
    ctx.beginPath();
    classAverageValues.forEach((v, i) => {
      const x = padL + i * xSpacing;
      const y = padT + chartH - (v / maxY) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw class average points
    classAverageValues.forEach((v, i) => {
      const x = padL + i * xSpacing;
      const y = padT + chartH - (v / maxY) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    });
  }

  // Draw student line ON TOP
  ctx.beginPath();
  studentValues.forEach((v, i) => {
    const x = padL + i * xSpacing;
    const y = padT + chartH - (v / maxY) * chartH;
    chartData.points.push({ x, y, label: labels[i], value: v, student: studentName });
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#1e88e5';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw student points
  chartData.points.forEach(({ x, y }) => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e88e5';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Update legend
  updateComparisonLegend(studentName);
  
  console.log('=== COMPARISON CHART DRAWN ===');
}

// ✅ Update Comparison Legend
function updateComparisonLegend(studentName) {
  const legend = document.querySelector('.chart-legend');
  legend.innerHTML = `
    <div><span class="dot" style="background: #1e88e5;"></span>${studentName}</div>
    <div><span class="dot" style="background: #94a3b8;"></span>Class Average</div>
    <div style="margin-top: 8px; font-size: 11px;">
      <div><span class="dot green"></span>80-100%: Focused</div>
      <div><span class="dot yellow"></span>50-79%: Moderate</div>
      <div><span class="dot red"></span>Below 50%: Distracted</div>
    </div>
  `;
}

// ✅ Draw Line Chart
function drawLineChart(labels, values) {
  const canvas = document.getElementById('focusLineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padL = 60, padR = 20, padT = 30, padB = 40;
  const cW = canvas.width, cH = canvas.height;
  const chartW = cW - padL - padR;
  const chartH = cH - padT - padB;
  const maxY = 100;
  const yStep = 20;
  const xSpacing = labels.length > 1 ? chartW / (labels.length - 1) : 0;

  chartData.points = [];

  // Grid lines and Y labels
  ctx.strokeStyle = '#ccc';
  ctx.fillStyle = '#444';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= maxY; i += yStep) {
    const y = padT + chartH - (i / maxY) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cW - padR, y);
    ctx.stroke();
    ctx.fillText(`${i}%`, padL - 10, y + 3);
  }

  // X labels
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const x = padL + i * xSpacing;
    ctx.fillText(lbl, x, cH - padB + 20);
  });

  // Line with gradient colors based on focus level
  values.forEach((v, i) => {
    if (i === values.length - 1) return;
    
    const x1 = padL + i * xSpacing;
    const y1 = padT + chartH - (v / maxY) * chartH;
    const x2 = padL + (i + 1) * xSpacing;
    const y2 = padT + chartH - (values[i + 1] / maxY) * chartH;
    
    // Color based on average of two points
    const avgValue = (v + values[i + 1]) / 2;
    let color = '#ef4444'; // Red for low focus
    if (avgValue >= 80) color = '#22c55e'; // Green for high focus
    else if (avgValue >= 50) color = '#f59e0b'; // Yellow for moderate focus
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // Points
  values.forEach((v, i) => {
    const x = padL + i * xSpacing;
    const y = padT + chartH - (v / maxY) * chartH;
    chartData.points.push({ x, y, label: labels[i], value: v });
    
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    
    // Color point based on focus level
    let color = '#ef4444';
    if (v >= 80) color = '#22c55e';
    else if (v >= 50) color = '#f59e0b';
    
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Reset legend to default
  resetDefaultLegend();
}

// ✅ Reset Default Legend
function resetDefaultLegend() {
  const legend = document.querySelector('.chart-legend');
  legend.innerHTML = `
    <div><span class="dot green"></span>80-100%: Focused</div>
    <div><span class="dot yellow"></span>50-79%: Moderate Focus</div>
    <div><span class="dot red"></span>Below 50%: Distracted</div>
  `;
}

// Update Summary Table
function updateSummaryTable(userName, date, classId = null) {
  const table = document.getElementById('summaryTable').getElementsByTagName('tbody')[0];
  const header = document.getElementById('summaryHeader');
  table.innerHTML = '';
  
  if (!userName && currentRole === 'student') {
    userName = currentUser.name;
  }
  
  // Update header based on selection
const selectedClass = classId || document.getElementById('classSelect')?.value;
  let headerText = '📊 Session Summary';
  
  if (userName) {
    headerText += ` - ${userName}`;
  } else if (selectedClass && currentRole === 'lecturer') {
    const selectedClassName = classData.find(c => c.id === selectedClass)?.name;
    headerText += ` - ${selectedClassName || 'Selected Class'}`;
  } else if (currentRole === 'lecturer') {
    headerText += ' - All Students';
  }
  
  header.textContent = headerText;
  
  if (!date) return;
  
  const dateStr = date.replace(/-/g, '');
  let dayData = fullDetailedData.filter(d => d.timestamp.slice(0, 8) === dateStr);
  
// Apply class filter
if (selectedClass && currentRole === 'lecturer') {
  const classEnrollments = enrollmentData.filter(e => e.class_id === selectedClass);
  const classStudentIds = classEnrollments.map(e => e.user_id);
  
  dayData = dayData.filter(d => {
    const userEnrollment = enrollmentData.find(e => e.users?.name === d.user_name);
    return userEnrollment && classStudentIds.includes(userEnrollment.user_id);
  });
}
  
  if (userName) {
    dayData = dayData.filter(d => d.user_name === userName);
  }
  
  if (dayData.length === 0) {
    const row = table.insertRow();
    row.innerHTML = '<td colspan="4">No data available for selected date</td>';
    return;
  }
  
  // Group by hour
  const hourlyData = {};
  dayData.forEach(entry => {
    const hour = entry.timestamp.slice(9, 11);
    if (!hourlyData[hour]) {
      hourlyData[hour] = [];
    }
    hourlyData[hour].push(entry.accuracy);
  });
  
  Object.keys(hourlyData).sort().forEach(hour => {
    const values = hourlyData[hour];
    const avgFocus = values.reduce((sum, val) => sum + val, 0) / values.length;
    const duration = values.length * 3;
    
    let status = 'Distracted';
    if (avgFocus >= 80) status = 'Focused';
    else if (avgFocus >= 50) status = 'Moderate';
    
    const row = table.insertRow();
    row.innerHTML = `
      <td>${hour}:00 - ${hour}:59</td>
      <td>${Math.round(avgFocus)}%</td>
      <td>${Math.floor(duration / 60)}m ${duration % 60}s</td>
      <td><span class="focus-status ${status.toLowerCase()}">${status}</span></td>
    `;
  });
}

// ✅ Format Date Helper
function formatDate(dateStr) {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

// ✅ Setup Hover Tooltip
function setupHoverTooltip() {
  const canvas = document.getElementById('focusLineChart');
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  document.body.appendChild(tip);

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let hover = false;
    
    for (const pt of chartData.points) {
      if (Math.hypot(pt.x - mx, pt.y - my) < 8) {
        const content = pt.student ? 
          `<strong>${pt.student}</strong><br>${pt.label}: ${pt.value}%` :
          `<strong>${pt.label}</strong><br>Focus: ${pt.value}%`;
        tip.innerHTML = content;
        tip.style.left = `${e.pageX + 10}px`;
        tip.style.top = `${e.pageY - 35}px`;
        tip.style.display = 'block';
        hover = true;
        break;
      }
    }
    if (!hover) tip.style.display = 'none';
  });

  canvas.addEventListener('mouseleave', () => tip.style.display = 'none');
}

// ✅ Show No Data Message
function showNoDataMessage() {
  const canvas = document.getElementById('focusLineChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('No focus data available for selected filters.', canvas.width / 2, canvas.height / 2);
  
  // Clear summary table
  const table = document.getElementById('summaryTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '<tr><td colspan="4">No data available</td></tr>';
}

// ✅ Show Error Message
function showError(message) {
  const container = document.querySelector('.chart-container');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  container.insertBefore(errorDiv, container.firstChild);
}

// ✅ Initialize App on Load
document.addEventListener('DOMContentLoaded', initializeApp);