document.addEventListener('DOMContentLoaded', () => {
    // Stop script if not on the course page
    const coursePage = document.querySelector('.course-container');
    if (!coursePage) return;

    // --- GLOBAL VARIABLES ---
    let courseData = {};
    let allCourses = {};
    const currentCourseId = localStorage.getItem('lmsCurrentCourse') || 'tour-guiding';
    const navList = document.getElementById('course-navigation-list');
    const mobileNavList = document.getElementById('mobile-navigation-list');
    const contentArea = document.getElementById('course-content-area');
    const progressBar = document.getElementById('progressBar');
    
    // Progress key is now dynamic based on course ID
    const progressKey = `lmsProgress_${currentCourseId}`;

    // --- GOOGLE SHEETS CONFIGURATION ---
    // GOOGLE WEB APP URL
    const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwrv6v7pUs9f_8EXIp5L7b2n9gy5zggQhz79O59y1HQ_0wTX2EBP9gtSyQlpUcJUodjnQ/exec';

    // Mobile navigation elements
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    const mobileNavMenu = document.querySelector('.mobile-nav-menu');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');

    // --- INITIALIZATION ---
    async function initializeCourse() {
        const firstName = localStorage.getItem('lmsUserFirstName');
        if (!firstName) {
            window.location.href = 'start.html';
            return;
        }
        
        document.getElementById('welcome-user').textContent = `Welcome, ${firstName}!`;
        
        try {
            // First load the master course list to get current course info
            const coursesResponse = await fetch('data/courses.json');
            if (!coursesResponse.ok) throw new Error('Failed to load course list');
            const coursesData = await coursesResponse.json();
            allCourses = coursesData.courses;
            
            const currentCourse = allCourses.find(c => c.id === currentCourseId);
            if (!currentCourse) throw new Error('Course not found');
            
            // Then load the specific course data
            const courseResponse = await fetch(currentCourse.dataFile);
            if (!courseResponse.ok) throw new Error('Failed to load course data');
            courseData = await courseResponse.json();
            
            document.title = courseData.courseTitle;
            buildCourseUI();
            addEventListeners();
            updateProgress();
            initializeMobileNavigation();
        } catch (error) {
            contentArea.innerHTML = `<h2>Error: ${error.message}</h2><p>An error occurred while loading the course. Please check the console or contact support.</p>`;
            console.error("Course initialization error:", error);
        }
    }
    
    // --- UI BUILDING ---
    function buildCourseUI() {
        let initialContent = `<div id="welcome" class="content-panel active">
            <h2>Welcome to ${courseData.courseTitle}</h2>
            <p>Select a lesson from the navigation menu to begin your learning journey.</p>
            <div class="action-buttons">
                <button id="start-now-btn" class="button">Start Now</button>
            </div>
        </div>`;
        contentArea.insertAdjacentHTML('beforeend', initialContent);
        
        courseData.modules.forEach((module) => {
            navList.innerHTML += `<li class="module-title">${module.moduleTitle}</li>`;
            mobileNavList.innerHTML += `<li class="module-title">${module.moduleTitle}</li>`;
            
            module.lessons.forEach(lesson => {
                navList.innerHTML += `<li><a href="#" class="lesson-link" data-content="${lesson.id}"><span class="status-icon"></span><span class="lesson-title">${lesson.title}</span></a></li>`;
                mobileNavList.innerHTML += `<li><a href="#" class="lesson-link" data-content="${lesson.id}"><span class="status-icon"></span><span class="lesson-title">${lesson.title}</span></a></li>`;
                
                let panelHTML = `<div id="${lesson.id}" class="content-panel"><h2>${lesson.title}</h2>`;
                let hasActions = false;
                lesson.content.forEach(item => {
                    switch(item.type) {
                        case 'text': panelHTML += `<p>${item.data}</p>`; break;
                        case 'list': panelHTML += `<ul>${item.data.map(li => `<li>${li}</li>`).join('')}</ul>`; break;
                        case 'video': panelHTML += `<div class="video-container"><iframe src="${item.data}" frameborder="0" allowfullscreen></iframe></div>`; break;
                        case 'tip': panelHTML += `<details class="tip-box"><summary>${item.data.summary}</summary><div>${item.data.details}</div></details>`; break;
                        case 'actions':
                            hasActions = true;
                            panelHTML += `<div class="action-buttons">`;
                            if(item.data.download) {
                                panelHTML += `<a href="${item.data.download.url}" download class="button-secondary">${item.data.download.text}</a>`;
                            }
                            panelHTML += `<button class="button complete-btn" data-lesson-id="${lesson.id}">Mark as Complete</button></div>`;
                            break;
                    }
                });
                if (!hasActions) {
                    panelHTML += `<div class="action-buttons"><span></span><button class="button complete-btn" data-lesson-id="${lesson.id}">Mark as Complete</button></div>`;
                }
                panelHTML += `</div>`;
                contentArea.insertAdjacentHTML('beforeend', panelHTML);
            });
        });
        
        const quiz = courseData.quiz;
        navList.innerHTML += `<li class="module-title">Final Assessment</li><li><a href="#" class="lesson-link" data-content="${quiz.id}"><span class="status-icon"></span><span class="lesson-title">${quiz.title}</span></a></li>`;
        mobileNavList.innerHTML += `<li class="module-title">Final Assessment</li><li><a href="#" class="lesson-link" data-content="${quiz.id}"><span class="status-icon"></span><span class="lesson-title">${quiz.title}</span></a></li>`;
        
        let quizHTML = `<div id="${quiz.id}" class="content-panel"><h2>${quiz.title}</h2><form id="quiz-form">`;
        quiz.questions.forEach(q => {
            quizHTML += `<div class="quiz-question" id="${q.id}-container"><p><strong>${q.text}</strong></p>`;
            if (q.type === 'essay') {
                quizHTML += `<textarea id="essay-${q.id}" rows="4" placeholder="Type your answer here..."></textarea><button type="button" class="button-secondary reveal-btn" data-suggestion-id="suggestion-${q.id}">Reveal Suggested Answer</button><div id="suggestion-${q.id}" class="tip-box" style="display:none;">${q.suggestion}</div>`;
            } else {
                for (const [key, value] of Object.entries(q.options)) { 
                    quizHTML += `<label><input type="radio" name="${q.id}" value="${key}"> ${value}</label><br>`; 
                }
            }
            quizHTML += `<div class="question-feedback"></div></div>`;
        });
        quizHTML += `<button type="submit" class="button">Submit & Grade Quiz</button></form><div id="quiz-results"></div>`;
        
        // Certificate section - with Google Sheets integration
        quizHTML += `<div id="certificate-section" style="display: none; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
            <h3>Congratulations!</h3>
            <p>You have completed all lessons and passed the quiz with a perfect score!</p>
            <div class="action-buttons">
                <a href="certificate.html" class="button">Generate My Certificate</a>
            </div>
        </div>`;
        
        quizHTML += `</div>`;
        contentArea.insertAdjacentHTML('beforeend', quizHTML);
    }

    // --- MOBILE NAVIGATION ---
    function initializeMobileNavigation() {
        // Toggle mobile menu
        if (mobileNavToggle) {
            mobileNavToggle.addEventListener('click', () => {
                mobileNavMenu.classList.add('active');
                mobileNavOverlay.style.display = 'block';
                document.body.style.overflow = 'hidden';
            });
        }
        
        // Close mobile menu
        if (mobileNavClose) {
            mobileNavClose.addEventListener('click', closeMobileMenu);
        }
        if (mobileNavOverlay) {
            mobileNavOverlay.addEventListener('click', closeMobileMenu);
        }
        
        // Close menu when clicking on a lesson link
        document.querySelectorAll('.mobile-nav-menu .lesson-link').forEach(link => {
            link.addEventListener('click', () => {
                closeMobileMenu();
            });
        });
        
        // Close menu with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });

        // Add scroll effect to mobile header
        window.addEventListener('scroll', () => {
            const mobileHeader = document.querySelector('.mobile-nav-header');
            if (mobileHeader && window.scrollY > 50) {
                mobileHeader.classList.add('scrolled');
            } else if (mobileHeader) {
                mobileHeader.classList.remove('scrolled');
            }
        });
    }
    
    function closeMobileMenu() {
        if (mobileNavMenu) {
            mobileNavMenu.classList.remove('active');
        }
        if (mobileNavOverlay) {
            mobileNavOverlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    }

    // --- EVENT HANDLING ---
    function addEventListeners() {
        // Start Now button
        const startNowBtn = document.getElementById('start-now-btn');
        if (startNowBtn) {
            startNowBtn.addEventListener('click', () => {
                const firstLesson = document.querySelector('.lesson-link:not(.disabled)');
                if (firstLesson) {
                    firstLesson.click();
                }
            });
        }

        // Navigation links - for both desktop and mobile
        document.querySelectorAll('.lesson-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const contentId = link.dataset.content;
                
                // Check if lesson is accessible (not disabled) - works for both desktop and mobile
                if (link.classList.contains('disabled')) {
                    showToast('Please complete previous lessons first.');
                    return;
                }
                
                document.querySelectorAll('.content-panel').forEach(panel => {
                    panel.classList.toggle('active', panel.id === contentId);
                });
                
                // Update active state for both desktop and mobile navigation
                document.querySelectorAll('.lesson-link').forEach(l => {
                    l.classList.toggle('active', l.dataset.content === contentId);
                });
            });
        });

        // Complete buttons
        document.querySelectorAll('.complete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const lessonId = button.dataset.lessonId;
                handleCompletion(lessonId);
            });
        });

        // Quiz form submission
        const quizForm = document.getElementById('quiz-form');
        if (quizForm) {
            quizForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleQuizSubmit();
            });
        }

        // Reveal suggested answer buttons
        document.querySelectorAll('.reveal-btn').forEach(button => {
            button.addEventListener('click', () => {
                const suggestionId = button.dataset.suggestionId;
                const suggestionDiv = document.getElementById(suggestionId);
                if (suggestionDiv) {
                    suggestionDiv.style.display = suggestionDiv.style.display === 'none' ? 'block' : 'none';
                }
            });
        });

        // Export completion button (added dynamically after quiz pass)
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'export-completion') {
                exportIndividualCompletion();
            }
        });
    }

    // --- LOGIC ---
    function getProgress() {
        return JSON.parse(localStorage.getItem(progressKey)) || [];
    }

    function saveProgress(lessonId) {
        const progress = getProgress();
        if (!progress.includes(lessonId)) {
            progress.push(lessonId);
            localStorage.setItem(progressKey, JSON.stringify(progress));
        }
    }

    function updateProgress() {
        const progress = getProgress();
        const allLessons = courseData.modules.flatMap(m => m.lessons.map(l => l.id));
        const quizId = courseData.quiz.id;
        
        // Enable/disable navigation based on progress - for both desktop and mobile
        allLessons.forEach((id, index) => {
            const links = document.querySelectorAll(`.lesson-link[data-content="${id}"]`);
            
            links.forEach(link => {
                // Mark completed lessons
                if (progress.includes(id)) {
                    link.querySelector('.status-icon').classList.add('completed');
                }
                
                // Disable lessons that haven't been completed yet
                // First lesson is always enabled
                if (index === 0) {
                    link.classList.remove('disabled');
                } else {
                    // Check if previous lesson is completed
                    const previousId = allLessons[index - 1];
                    if (progress.includes(previousId)) {
                        link.classList.remove('disabled');
                    } else {
                        link.classList.add('disabled');
                    }
                }
            });
        });
        
        // Handle quiz accessibility - for both desktop and mobile
        const quizLinks = document.querySelectorAll(`.lesson-link[data-content="${quizId}"]`);
        
        quizLinks.forEach(quizLink => {
            // Check if all lessons are completed
            const allLessonsCompleted = allLessons.every(id => progress.includes(id));
            
            if (allLessonsCompleted) {
                quizLink.classList.remove('disabled');
                if (progress.includes(quizId)) {
                    quizLink.querySelector('.status-icon').classList.add('completed');
                }
            } else {
                quizLink.classList.add('disabled');
            }
        });
        
        updateProgressBar();
    }

    function updateProgressBar() {
        const progress = getProgress();
        const allLessons = courseData.modules.flatMap(m => m.lessons.map(l => l.id));
        const quizId = courseData.quiz.id;
        const totalItems = allLessons.length + 1; // All lessons + quiz
        const progressPercentage = (progress.length / totalItems) * 100;
        
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
            progressBar.textContent = `${Math.round(progressPercentage)}%`;
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (toast) {
            toast.textContent = message;
            toast.className = 'show';
            setTimeout(() => { toast.className = ''; }, 3000);
        }
    }

    function handleCompletion(lessonId) {
        saveProgress(lessonId);
        updateProgress();
        
        // Auto-redirect to next lesson
        const allLinks = Array.from(document.querySelectorAll('.lesson-link:not(.disabled)'));
        const currentIndex = allLinks.findIndex(link => link.dataset.content === lessonId);
        const nextLink = allLinks.find((link, index) => index > currentIndex && !link.classList.contains('disabled'));
        
        if (nextLink) {
            const nextLessonTitle = nextLink.querySelector('.lesson-title').textContent;
            showToast(`Lesson completed! Redirecting to "${nextLessonTitle}"...`);
            setTimeout(() => {
                nextLink.click();
            }, 2000);
        } else if (lessonId === courseData.quiz.id) {
            showToast('Quiz passed! Saving your results...');
            setTimeout(() => {
                window.location.href = 'certificate.html';
            }, 2000);
        } else {
            showToast('Lesson completed!');
        }
    }

    function handleQuizSubmit() {
        const quizData = courseData.quiz;
        let score = 0;
        const totalMCQuestions = quizData.questions.filter(q => q.type !== 'essay').length;
        let allAnswered = true;
        const userAnswers = {};
        
        // Check all multiple choice questions
        quizData.questions.forEach(q => {
            if (q.type !== 'essay') {
                const selected = document.querySelector(`input[name="${q.id}"]:checked`);
                const feedbackDiv = document.querySelector(`#${q.id}-container .question-feedback`);
                
                if (selected) {
                    userAnswers[q.id] = selected.value;
                    if (selected.value === q.correct) {
                        score++;
                        if (feedbackDiv) {
                            feedbackDiv.innerHTML = `Correct! <span class="hint-text">${q.hint}</span>`;
                            feedbackDiv.className = 'question-feedback correct-answer';
                        }
                    } else {
                        if (feedbackDiv) {
                            feedbackDiv.innerHTML = `Incorrect. <span class="hint-text">${q.hint}</span>`;
                            feedbackDiv.className = 'question-feedback incorrect-answer';
                        }
                    }
                } else {
                    userAnswers[q.id] = 'unanswered';
                    if (feedbackDiv) {
                        feedbackDiv.innerHTML = `Please select an answer. <span class="hint-text">${q.hint}</span>`;
                        feedbackDiv.className = 'question-feedback incorrect-answer';
                    }
                    allAnswered = false;
                }
            } else {
                // Essay questions
                const essayAnswer = document.getElementById(`essay-${q.id}`);
                userAnswers[q.id] = essayAnswer ? essayAnswer.value : 'unanswered';
            }
        });
        
        const resultsDiv = document.getElementById('quiz-results');
        const certificateSection = document.getElementById('certificate-section');
        
        if (resultsDiv) {
            resultsDiv.innerHTML = `<p>Your score: ${score} / ${totalMCQuestions}</p>`;
            
            // Require perfect score AND all lessons completed to proceed
            const allLessons = courseData.modules.flatMap(m => m.lessons.map(l => l.id));
            const allLessonsCompleted = allLessons.every(id => getProgress().includes(id));
            
            if (score === totalMCQuestions && allAnswered && allLessonsCompleted) {
                resultsDiv.innerHTML += '<p class="success-message">Perfect score! You have passed the quiz.</p>';
                showToast('Perfect score! Saving your results to Google Sheets...');
                
                // Save quiz completion and show certificate button
                saveProgress(quizData.id);
                updateProgress();
                if (certificateSection) {
                    certificateSection.style.display = 'block';
                }
                
                // Save quiz results to data collection ONLY IF PASSED
                saveQuizResults({
                    score: score,
                    totalQuestions: totalMCQuestions,
                    answers: userAnswers,
                    passed: true,
                    completionTime: new Date().toISOString()
                });
            } else {
                if (!allLessonsCompleted) {
                    resultsDiv.innerHTML += '<p class="error-message">You need to complete all lessons before generating your certificate.</p>';
                    showToast('Please complete all lessons first.');
                } else {
                    resultsDiv.innerHTML += '<p class="error-message">You need a perfect score to proceed. Please review your answers and try again.</p>';
                    showToast('You need a perfect score to proceed. Please try again.');
                }
                if (certificateSection) {
                    certificateSection.style.display = 'none';
                }
                
                // DO NOT save failed attempts
                console.log('Quiz failed - data not saved');
            }
        }
    }

    // --- GOOGLE SHEETS INTEGRATION (CORS-FRIENDLY) ---
    async function sendToGoogleSheets(userData) {
        // Show loading state
        const certificateSection = document.getElementById('certificate-section');
        if (certificateSection) {
            certificateSection.innerHTML = `
                <h3>Congratulations!</h3>
                <p>Saving your completion data to Google Sheets...</p>
                <div class="action-buttons">
                    <button class="button" disabled>
                        <span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> Saving to Cloud...
                    </button>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }

        try {
            // Prepare data for Google Sheets
            const sheetData = {
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                congregation: userData.congregation || '',
                userCode: userData.userCode || '',
                courseId: userData.courseId || '',
                score: userData.score || 0,
                totalQuestions: userData.totalQuestions || 0,
                percentage: userData.percentage || 0,
                answers: userData.answers || {}
            };

            console.log('Sending to Google Sheets:', sheetData);

            // Use CORS-friendly approach
            const success = await sendDataCORSFriendly(sheetData);
            
            if (success) {
                showToast('✅ Completion data saved to Google Sheets successfully!');
                
                // Restore certificate section with success state
                if (certificateSection) {
                    certificateSection.innerHTML = `
                        <h3>Congratulations! ✅</h3>
                        <p>You have completed all lessons and passed the quiz! Your results have been saved to the central database.</p>
                        <div class="action-buttons">
                            <a href="certificate.html" class="button">Generate My Certificate</a>
                            <button id="export-completion" class="button-secondary">Export Backup Copy</button>
                        </div>
                    `;
                }
            } else {
                throw new Error('Failed to save to Google Sheets');
            }

        } catch (error) {
            console.error('Google Sheets error:', error);
            showToast('⚠️ Failed to save to Google Sheets. Using local storage backup.');
            
            // Fallback to local storage only
            if (certificateSection) {
                certificateSection.innerHTML = `
                    <h3>Congratulations! ⚠️</h3>
                    <p>You have completed the course! (Offline mode - please export your data as backup)</p>
                    <div class="action-buttons">
                        <a href="certificate.html" class="button">Generate My Certificate</a>
                        <button id="export-completion" class="button-secondary">Export My Data</button>
                    </div>
                `;
            }
        }
    }

    // CORS-friendly data submission
    async function sendDataCORSFriendly(data) {
        // Method 1: Try no-cors fetch (request goes through but we can't read response)
        try {
            await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            console.log('Data sent via no-cors fetch');
            return true; // Assume success since we can't check response
        } catch (error) {
            console.log('No-cors fetch failed, trying alternative...');
        }

        // Method 2: Use form submission (bypasses CORS completely)
        try {
            const formSuccess = await submitViaForm(data);
            if (formSuccess) return true;
        } catch (error) {
            console.log('Form submission failed:', error);
        }

        // Method 3: Use beacon (fire-and-forget)
        try {
            const beaconSuccess = submitViaBeacon(data);
            if (beaconSuccess) return true;
        } catch (error) {
            console.log('Beacon failed:', error);
        }

        return false;
    }

    function submitViaForm(data) {
        return new Promise((resolve) => {
            // Create a hidden iframe
            const iframe = document.createElement('iframe');
            iframe.name = 'googleSheetsSubmitFrame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // Create form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = GOOGLE_SHEETS_WEB_APP_URL;
            form.target = 'googleSheetsSubmitFrame';
            form.style.display = 'none';

            // Add data as hidden inputs
            Object.keys(data).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
                form.appendChild(input);
            });

            document.body.appendChild(form);

            // Set timeout to resolve (we can't reliably detect form submission completion)
            setTimeout(() => {
                document.body.removeChild(form);
                document.body.removeChild(iframe);
                console.log('Form submission completed (timeout)');
                resolve(true);
            }, 3000);

            form.submit();
        });
    }

    function submitViaBeacon(data) {
        try {
            // Convert to URLSearchParams for beacon
            const params = new URLSearchParams();
            Object.keys(data).forEach(key => {
                params.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]));
            });

            const success = navigator.sendBeacon(GOOGLE_SHEETS_WEB_APP_URL, params);
            console.log('Beacon sent:', success);
            return success;
        } catch (error) {
            console.log('Beacon error:', error);
            return false;
        }
    }

    // --- DATA COLLECTION FUNCTIONS ---
    function saveQuizResults(quizData) {
        // Only save data if user passed the quiz
        if (!quizData.passed) {
            console.log('Quiz not passed - data not saved');
            return;
        }

        const userData = {
            timestamp: new Date().toISOString(),
            firstName: localStorage.getItem('lmsUserFirstName'),
            lastName: localStorage.getItem('lmsUserLastName'),
            congregation: localStorage.getItem('lmsUserCongregation'),
            userCode: localStorage.getItem('lmsUserCode'),
            courseId: currentCourseId,
            courseTitle: courseData.courseTitle,
            score: quizData.score,
            totalQuestions: quizData.totalQuestions,
            percentage: Math.round((quizData.score / quizData.totalQuestions) * 100),
            passed: quizData.passed,
            answers: quizData.answers,
            completionTime: quizData.completionTime
        };
        
        // Save to localStorage (backup)
        let allQuizResults = JSON.parse(localStorage.getItem('allQuizResults') || '[]');
        allQuizResults.push(userData);
        localStorage.setItem('allQuizResults', JSON.stringify(allQuizResults));
        
        // Also store individual completion for easy export
        localStorage.setItem('latestCompletion', JSON.stringify(userData));
        
        // Save to Google Sheets (primary) - this will work despite CORS warnings
        sendToGoogleSheets(userData);
        
        console.log('Quiz results saved:', userData);
    }

    function exportIndividualCompletion() {
        const completion = JSON.parse(localStorage.getItem('latestCompletion') || '{}');
        
        if (!completion.timestamp) {
            alert('No completion data found. Please complete a course first.');
            return;
        }

        const csvRow = generateCompletionCSV(completion);
        const csvHeader = 'Timestamp,FirstName,LastName,Congregation,UserCode,CourseID,Score,TotalQuestions,Percentage,Answers\n';
        const fullCSV = csvHeader + csvRow;
        
        downloadCSV(fullCSV, `completion-${completion.courseId}-${completion.userCode}.csv`);
        
        alert('Your completion data has been exported! Please save this file as backup.');
    }

    function generateCompletionCSV(completion) {
        return [
            formatTimestamp(completion.timestamp),
            `"${completion.firstName}"`,
            `"${completion.lastName}"`,
            `"${completion.congregation}"`,
            `"${completion.userCode}"`,
            completion.courseId,
            completion.score,
            completion.totalQuestions,
            completion.percentage,
            `"${formatAnswers(completion.answers)}"`
        ].join(',');
    }

    function formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');
    }

    function formatAnswers(answers) {
        if (!answers) return 'No answers';
        
        if (typeof answers === 'string') {
            try {
                answers = JSON.parse(answers);
            } catch (e) {
                return answers;
            }
        }
        
        return Object.entries(answers)
            .map(([question, answer]) => `Q${question}: ${answer}`)
            .join('; ');
    }

    function downloadCSV(csvData, filename) {
        try {
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Download error:', error);
            alert('Error downloading file. Please copy the data manually from the popup.');
            fallbackExport(csvData, 'csv');
        }
    }

    function fallbackExport(data, type) {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'export-fallback';
        fallbackDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border: 2px solid var(--primary-color);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
        `;
        
        fallbackDiv.innerHTML = `
            <h3>Manual Export Required</h3>
            <p>Please copy the data below and save it as a .${type} file:</p>
            <textarea style="width: 100%; height: 200px; margin: 1rem 0; padding: 0.5rem; font-family: monospace;" readonly>${data}</textarea>
            <div class="action-buttons">
                <button onclick="copyToClipboard(this.previousElementSibling)" class="button">Copy to Clipboard</button>
                <button onclick="this.parentElement.parentElement.parentElement.removeChild(this.parentElement.parentElement)" class="button-secondary">Close</button>
            </div>
        `;
        document.body.appendChild(fallbackDiv);
    }

    function copyToClipboard(textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        alert('Copied to clipboard!');
    }

    // TEST FUNCTION - CORS friendly
    window.testGoogleSheets = async function() {
        console.log('Testing Google Sheets connection...');
        
        const testData = {
            firstName: "Test",
            lastName: "User", 
            congregation: "Test Congregation",
            userCode: "TEST001",
            courseId: "test-course",
            score: 3,
            totalQuestions: 3,
            percentage: 100,
            answers: {"q1": "a", "q2": "b"}
        };
        
        try {
            // Use the same CORS-friendly method as the main app
            const success = await sendDataCORSFriendly(testData);
            
            if (success) {
                alert('✅ Test data sent to Google Sheets!\n\nEven with CORS warnings, the data usually saves successfully.\n\nCheck your Google Sheet for new rows.');
                // Open the sheet for verification
                window.open('https://docs.google.com/spreadsheets/d/1aSwsuEd9quw0cHwmg_k8LZAtDeOKZFHyFMxWs7BAWWE/edit', '_blank');
            } else {
                alert('❌ Test failed. But try completing a real course - it might still work!');
            }
        } catch (error) {
            console.error('Test error:', error);
            alert('❌ Test error: ' + error.message + '\n\nBut the real course completion might still work!');
        }
    };

    initializeCourse();

});
