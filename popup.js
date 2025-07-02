

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
    chrome.action.setBadgeText({ text: "" });

  const authContainer = document.getElementById("authContainer");
  const studentApp = document.getElementById("studentApp");
  const lecturerApp = document.getElementById("lecturerApp");
  const studentGreeting = document.getElementById("studentGreeting");
  const lecturerGreeting = document.getElementById("lecturerGreeting");

  // Auth Elements
  const studentTab = document.getElementById("studentTab");
  const lecturerTab = document.getElementById("lecturerTab");
  const signupForm = document.getElementById("signupForm");
  const signinForm = document.getElementById("signinForm");
  const roleInput = document.getElementById("role");
  const matricGroup = document.getElementById("matricGroup");
  const staffGroup = document.getElementById("staffGroup");
  const message = document.getElementById("message");
  const switchToSignIn = document.getElementById("switchToSignIn");
  const switchToSignUp = document.getElementById("switchToSignUp");
  const toSignin = document.getElementById("toSignin");
  const toSignup = document.getElementById("toSignup");
  const roleTabs = document.getElementById("roleTabs");
  const studentLogoutBtn = document.getElementById("studentLogoutBtn");
  const lecturerLogoutBtn = document.getElementById("lecturerLogoutBtn");

  // Student Elements
  const classPinInput = document.getElementById("classPinInput");
  const joinClassBtn = document.getElementById("joinClassBtn");
  const statusCard = document.getElementById("statusCard");
  const statusDot = document.getElementById("statusDot");
  const status = document.getElementById("status");
  const timerDisplay = document.querySelector(".timer-text");
  const activeClassInfo = document.getElementById("activeClassInfo");
  const activeClassName = document.getElementById("activeClassName");
  const classStatus = document.getElementById("classStatus");
  const startFocusBtn = document.getElementById("startFocusBtn");
  const stopFocusBtn = document.getElementById("stopFocusBtn");
  const studentClassesList = document.getElementById("studentClassesList");
  const uploadStatus = document.getElementById("uploadStatus");

  // Lecturer Elements
  const createClassBtn = document.getElementById("createClassBtn");
  const createClassForm = document.getElementById("createClassForm");
  const className = document.getElementById("className");
  const classSchedule = document.getElementById("classSchedule");
  const classPin = document.getElementById("classPin");
  const generatePinBtn = document.getElementById("generatePinBtn");
  const saveClassBtn = document.getElementById("saveClassBtn");
  const cancelClassBtn = document.getElementById("cancelClassBtn");
  const activeSession = document.getElementById("activeSession");
  const activeSessionClassName = document.getElementById("activeSessionClassName");
  const stopSessionBtn = document.getElementById("stopSessionBtn");
  const activeStudents = document.getElementById("activeStudents");
  const focusedStudents = document.getElementById("focusedStudents");
  const classesList = document.getElementById("classesList");

  // Global State
  let currentUser = null;
  let currentClasses = [];
  let activeClassSession = null;
  let studentActiveClass = null;
  let isCapturing = false;
  let captureInterval = null;
  let timerInterval = null;
  let remainingMs = 0;
  let sessionCheckInterval = null;

  const CAPTURE_INTERVAL_MS = 3000; // 3 seconds
  const SESSION_CHECK_INTERVAL = 5000; // 5 seconds
    schedulePopupReminder();


  // ==================== UTILITY FUNCTIONS ====================

// Add with your other button listeners
const testBackgroundBtn = document.getElementById("testBackground");
if (testBackgroundBtn) {
  testBackgroundBtn.addEventListener('click', testBackgroundCommunication);
}

function testBackgroundCommunication() {
  console.log('Testing background communication...');
  
  // Send a simple ping first
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Background not responding:', chrome.runtime.lastError);
      console.log('Extension ID:', chrome.runtime.id);
      return;
    }
    
    console.log('Background ping response:', response);
    
    // If ping works, try student focus
    chrome.runtime.sendMessage({
      action: 'startStudentFocus',
      sessionData: {
        startTime: Date.now(),
        durationMinutes: 60,
        currentUser: currentUser
      }
    }, (response2) => {
      if (chrome.runtime.lastError) {
        console.error('Student focus message failed:', chrome.runtime.lastError);
      } else {
        console.log('Student focus response:', response2);
      }
    });
  });
}

  function showMessage(text, type) {
    if (message) {
      message.textContent = text;
      message.className = `message-area ${type}`;
      message.style.display = 'block';
      setTimeout(() => {
        message.style.display = 'none';
      }, 3000);
    }
  }

  function generateClassPin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function updateTimerDisplay(ms) {
    const total = Math.floor(ms / 1000);
    const min = String(Math.floor(total / 60)).padStart(2, "0");
    const sec = String(total % 60).padStart(2, "0");
    if (timerDisplay) {
      timerDisplay.textContent = `${min}:${sec}`;
    }
  }

  function setStudentStatus(statusText, isActive = false) {
    if (status) status.textContent = statusText;
    if (statusDot) {
      statusDot.className = isActive ? "status-dot active" : "status-dot";
    }
  }

  // ==================== AUTH FUNCTIONS ====================

// Initial auth check
chrome.storage.local.get("user", (result) => {
  console.log('Auth check - stored user:', result.user); // Debug log
  const user = result.user;
  if (user && user.name) {
    // Ensure databaseId is set for existing users
    if (!user.databaseId && user.id) {
      user.databaseId = user.id;
      chrome.storage.local.set({ user });
    }
    console.log('User found, showing main app for:', user.role, 'with databaseId:', user.databaseId); // Debug log
    showMainApp(user);
  } else {
    console.log('No user found, showing auth container'); // Debug log
    authContainer.style.display = "block";
    studentApp.style.display = "none";
    lecturerApp.style.display = "none";
  }
});

  function showMainApp(user) {
    currentUser = user;
    authContainer.style.display = "none";
    
    if (user.role === 'lecturer') {
      showLecturerApp(user);
    } else {
      showStudentApp(user);
    }
  }

function showStudentApp(user) {
  studentApp.style.display = "block";
  lecturerApp.style.display = "none";
  if (studentGreeting) {
    studentGreeting.textContent = `🎯 Welcome, ${user.name.split(' ')[0]}`;
  }
  
  setupStudentEventListeners();
  loadStudentClasses();
  startSessionMonitoring();
  
  // Restore focus session if it was active
  restoreFocusSession();
}

function showLecturerApp(user) {
  console.log('showLecturerApp called for user:', user); // Debug log
  lecturerApp.style.display = "block";
  studentApp.style.display = "none";
  if (lecturerGreeting) {
    lecturerGreeting.textContent = `👨‍🏫 Welcome, ${user.name.split(' ')[0]}`;
  }
  
  setupLecturerEventListeners();
  
  // Use the new function with fallback
  setTimeout(() => {
    console.log('Loading lecturer classes with fallback...'); // Debug log
    loadLecturerClassesWithFallback();
  }, 100);
  
  restoreLecturerSession();
}

  // ==================== AUTH EVENT LISTENERS ====================

  // Tab switching
  if (studentTab) {
    studentTab.onclick = () => {
      studentTab.classList.add("active");
      lecturerTab.classList.remove("active");
      roleInput.value = "student";
      matricGroup.style.display = "block";
      staffGroup.style.display = "none";
      document.getElementById("matric").setAttribute("required", "required");
      document.getElementById("staff").removeAttribute("required");
    };
  }

  if (lecturerTab) {
    lecturerTab.onclick = () => {
      lecturerTab.classList.add("active");
      studentTab.classList.remove("active");
      roleInput.value = "lecturer";
      matricGroup.style.display = "none";
      staffGroup.style.display = "block";
      document.getElementById("staff").setAttribute("required", "required");
      document.getElementById("matric").removeAttribute("required");
    };
  }

  // Toggle between sign up and sign in
  if (switchToSignIn) {
    switchToSignIn.onclick = (e) => {
      e.preventDefault();
      signupForm.style.display = "none";
      signinForm.style.display = "block";
      toSignin.style.display = "none";
      toSignup.style.display = "block";
    };
  }

  if (switchToSignUp) {
    switchToSignUp.onclick = (e) => {
      e.preventDefault();
      signupForm.style.display = "block";
      signinForm.style.display = "none";
      toSignin.style.display = "block";
      toSignup.style.display = "none";
    };
  }

  // Sign Up
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      const payload = {
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        matric_no: formData.get("matric_no") || null,
        staff_id: formData.get("staff_id") || null,
      };

      try {
        const res = await fetch("https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
          },
          body: JSON.stringify(payload),
        });

// In signupForm.onsubmit
const result = await res.json();
if (res.ok && result && result.length) {
  const user = result[0];
// Ensure user has database ID
user.databaseId = user.id;
chrome.storage.local.clear(() => {
  chrome.storage.local.set({ user }, () => {
    showMessage("✅ Account created successfully!", "success");
    showMainApp(user);
  });
});
} else {
          showMessage("❌ Error creating account", "error");
        }
      } catch (err) {
        showMessage("❌ Network error: " + err.message, "error");
      }
    };
  }

  // Sign In
// Sign In
if (signinForm) {
  signinForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("signinEmail").value;

    try {
      const res = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/users?email=eq.${email}&select=*`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });

      const users = await res.json();
      if (res.ok && users && users.length > 0) {
        const user = users[0];
        // Ensure user has database ID
        user.databaseId = user.id;
        chrome.storage.local.clear(() => {
          chrome.storage.local.set({ user }, () => {
            showMessage("✅ Welcome back!", "success");
            showMainApp(user);
          });
        });
      } else {
        showMessage("❌ User not found. Please check your email.", "error");
      }
    } catch (err) {
      showMessage("❌ Network error: " + err.message, "error");
    }
  };
}

  // Logout handlers
  if (studentLogoutBtn) {
    studentLogoutBtn.addEventListener("click", handleLogout);
  }

  if (lecturerLogoutBtn) {
    lecturerLogoutBtn.addEventListener("click", handleLogout);
  }

function handleLogout() {
  if (!confirm("Are you sure you want to log out?")) return;
  
  // Stop any active sessions
  stopFocusSession();
  if (activeClassSession) { // Add this block
    stopClassSession();
  }
  clearInterval(sessionCheckInterval);
  
  chrome.storage.local.clear(() => {
    currentUser = null;
    activeClassSession = null; // Add this line
    studentApp.style.display = "none";
    lecturerApp.style.display = "none";
    authContainer.style.display = "block";
    signupForm.style.display = "none";
    signinForm.style.display = "block";
    toSignin.style.display = "none";
    toSignup.style.display = "block";
  });
}

  // ==================== STUDENT FUNCTIONS ====================

  function setupStudentEventListeners() {
    // Join class by PIN
    if (joinClassBtn) {
      joinClassBtn.addEventListener('click', joinClassByPin);
    }
    
    if (classPinInput) {
      classPinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          joinClassByPin();
        }
      });
      
      // Format PIN input
      classPinInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
      });
    }

    // Focus control buttons
    if (startFocusBtn) {
      startFocusBtn.addEventListener('click', startFocusSession);
    }
  }

  async function joinClassByPin() {
    const pin = classPinInput.value.trim();
    
    if (!pin || pin.length !== 6) {
      showMessage("Please enter a valid 6-digit PIN", "error");
      return;
    }

    try {
      // Find class with this PIN
      const classRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes?class_pin=eq.${pin}&select=*`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });
      
      const classes = await classRes.json();
      if (!classes || classes.length === 0) {
        showMessage("Class not found. Please check the PIN.", "error");
        return;
      }
      
      const targetClass = classes[0];
      
      // Get user ID
// Use stored user ID
if (!currentUser || !currentUser.databaseId) {
  showMessage("User session invalid. Please log out and back in.", "error");
  return;
}

const userId = currentUser.databaseId;
      
      // Check if already enrolled
      const enrollmentRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments?user_id=eq.${userId}&class_id=eq.${targetClass.id}&select=*`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });
      
      const existingEnrollment = await enrollmentRes.json();
      if (existingEnrollment && existingEnrollment.length > 0) {
        showMessage("You're already enrolled in this class!", "error");
        classPinInput.value = '';
        loadStudentClasses();
        return;
      }
      
      // Enroll student
      const enrollRes = await fetch("https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Prefer": "return=representation",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        },
        body: JSON.stringify({
          user_id: userId,
          class_id: targetClass.id
        }),
      });
      
      if (enrollRes.ok) {
        showMessage(`✅ Successfully joined ${targetClass.name}!`, "success");
        classPinInput.value = '';
        loadStudentClasses();
      } else {
        showMessage("❌ Error joining class", "error");
      }
      
    } catch (err) {
      showMessage("❌ Network error: " + err.message, "error");
    }
  }

async function loadStudentClasses() {
  try {
    // Use stored user ID instead of lookup
    if (!currentUser || !currentUser.databaseId) {
      studentClassesList.innerHTML = '<div class="error">User session invalid</div>';
      return;
    }
    
    const userId = currentUser.databaseId;
      
      // Get enrollments with class details
      const res = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments?user_id=eq.${userId}&select=*,classes(*)`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });

      const enrollments = await res.json();
      displayStudentClasses(enrollments || []);
    } catch (err) {
      studentClassesList.innerHTML = '<div class="error">Error loading classes</div>';
    }
  }

  function displayStudentClasses(enrollments) {
    if (enrollments.length === 0) {
      studentClassesList.innerHTML = '<div class="no-classes">No classes joined yet. Enter a PIN above to join a class.</div>';
      return;
    }
    
    studentClassesList.innerHTML = enrollments.map(enrollment => {
      const cls = enrollment.classes;
      return `
        <div class="class-item">
          <div class="class-info">
            <div class="class-name">${cls.name}</div>
            <div class="class-time">${cls.time_slot || cls.class_schedule || 'No schedule set'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

function startSessionMonitoring() {
  // Check for active sessions every 5 seconds
  sessionCheckInterval = setInterval(checkForActiveSession, SESSION_CHECK_INTERVAL);
  checkForActiveSession(); // Check immediately
  
  // **FIXED**: Listen for session end signals - but don't interfere with normal flow
  if (!window.storageListenerAdded) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.sessionEndSignal) {
        console.log('Session end signal detected, checking immediately');
        // Small delay to ensure database is updated
        setTimeout(checkForActiveSession, 500);
      }
    });
    window.storageListenerAdded = true;
  }
}

async function checkForActiveSession() {
  console.log('=== checkForActiveSession called ===');
  
  if (!currentUser || currentUser.role !== 'student') {
    console.log('Not a student or no user - exiting');
    return;
  }
  
  try {
    if (!currentUser || !currentUser.databaseId) {
      console.log('No databaseId - exiting');
      return;
    }
    
    const userId = currentUser.databaseId;
    console.log('Checking for user ID:', userId);
    
    // **SIMPLIFIED**: First, let's just check ALL active sessions
    const allSessionsUrl = `https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions?is_active=eq.true&select=*,classes(name)`;
    console.log('Checking ALL active sessions:', allSessionsUrl);
    
    const allSessionsRes = await fetch(allSessionsUrl, {
      headers: {
        "Accept": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        "Cache-Control": "no-cache"
      }
    });
    
    const allSessions = await allSessionsRes.json();
    console.log('ALL active sessions in database:', allSessions);
    
    // Now get user's enrolled classes
    const classIds = await getUserClassIds(userId);
    console.log('User class IDs:', classIds);
    
    if (!allSessions || allSessions.length === 0) {
      console.log('No active sessions in entire database');
      // Hide UI and stop focus
      if (activeClassInfo) {
        activeClassInfo.style.display = 'none';
      }
      const wasActive = studentActiveClass !== null;
      studentActiveClass = null;
      if (isCapturing && wasActive) {
        stopFocusSession();
        showMessage("📚 Session ended - focus tracking stopped", "info");
      }
      return;
    }
    
    // Check if any active session matches user's classes
    const userClassArray = classIds.split(',').map(id => id.replace(/"/g, ''));
    console.log('User class array:', userClassArray);
    
    const matchingSessions = allSessions.filter(session => 
      userClassArray.includes(session.class_id)
    );
    console.log('Matching sessions for user:', matchingSessions);
    
    if (matchingSessions.length > 0) {
      console.log('=== ACTIVE SESSION FOUND ===');
      const session = matchingSessions[0];
      console.log('Session details:', session);
      
      // Get class details
      const classRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes?id=eq.${session.class_id}&select=session_duration`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });
      
      const classData = await classRes.json();
      const sessionDurationMinutes = (classData && classData[0] && classData[0].session_duration) ? classData[0].session_duration : 60;
      
      const activeSession = {
        sessionId: session.id,
        classId: session.class_id,
        className: session.classes.name,
        startTime: session.start_time,
        durationMinutes: sessionDurationMinutes
      };
      
      console.log('Active session object:', activeSession);
      
      // Show active class info
      if (activeClassInfo) {
        console.log('Updating UI - showing active class info');
        activeClassInfo.style.display = 'block';
        if (activeClassName) {
          activeClassName.textContent = activeSession.className;
        }
        if (classStatus) {
          classStatus.textContent = 'Session Active';
        }
        
        // Hide start button
        if (startFocusBtn) {
          startFocusBtn.style.display = 'none';
        }
        
        if (!isCapturing) {
          console.log('Auto-starting focus session in 1 second...');
          setTimeout(() => {
            if (!isCapturing) {
              console.log('=== AUTO-STARTING FOCUS SESSION ===');
              startFocusSession();
              showMessage(`🎯 Auto-started focus tracking for ${activeSession.className}`, "success");
            }
          }, 1000);
        } else {
          console.log('Already capturing, not auto-starting');
        }
      } else {
        console.log('ERROR: activeClassInfo element not found!');
      }
      
      studentActiveClass = activeSession;
    } else {
  console.log('=== NO MATCHING SESSIONS FOR USER ===');
  
  // No matching sessions
  if (activeClassInfo) {
    activeClassInfo.style.display = 'none';
  }
  
  const wasActive = studentActiveClass !== null;
  studentActiveClass = null;
  
  // **IMPROVED**: Always stop focus session when no active class, regardless of wasActive
  if (isCapturing) {
    console.log('No active sessions found, stopping focus session');
    stopFocusSession();
    showMessage("📚 Session ended - focus tracking stopped", "info");
  }
}
    
  } catch (err) {
    console.error('Error checking for active session:', err);
  }
  
  console.log('=== checkForActiveSession complete ===');
}
async function getUserClassIds(userId) {
  try {
    const enrollmentRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments?user_id=eq.${userId}&select=class_id`, {
      headers: {
        "Accept": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
      }
    });
    
    const enrollments = await enrollmentRes.json();
    if (!enrollments || enrollments.length === 0) return '';
    
    return enrollments.map(e => `"${e.class_id}"`).join(',');
  } catch (err) {
    console.error('Error getting user class IDs:', err);
    return '';
  }
}

function startFocusSession() {
  console.log('startFocusSession called');
  if (isCapturing || !studentActiveClass) {
    console.log('Already capturing or no active class, exiting');
    return;
  }

  isCapturing = true;
  
  const sessionStartTime = Date.now();
  const durationMinutes = studentActiveClass.durationMinutes || 60;
  const sessionDuration = durationMinutes * 60 * 1000;
  
  chrome.storage.local.set({
    focusSessionStartTime: sessionStartTime,
    focusSessionDuration: sessionDuration,
    focusSessionActive: true
  });
  
  remainingMs = sessionDuration;
  updateTimerDisplay(remainingMs);
  setStudentStatus("Capturing Focus...", true);

  // Clear any existing timer before starting new one
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Start timer UI - ONLY ONE TIMER
  timerInterval = setInterval(() => {
    remainingMs -= 1000;
    updateTimerDisplay(remainingMs);
    
    if (remainingMs <= 0) {
      stopFocusSession();
    }
  }, 1000);

  // Try background capture first, fallback to popup capture
  chrome.runtime.sendMessage({
    action: 'startSession',
    sessionData: {
      startTime: new Date(sessionStartTime).toISOString(),
      endTime: new Date(sessionStartTime + sessionDuration).toISOString(),
      currentUser: currentUser
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Background failed, using popup capture');
      captureAndUpload();
      captureInterval = setInterval(captureAndUpload, 3000);
    }
  });

  startFocusBtn.style.display = 'none';
}

function schedulePopupReminder() {
  // This function is now handled by background script
  // Just clear any existing reminder when popup is opened
  chrome.storage.local.get(['nextReminderTime'], (result) => {
    if (result.nextReminderTime && Date.now() >= result.nextReminderTime) {
      // Clear the reminder since popup is now open
      chrome.action.setBadgeText({ text: "" });
      chrome.storage.local.remove(['nextReminderTime']);
    }
  });
}

function startPopupCapture() {
  console.log('Using popup fallback');
  captureAndUpload();
  captureInterval = setInterval(captureAndUpload, 3000);
}

function startPopupCapture() {
  console.log('Starting popup capture mode');
  captureAndUpload();
  captureInterval = setInterval(() => {
    console.log('Popup interval capture');
    captureAndUpload();
  }, 3000);
  startTimer();
}

function startTimer() {
  timerInterval = setInterval(() => {
    remainingMs -= 1000;
    updateTimerDisplay(remainingMs);
    if (remainingMs <= 0) {
      stopFocusSession();
    }
  }, 1000);
  
  startFocusBtn.style.display = 'none';
  if (uploadStatus) uploadStatus.textContent = "";
}

function startFocusSessionUI() {
  // Just handle UI updates
  isCapturing = true;
  const sessionStartTime = Date.now();
  const durationMinutes = studentActiveClass.durationMinutes || 60;
  const sessionDuration = durationMinutes * 60 * 1000;
  
  chrome.storage.local.set({
    focusSessionStartTime: sessionStartTime,
    focusSessionDuration: sessionDuration,
    focusSessionActive: true
  });
  
  remainingMs = sessionDuration;
  updateTimerDisplay(remainingMs);
  setStudentStatus("Capturing Focus...", true);

  timerInterval = setInterval(() => {
    remainingMs -= 1000;
    updateTimerDisplay(remainingMs);
    if (remainingMs <= 0) {
      stopFocusSession();
    }
  }, 1000);

  startFocusBtn.style.display = 'none';    
  if (uploadStatus) uploadStatus.textContent = "";
}

function startFocusSessionFallback() {
  console.log('Using fallback capture in popup');
  // Keep the old popup capture as backup
  startFocusSessionUI();
  captureAndUpload();
  captureInterval = setInterval(captureAndUpload, 3000);
}

function stopFocusSession() {
  console.log('=== STOPPING FOCUS SESSION ===');
  console.log('isCapturing before stop:', isCapturing);
  console.log('timerInterval before stop:', timerInterval);
  console.log('captureInterval before stop:', captureInterval);
  
  // Clear storage
  chrome.storage.local.remove(['focusSessionStartTime', 'focusSessionDuration', 'focusSessionActive']);
  
  // Stop both background and popup capture
  chrome.runtime.sendMessage({ action: 'stopSession' });
  
  // **FIX**: Clear intervals properly
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log('Cleared captureInterval');
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    console.log('Cleared timerInterval');
  }
  
  // Reset state
  isCapturing = false;
  remainingMs = 0;
  
  // Update UI
  setStudentStatus("Ready to Focus", false);
  if (timerDisplay) {
    timerDisplay.textContent = "00:00";
    console.log('Reset timer display');
  }
  
  // Show start button if there's still an active class
  if (studentActiveClass && startFocusBtn) {
    startFocusBtn.style.display = 'block';
    console.log('Showed start focus button');
  }
  
  console.log('=== FOCUS SESSION STOPPED ===');
  console.log('isCapturing after stop:', isCapturing);
  console.log('timerInterval after stop:', timerInterval);
}

function restoreFocusSession() {
  console.log('restoreFocusSession called');
  chrome.storage.local.get(['focusSessionStartTime', 'focusSessionDuration', 'focusSessionActive'], (result) => {
    console.log('Stored session data:', result);
    
    if (result.focusSessionActive && result.focusSessionStartTime && result.focusSessionDuration) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - result.focusSessionStartTime;
      remainingMs = result.focusSessionDuration - elapsedTime;
      
      console.log('Session time remaining:', remainingMs);
      
      if (remainingMs > 0) {
        isCapturing = true;
        updateTimerDisplay(remainingMs);
        setStudentStatus("Capturing Focus...", true);
        
        // *** Try to start background capture first ***
        console.log('Attempting to restore background capture...');
        const sessionStartTime = result.focusSessionStartTime;
        const endTime = new Date(sessionStartTime + result.focusSessionDuration).toISOString();
        
        chrome.runtime.sendMessage({
          action: 'startSession',  // Use existing working action
          sessionData: {
            startTime: new Date(sessionStartTime).toISOString(),
            endTime: endTime,
            currentUser: currentUser
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Background not available, using popup capture');
            startPopupCaptureRestore();
          } else {
            console.log('Background capture restored:', response);
            // Just run timer, background handles capture
            startTimerOnly();
          }
        });
        
        if (studentActiveClass) {
          startFocusBtn.style.display = 'none';
        }
        
      } else {
        console.log('Session expired, cleaning up');
        chrome.storage.local.remove(['focusSessionStartTime', 'focusSessionDuration', 'focusSessionActive']);
        stopFocusSession();
      }
    } else {
      console.log('No active session to restore');
    }
  });
}

function startPopupCaptureRestore() {
  console.log('Restarting popup capture...');
  captureAndUpload();
  captureInterval = setInterval(() => {
    console.log('Restored interval capture');
    captureAndUpload();
  }, 3000);
  startTimerOnly();
}

function startTimerOnly() {
  timerInterval = setInterval(() => {
    remainingMs -= 1000;
    updateTimerDisplay(remainingMs);
    if (remainingMs <= 0) {
      stopFocusSession();
    }
  }, 1000);
  console.log('Timer restored');
}

function restoreLecturerSession() {
  // First check local storage
  chrome.storage.local.get(['activeClassSession'], async (result) => {
    let sessionToRestore = result.activeClassSession;
    
    // If no local session, check database for active sessions by this lecturer
    if (!sessionToRestore) {
      try {
        // Use stored user ID instead of lookup
        if (!currentUser || !currentUser.databaseId) {
          return;
        }
        
        const lecturerUUID = currentUser.databaseId;
        
        // Check for active sessions
        const sessionRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions?lecturer_id=eq.${lecturerUUID}&is_active=eq.true&select=*,classes(name)`, {
          headers: {
            "Accept": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
          }
        });
        
        const activeSessions = await sessionRes.json();
        if (activeSessions && activeSessions.length > 0) {
          const session = activeSessions[0];
          sessionToRestore = {
            sessionId: session.id,
            classId: session.class_id,
            className: session.classes.name,
            startTime: session.start_time
          };
        }
      } catch (err) {
        console.error('Error checking for active sessions:', err);
      }
    }
    
    // Restore the session if found
    if (sessionToRestore) {
      activeClassSession = sessionToRestore;
      
      // Update UI
      if (activeSession) {
        activeSession.style.display = 'block';
        if (activeSessionClassName) {
          activeSessionClassName.textContent = sessionToRestore.className;
        }
      }
      
      // Disable start buttons
      document.querySelectorAll('.start-session-btn').forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<span class="button-icon">⏸</span> Session Active';
      });
      
      // Start monitoring
      startLecturerSessionMonitoring();
      
      console.log('Restored lecturer session:', sessionToRestore);
    }
  });
}

function captureAndUpload() {
  console.log('captureAndUpload called');
  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    if (!dataUrl) {
      console.log('No dataUrl returned');
      return;
    }
    
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("screenshot", blob, "screenshot.png");
      formData.append("user_id", currentUser?.databaseId || currentUser?.id || 'anonymous');

      const response = await fetch("https://chrome-focus-plugin.onrender.com/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      console.log('Focus capture result:', result);
      
      if (uploadStatus) {
        uploadStatus.textContent = `✅ Status: ${result.status}`;
        uploadStatus.className = "upload-status success";
      }
      
      setStudentStatus(`Focus: ${result.status}`, result.status === 'Focused');
      
    } catch (err) {
      console.error('Focus capture error:', err);
      if (uploadStatus) {
        uploadStatus.textContent = "❌ Upload failed";
        uploadStatus.className = "upload-status error";
      }
      setStudentStatus("Connection Error", false);
    }
  });
}

  // ==================== LECTURER FUNCTIONS ====================

  function setupLecturerEventListeners() {
    // Create class button
    if (createClassBtn) {
      createClassBtn.addEventListener('click', () => {
        const isVisible = createClassForm.style.display === 'block';
        createClassForm.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && classPin) {
          classPin.value = generateClassPin();
        }
      });
    }

    // Generate PIN button
    if (generatePinBtn) {
      generatePinBtn.addEventListener('click', () => {
        if (classPin) {
          classPin.value = generateClassPin();
        }
      });
    }

    // Save class button
    if (saveClassBtn) {
      saveClassBtn.addEventListener('click', createNewClass);
    }

    // Cancel class button
    if (cancelClassBtn) {
      cancelClassBtn.addEventListener('click', () => {
        createClassForm.style.display = 'none';
        clearClassForm();
      });
    }

    // Stop session button
    if (stopSessionBtn) {
      stopSessionBtn.addEventListener('click', stopClassSession);
    }
  }

  function clearClassForm() {
    if (className) className.value = '';
    if (classSchedule) classSchedule.value = '';
    if (classPin) classPin.value = '';
      document.getElementById('classDuration').value = '60'; // Reset to 1 hour

  }

async function createNewClass() {
 const name = className.value.trim();
 const schedule = classSchedule.value.trim();
 const pin = classPin.value;
 
 if (!name) {
   showMessage("Please enter a class name", "error");
   return;
 }
 
 if (!pin) {
   showMessage("Please generate a class PIN", "error");
   return;
 }

 try {
   // Use stored user ID
   if (!currentUser || !currentUser.databaseId) {
     showMessage("User session invalid. Please log out and back in.", "error");
     return;
   }

   const lecturerUUID = currentUser.databaseId;
   console.log('Creating class for lecturer UUID:', lecturerUUID);
   
   // Check if PIN already exists
   const pinCheckRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes?class_pin=eq.${pin}&select=id`, {
     headers: {
       "Accept": "application/json",
       apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
       Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
     }
   });
   
   const existingClasses = await pinCheckRes.json();
   if (existingClasses && existingClasses.length > 0) {
     showMessage("This PIN already exists. Please generate a new one.", "error");
     return;
   }
   
   const duration = document.getElementById('classDuration').value;

   const payload = {
     staff_id: lecturerUUID,
     name: name,
     class_pin: pin,
     time_slot: schedule || null,
     session_duration: parseInt(duration)
   };
   
   console.log('Creating class with payload:', JSON.stringify(payload, null, 2));
   console.log('lecturerUUID being used:', lecturerUUID);
   
   const res = await fetch("https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "Accept": "application/json",
       "Prefer": "return=representation",
       apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
       Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
     },
     body: JSON.stringify(payload),
   });

   const result = await res.json();
   console.log('Create class result:', res.status, JSON.stringify(result, null, 2));
   
   if (res.ok && result && result.length) {
     showMessage(`✅ Class created! PIN: ${pin}`, "success");
     createClassForm.style.display = 'none';
     clearClassForm();
     loadLecturerClasses();
   } else {
     console.error('Create class error details:', JSON.stringify(result, null, 2));
     showMessage(`❌ Error: ${result.message || result.hint || 'Unknown error'}`, "error");
   }
 } catch (err) {
   console.error('Network error:', err);
   showMessage("❌ Network error: " + err.message, "error");
 }
}


async function loadLecturerClasses() {
  console.log('loadLecturerClasses called'); // Debug log
  console.log('currentUser:', currentUser); // Debug log
  
  try {
    // Multiple validation checks
    if (!currentUser) {
      console.error('No currentUser found'); // Debug log
      classesList.innerHTML = '<div class="error">User session invalid - no current user</div>';
      return;
    }
    
    if (!currentUser.databaseId) {
      console.error('No databaseId found for user:', currentUser); // Debug log
      classesList.innerHTML = '<div class="error">User session invalid - no database ID</div>';
      return;
    }
    
    const lecturerUUID = currentUser.databaseId;
    console.log('Fetching classes for lecturer UUID:', lecturerUUID); // Debug log
    
    // Fetch classes using the UUID
// Use the user's UUID directly, not their staff_id field
const url = `https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/classes?staff_id=eq.${lecturerUUID}&select=*`;    console.log('API URL:', url); // Debug log
    
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
      }
    });

    console.log('API response status:', res.status); // Debug log
    
    if (!res.ok) {
      console.error('API request failed:', res.status, res.statusText); // Debug log
      const errorText = await res.text();
      console.error('Error response:', errorText); // Debug log
      classesList.innerHTML = `<div class="error">API Error: ${res.status} - ${res.statusText}</div>`;
      return;
    }

    const classes = await res.json();
    console.log('API response data:', classes); // Debug log
    console.log('Number of classes found:', classes ? classes.length : 0); // Debug log
    
    currentClasses = classes || [];
    displayLecturerClasses(currentClasses);
    
  } catch (err) {
    console.error('Network error in loadLecturerClasses:', err); // Debug log
    classesList.innerHTML = `<div class="error">Network Error: ${err.message}</div>`;
  }
}

async function loadLecturerClassesWithFallback() {
  console.log('loadLecturerClassesWithFallback called'); // Debug log
  
  // First try normal loading
  await loadLecturerClasses();
  
  // If no classes found and there was a potential user session issue
  if (currentClasses.length === 0 && classesList.innerHTML.includes('error')) {
    console.log('Attempting to fix user session and retry...'); // Debug log
    
    const sessionFixed = await validateAndFixUserSession();
    if (sessionFixed) {
      console.log('Session fixed, retrying class load...'); // Debug log
      await loadLecturerClasses();
    }
  }
}

async function validateAndFixUserSession() {
  if (!currentUser || !currentUser.databaseId) {
    console.log('Attempting to fix user session...'); // Debug log
    
    // Try to find user by email as fallback
    if (currentUser && currentUser.email) {
      try {
        const res = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/users?email=eq.${currentUser.email}&select=*`, {
          headers: {
            "Accept": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
          }
        });
        
        const users = await res.json();
        if (res.ok && users && users.length > 0) {
          const updatedUser = users[0];
          updatedUser.databaseId = updatedUser.id;
          
          // Update both currentUser and storage
          currentUser = updatedUser;
          chrome.storage.local.set({ user: updatedUser });
          
          console.log('User session fixed:', updatedUser); // Debug log
          return true;
        }
      } catch (err) {
        console.error('Error fixing user session:', err); // Debug log
      }
    }
  }
  return false;
}

function displayLecturerClasses(classes) {
  if (classes.length === 0) {
    classesList.innerHTML = `
      <div class="no-classes">
        No classes created yet. Create your first class above.
        <br><br>
        <button id="refreshClassesBtn" class="secondary-button">
          <span class="button-icon">🔄</span> Refresh Classes
        </button>
      </div>
    `;
    
    // Add event listener for refresh button
    const refreshBtn = document.getElementById('refreshClassesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadLecturerClassesWithFallback);
    }
    return;
  }
  
  classesList.innerHTML = classes.map(cls => `
    <div class="class-item" data-class-id="${cls.id}">
      <div class="class-info">
        <div class="class-name">${cls.name}</div>
        <div class="class-time">${cls.time_slot || cls.class_schedule || 'No schedule set'}</div>
        <div class="class-pin">PIN: <strong>${cls.class_pin}</strong></div>
      </div>
      <div class="class-actions">
        <button class="control-button start-session-btn" data-class-id="${cls.id}">
          <span class="button-icon">▶</span>
          Start Session
        </button>
        <button class="control-button view-stats-btn" data-class-id="${cls.id}">
          <span class="button-icon">📊</span>
          Stats
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners after DOM is updated
  document.querySelectorAll('.start-session-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const classId = e.target.closest('.start-session-btn').dataset.classId;
      startClassSession(classId);
    });
  });
  
  document.querySelectorAll('.view-stats-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const classId = e.target.closest('.view-stats-btn').dataset.classId;
      viewClassStats(classId);
    });
  });
}

async function startClassSession(classId) {
  console.log('=== LECTURER STARTING SESSION ===');
  console.log('Class ID to start session for:', classId);
  
  const selectedClass = currentClasses.find(cls => cls.id === classId);
  console.log('Selected class:', selectedClass);
  
  if (!selectedClass) {
    console.log('ERROR: Selected class not found!');
    return;
  }
  
  try {
    // Use stored user ID instead of lookup
    if (!currentUser || !currentUser.databaseId) {
      console.log('ERROR: No current user or databaseId');
      showMessage("User session invalid. Please log out and back in.", "error");
      return;
    }
    
    const lecturerUUID = currentUser.databaseId;
    console.log('Lecturer UUID:', lecturerUUID);
    
    const sessionPayload = {
      class_id: classId,
      lecturer_id: lecturerUUID,
      session_name: `${selectedClass.name} Session`,
      is_active: true
    };
    
    console.log('Session payload:', sessionPayload);
    
    // Create session in database
    const sessionRes = await fetch("https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
      },
      body: JSON.stringify(sessionPayload),
    });
    
    console.log('Session creation response status:', sessionRes.status);
    
    const sessionResult = await sessionRes.json();
    console.log('Session creation result:', sessionResult);
    
    if (!sessionRes.ok || !sessionResult || !sessionResult.length) {
      console.log('ERROR: Session creation failed');
      console.log('Response:', sessionResult);
      showMessage("❌ Error starting session", "error");
      return;
    }
    
    const session = sessionResult[0];
    console.log('Created session:', session);
    
    activeClassSession = {
      sessionId: session.id,
      classId: classId,
      className: selectedClass.name,
      startTime: session.start_time
    };
    
    console.log('Active class session set:', activeClassSession);
    
    // Store active session locally for lecturer UI
    chrome.storage.local.set({ activeClassSession });
    
    // Update UI
    if (activeSession) {
      activeSession.style.display = 'block';
      if (activeSessionClassName) {
        activeSessionClassName.textContent = selectedClass.name;
      }
    }
    
    // Disable start buttons
    document.querySelectorAll('.start-session-btn').forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span class="button-icon">⏸</span> Session Active';
    });
    
    showMessage(`✅ Started session for ${selectedClass.name}`, "success");
    
    // Start monitoring students
    startLecturerSessionMonitoring();
    
    console.log('=== SESSION STARTED SUCCESSFULLY ===');
    
    // **ADD THIS**: Immediately verify the session was created
    setTimeout(async () => {
      console.log('=== VERIFYING SESSION CREATION ===');
      try {
        const verifyRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions?id=eq.${session.id}&select=*`, {
          headers: {
            "Accept": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
          }
        });
        
        const verifyResult = await verifyRes.json();
        console.log('Verification result:', verifyResult);
        
        // Also check what students would see
        const studentQueryUrl = `https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions?is_active=eq.true&class_id=eq.${classId}&select=*,classes(name)`;
        console.log('Student would query:', studentQueryUrl);
        
        const studentViewRes = await fetch(studentQueryUrl, {
          headers: {
            "Accept": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
          }
        });
        
        const studentViewResult = await studentViewRes.json();
        console.log('What students would see:', studentViewResult);
        
      } catch (err) {
        console.error('Verification error:', err);
      }
    }, 2000);
    
  } catch (err) {
    console.error('Error in startClassSession:', err);
    showMessage("❌ Network error: " + err.message, "error");
  }
}

async function stopClassSession() {
  if (!activeClassSession) return;
  
  try {
    // End session in database
    const endRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_sessions?id=eq.${activeClassSession.sessionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
      },
      body: JSON.stringify({
        is_active: false,
        end_time: new Date().toISOString()
      }),
    });
    
    if (endRes.ok) {
      showMessage("✅ Session ended", "success");
      
      // **ADD THIS**: Force immediate check for students
      chrome.storage.local.set({ 
        sessionEndSignal: Date.now() 
      });
    }
    
  } catch (err) {
    console.error('Error ending session:', err);
  }
  
  // Clear active session
  activeClassSession = null;
  chrome.storage.local.remove('activeClassSession');
  
  // Update UI
  if (activeSession) {
    activeSession.style.display = 'none';
  }
  
  // Re-enable start buttons
  document.querySelectorAll('.start-session-btn').forEach(btn => {
    btn.disabled = false;
    btn.innerHTML = '<span class="button-icon">▶</span> Start Session';
  });
  
  // Stop monitoring
  if (lecturerMonitoringInterval) {
    clearInterval(lecturerMonitoringInterval);
    lecturerMonitoringInterval = null;
  }
}

  let lecturerMonitoringInterval = null;

  function startLecturerSessionMonitoring() {
    // Monitor student participation every 10 seconds
    lecturerMonitoringInterval = setInterval(updateSessionStats, 10000);
    updateSessionStats(); // Update immediately
  }

  async function updateSessionStats() {
    if (!activeClassSession) return;
    
    try {
      // Get enrolled students count
      const enrollmentRes = await fetch(`https://wpsfugulijgyxvttsigk.supabase.co/rest/v1/class_enrollments?class_id=eq.${activeClassSession.classId}&select=user_id`, {
        headers: {
          "Accept": "application/json",
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MDYsImV4cCI6MjA2NjE4MTgwNn0.Dsw28arHCXWxUPAIzNBAwagBFAR3_ic5wn5oREQaJ2U",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwc2Z1Z3VsaWpneXh2dHRzaWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYwNTgwNiwiZXhwIjoyMDY2MTgxODA2fQ.MacfqZnkmVBJTt2vwIf0yhKVD7Sa9H6o4ceovYmVpkw",
        }
      });
      
      const enrollments = await enrollmentRes.json();
      const totalStudents = enrollments ? enrollments.length : 0;
      
      // For now, show placeholder data
      // In a real implementation, you'd fetch recent focus data for these students
      const focusedCount = Math.floor(totalStudents * 0.8); // 80% focused placeholder
      
      if (activeStudents) activeStudents.textContent = totalStudents;
      if (focusedStudents) focusedStudents.textContent = focusedCount;
      
    } catch (err) {
      console.error('Error updating session stats:', err);
    }
  }

  function viewClassStats(classId) {
    // Open focus chart with class filter
    window.open(`focus_chart.html?class_id=${classId}`, '_blank');
  }

  // ==================== INITIALIZATION ====================

  // Start the app
  console.log('Focus Monitor initialized');
});