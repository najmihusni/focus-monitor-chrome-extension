# User Acceptance Testing (UAT) Plan 🧪

## Focus Monitor Chrome Extension - UAT Protocol

### 📋 Test Overview
- **Duration:** 30 minutes
- **Participants:** 6 people (5 students + 1 educator) 
- **Objective:** Validate multi-user functionality in real classroom environment
- **Data Collection:** All results captured in Supabase PostgreSQL database
- **Test Environment:** Concurrent user testing with live data processing
- **Render Link:** [Chrome Focus Login](https://chrome-focus-plugin.onrender.com)


## 🚀 Post-Test Form (5 minutes)
- **Form:** [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSechRn6NW3l2_AAQfHqc4swMCxFcYSlMSMX4qXYM94aZVIHPg/viewform?usp=sharing&ouid=109011074561898516429)

---

## 🚀 Pre-Test Setup (5 minutes)

### Participant Requirements
| Role | Count | Requirements |
|------|-------|-------------|
| Students | 5 | Chrome browser, stable internet, webcam access |
| Educator | 1 | Chrome browser, class management access |

### Installation Steps
1. **All Participants:**
   ```bash
   # Install Focus Monitor Chrome Extension
   1. Download extension folder
   2. Open chrome://extensions/
   3. Enable Developer Mode
   4. Click "Load unpacked"
   5. Select extension folder
   ```

2. **Account Creation:**
   - **Students:** Name, Email, Matric Number → Select "Student" role
   - **Educator:** Name, Email, Staff ID → Select "Lecturer" role

3. **Verification Checklist:**
   - [ ] Extension icon visible in Chrome toolbar
   - [ ] Popup opens successfully
   - [ ] Account creation completed
   - [ ] User stored in Supabase `users` table

---

## 🎯 UAT Test Procedure

### Phase 1: Class Setup & Enrollment (5 minutes)

#### Educator Actions:
```
1. Open Focus Monitor extension
2. Click "Create New Class"
3. Enter: "UAT Test Session - [Date]"
4. Note the generated 6-digit PIN
5. Share PIN with all students via chat/verbal
```

#### Student Actions:
```
1. Open Focus Monitor extension
2. Enter the 6-digit PIN in "Join Class" field
3. Click "Join Class"
4. Verify success message appears
```

#### Expected Database Changes:
```sql
-- Check class creation
SELECT * FROM classes WHERE name LIKE 'UAT Test Session%';

-- Verify student enrollments (should show 9 records)
SELECT COUNT(*) FROM class_enrollments 
WHERE class_id = [generated_class_id];
```

---

### Phase 2: Live Focus Monitoring (15 minutes)

#### Educator Actions:
```
1. Click "Start Session" for UAT Test class
2. Monitor lecturer dashboard for real-time data
3. Observe student focus statistics
4. Note class performance metrics
```

#### Student Actions:
```
Timeline | Activity | Expected Focus Level
---------|----------|--------------------
0-5 min  | Look directly at screen, stay focused | 80-100% (Focused)
6-10 min | Look away occasionally, mixed attention | 50-79% (Moderate)
11-15 min| Simulate distraction, look away often | <50% (Distracted)
```

#### Real-time Data Monitoring:
```sql
-- Monitor focus logs in real-time
SELECT user_name, status, accuracy, timestamp 
FROM focus_logs 
WHERE timestamp >= NOW() - INTERVAL '20 minutes'
ORDER BY timestamp DESC;

-- Check active session
SELECT * FROM class_sessions 
WHERE is_active = true;
```

---

### Phase 3: Concurrent Performance Test (3 minutes)
- **All 9 students** actively tracked simultaneously
- **Educator** monitors system responsiveness
- **Database** handles multiple concurrent uploads
- **No system crashes or significant delays expected**

### Phase 4: Session Termination (2 minutes)
```
1. Educator clicks "Stop Session"
2. Students verify automatic tracking stops
3. Review captured analytics data
4. Export test results
```

---

## 📊 Data Collection Framework

### Supabase Database Monitoring

#### Primary Tables to Track:
```sql
-- 1. User Registration Success
SELECT role, COUNT(*) FROM users 
WHERE created_at >= '[test_start_time]'
GROUP BY role;

-- 2. Class Enrollment Verification  
SELECT u.name, ce.enrolled_at 
FROM class_enrollments ce
JOIN users u ON ce.user_id = u.id
WHERE ce.class_id = '[test_class_id]';

-- 3. Focus Detection Results
SELECT 
    user_name,
    status,
    AVG(accuracy) as avg_accuracy,
    COUNT(*) as total_captures
FROM focus_logs 
WHERE timestamp LIKE '[test_date]%'
GROUP BY user_name, status;

-- 4. Session Performance Metrics
SELECT 
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time))/60 as duration_minutes
FROM class_sessions 
WHERE session_name LIKE 'UAT Test Session%';
```

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| User Registration | 100% (10/10) | Count records in `users` table |
| Class Enrollment | 100% (9/9) | Count records in `class_enrollments` |
| Auto-session Detection | <10 seconds | Manual observation + timestamps |
| Screenshot Processing | >85% success | Success rate in `focus_logs` |
| Focus Detection Accuracy | Document actual results | Compare expected vs actual focus levels |
| System Stability | Zero crashes | Manual observation |

---

## 🔍 Manual Observation Checklist

### Student Experience Validation
- [ ] **Installation:** Extension installs without errors
- [ ] **Registration:** Account creation process smooth
- [ ] **Class Joining:** PIN-based enrollment works correctly  
- [ ] **Auto-detection:** Session starts automatically when educator begins
- [ ] **UI Updates:** Focus status and timer display correctly
- [ ] **Performance:** No browser slowdowns or crashes

### Educator Experience Validation
- [ ] **Class Creation:** New class created successfully with PIN
- [ ] **Student Visibility:** All 9 enrolled students appear in dashboard
- [ ] **Session Control:** Start/stop session functionality works
- [ ] **Real-time Data:** Student focus levels update live
- [ ] **Analytics:** Class performance metrics calculate correctly

### Technical Performance Validation
- [ ] **Concurrent Processing:** All 9 students tracked simultaneously
- [ ] **Database Performance:** Supabase handles concurrent writes
- [ ] **Response Times:** Screenshot processing <5 seconds average
- [ ] **Data Accuracy:** Focus detection results match observed behavior

---

## 📈 Expected Results & Analysis

### Quantitative Outcomes
```
Expected Database Records:
- users: 6 new records (5 students + 1 educator)
- classes: 1 new class record  
- class_enrollments: 5 enrollment records
- class_sessions: 1 session record with start/end times
- focus_logs: ~270 focus analysis records (5 users × 30 captures)
```

### Focus Detection Distribution (Expected)
```
Time Period | Expected Focus Level Distribution
0-5 min     | 80% Focused, 15% Moderate, 5% Distracted
6-10 min    | 30% Focused, 50% Moderate, 20% Distracted  
11-15 min   | 10% Focused, 20% Moderate, 70% Distracted
```

### Performance Benchmarks
- **Session Start Delay:** <10 seconds for auto-detection
- **Screenshot Processing:** <5 seconds average response time
- **Database Writes:** <2 seconds for focus log storage
- **UI Updates:** Real-time (<3 seconds) dashboard refresh

---

## ⚠️ Risk Management

### Potential Issues & Mitigation
| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| Internet connectivity failure | Medium | High | Test connections beforehand, have backup network |
| Extension installation issues | Low | Medium | Pre-install and test 24 hours before UAT |
| Database connection timeout | Low | High | Monitor Supabase status, have local backup logging |
| Participant dropout | Medium | Low | Continue with remaining participants |
| Browser compatibility issues | Low | Medium | Ensure all participants use Chrome 88+ |

### Contingency Plans
```
IF database fails:
  → Continue test with manual observation only
  → Document all issues for analysis

IF <7 students available:
  → Proceed with available participants
  → Note limitation in results

IF educator system fails:
  → Switch to backup educator account
  → Resume from current test phase
```

---

## 📋 Post-Test Data Extraction

### Immediate Database Queries
```sql
-- UAT Results Summary
WITH test_summary AS (
  SELECT 
    COUNT(DISTINCT user_name) as active_students,
    COUNT(*) as total_screenshots,
    AVG(accuracy) as avg_focus_accuracy,
    MIN(timestamp) as test_start,
    MAX(timestamp) as test_end
  FROM focus_logs 
  WHERE timestamp >= '[test_start_time]'
)
SELECT * FROM test_summary;

-- Focus Distribution Analysis
SELECT 
  CASE 
    WHEN accuracy >= 80 THEN 'Focused'
    WHEN accuracy >= 50 THEN 'Moderate' 
    ELSE 'Distracted'
  END as focus_category,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM focus_logs 
WHERE timestamp >= '[test_start_time]'
GROUP BY 1;

-- Student Participation Report
SELECT 
  user_name,
  COUNT(*) as screenshots_captured,
  AVG(accuracy) as avg_accuracy,
  MIN(timestamp) as first_capture,
  MAX(timestamp) as last_capture
FROM focus_logs 
WHERE timestamp >= '[test_start_time]'
GROUP BY user_name
ORDER BY screenshots_captured DESC;
```

---

## 📝 Test Completion Checklist

### Technical Validation
- [ ] All database tables populated correctly
- [ ] Focus detection algorithms performed as expected
- [ ] Multi-user concurrent processing successful
- [ ] Real-time data synchronization verified
- [ ] No data loss or corruption detected

### User Experience Validation  
- [ ] Installation process documented and improved
- [ ] User interface feedback collected
- [ ] System performance meets expectations
- [ ] Accessibility and usability confirmed

### Documentation & Reporting
- [ ] Test results exported from Supabase
- [ ] Performance metrics calculated and documented
- [ ] Issues and limitations identified
- [ ] Recommendations for improvements noted
- [ ] UAT report prepared for stakeholders

---

## 🎯 Success Criteria

**UAT is considered SUCCESSFUL if:**
- ✅ ≥85% of planned participants complete the full test
- ✅ ≥90% screenshot processing success rate
- ✅ Zero system crashes or data corruption
- ✅ Session auto-detection works for ≥80% of students
- ✅ Real-time dashboard updates function correctly
- ✅ All test data successfully stored in Supabase

**UAT Results will be used for:**
- System performance optimization
- User experience improvements  
- Production deployment planning
- Academic research publication
- Future development roadmap

---

*For questions about this UAT plan, please contact the development team or refer to the main project documentation.*
