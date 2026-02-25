document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');

    const emailStep = document.getElementById('email-step');
    const otpStep = document.getElementById('otp-step');

    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const displayEmail = document.getElementById('display-email');

    const btnRequestOtp = document.getElementById('btn-request-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnBackToEmail = document.getElementById('btn-back-to-email');
    const btnLogout = document.getElementById('btn-logout');
    const btnToggle = document.getElementById('btn-toggle');

    const currentUserSpan = document.getElementById('current-user');
    const instanceStatus = document.getElementById('instance-status');
    const statusCard = document.querySelector('.status-card');
    const toggleText = document.getElementById('toggle-text');
    const toggleIcon = btnToggle.querySelector('i');

    const logsBody = document.getElementById('logs-body');
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');

    let currentStatus = 'unknown'; // running, stopped, pending, stopping
    let pollInterval = null;

    // --- Helpers ---
    const showToast = (message, type = 'success') => {
        toastMsg.textContent = message;
        toastEl.className = `toast show ${type}`;
        setTimeout(() => {
            toastEl.className = "toast";
        }, 3000);
    };

    const setLoading = (btn, isLoading, originalHtml) => {
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';
        } else {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    // --- API Calls ---
    const apiCall = async (endpoint, method = 'GET', body = null) => {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(endpoint, options);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 && endpoint !== '/api/me') {
                    handleLogoutLocal(); // Unauth
                    throw new Error('Session expired');
                }
                throw new Error(data.error || 'Request failed');
            }
            return data;
        } catch (err) {
            throw err;
        }
    };

    // --- Auth Flow ---
    const checkSession = async () => {
        try {
            const data = await apiCall('/api/me');
            if (data && data.email) {
                currentUserSpan.textContent = data.email;
                showDashboard();
            }
        } catch (err) {
            // No valid session, stay on login
            console.log("No active session.");
        }
    };

    const handleRequestOtp = async () => {
        const email = emailInput.value.trim();
        if (!email) return showToast('Please enter your email', 'error');

        const originalHtml = btnRequestOtp.innerHTML;
        setLoading(btnRequestOtp, true, originalHtml);

        try {
            const res = await apiCall('/api/request-otp', 'POST', { email });
            displayEmail.textContent = email;
            emailStep.classList.add('hidden');
            otpStep.classList.remove('hidden');
            showToast(res.message);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(btnRequestOtp, false, originalHtml);
        }
    };

    const handleVerifyOtp = async () => {
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();
        if (!otp || otp.length !== 6) return showToast('Enter 6-digit OTP', 'error');

        const originalHtml = btnVerifyOtp.innerHTML;
        setLoading(btnVerifyOtp, true, originalHtml);

        try {
            const res = await apiCall('/api/verify-otp', 'POST', { email, otp });
            currentUserSpan.textContent = res.email;
            showDashboard();
            showToast('Logged in successfully');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(btnVerifyOtp, false, originalHtml);
        }
    };

    const handleLogoutLocal = () => {
        loginSection.classList.add('active');
        dashboardSection.classList.remove('active');
        emailStep.classList.remove('hidden');
        otpStep.classList.add('hidden');
        emailInput.value = '';
        otpInput.value = '';
        if (pollInterval) clearInterval(pollInterval);
    };

    const handleLogout = async () => {
        try {
            await apiCall('/api/logout', 'POST');
            handleLogoutLocal();
            showToast('Logged out');
        } catch (err) {
            showToast('Error logging out', 'error');
        }
    };

    // --- Dashboard Logic ---
    const showDashboard = () => {
        loginSection.classList.remove('active');
        dashboardSection.classList.add('active');
        fetchStatus();
        fetchLogs();
        // Poll status every 10 seconds
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchStatus, 10000);
    };

    const updateStatusUI = (status) => {
        currentStatus = status;
        instanceStatus.textContent = status;

        statusCard.className = `status-card ${status}`;
        btnToggle.className = 'toggle-btn'; // reset

        if (status === 'running') {
            btnToggle.classList.add('btn-turn-off');
            btnToggle.disabled = false;
            toggleIcon.className = 'fa-solid fa-power-off';
            toggleText.textContent = 'STOP';
        } else if (status === 'stopped') {
            btnToggle.classList.add('btn-turn-on');
            btnToggle.disabled = false;
            toggleIcon.className = 'fa-solid fa-play';
            toggleText.textContent = 'START';
        } else {
            // pending, stopping
            btnToggle.classList.add('disabled');
            btnToggle.disabled = true;
            toggleIcon.className = 'fa-solid fa-circle-notch fa-spin';
            toggleText.textContent = status === 'pending' ? 'STARTING' : 'STOPPING';
        }
    };

    const fetchStatus = async () => {
        try {
            const data = await apiCall('/api/status');
            updateStatusUI(data.status);
        } catch (err) {
            console.error("Failed to fetch status");
        }
    };

    const handleToggle = async () => {
        if (currentStatus !== 'running' && currentStatus !== 'stopped') return;
        if (!confirm(`Are you sure you want to ${currentStatus === 'running' ? 'STOP' : 'START'} the instance?`)) return;

        const action = currentStatus === 'running' ? 'stop' : 'start';

        // Optimistic UI update
        btnToggle.disabled = true;
        updateStatusUI(action === 'start' ? 'pending' : 'stopping');

        try {
            const data = await apiCall('/api/toggle', 'POST', { action });
            showToast(data.message);
            fetchStatus(); // re-fetch to confirm
            setTimeout(fetchLogs, 2000); // refresh logs slightly after
        } catch (err) {
            showToast(err.message, 'error');
            fetchStatus(); // revert UI on error
        }
    };

    const fetchLogs = async () => {
        try {
            const logs = await apiCall('/api/logs');
            if (logs.length === 0) {
                logsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No activity recorded yet.</td></tr>';
                return;
            }

            logsBody.innerHTML = logs.map(log => {
                const actionClass = log.action.toLowerCase();
                const time = new Date(log.timestamp + 'Z').toLocaleString();
                const uptime = log.action === 'STOP' && log.uptime_minutes > 0 ?
                    `${Math.floor(log.uptime_minutes / 60)}h ${log.uptime_minutes % 60}m` : '-';

                return `
                    <tr>
                        <td><span class="action-badge ${actionClass}">${log.action}</span></td>
                        <td>${time}</td>
                        <td>${log.user_email.split('@')[0]}</td>
                        <td>${uptime}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error("Failed to fetch logs");
            logsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted text-danger">Failed to load logs.</td></tr>';
        }
    };

    // --- Event Listeners ---
    btnRequestOtp.addEventListener('click', handleRequestOtp);
    btnVerifyOtp.addEventListener('click', handleVerifyOtp);
    btnBackToEmail.addEventListener('click', () => {
        emailStep.classList.remove('hidden');
        otpStep.classList.add('hidden');
    });
    btnLogout.addEventListener('click', handleLogout);
    btnToggle.addEventListener('click', handleToggle);

    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRequestOtp();
    });
    otpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleVerifyOtp();
    });

    // Init
    checkSession();
});
