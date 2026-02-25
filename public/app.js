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
    const instancesContainer = document.getElementById('instances-container');
    const logsBody = document.getElementById('logs-body');
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');

    let configuredInstances = [];
    let instancesState = {}; // map of id -> status
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
            instancesContainer.innerHTML = '';
        } catch (err) {
            showToast('Error logging out', 'error');
        }
    };

    // --- Dashboard Logic ---
    const showDashboard = async () => {
        loginSection.classList.remove('active');
        dashboardSection.classList.add('active');

        await fetchInstancesConfig();
        fetchStatus();
        fetchLogs();

        // Poll status every 10 seconds
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchStatus, 10000);
    };

    const fetchInstancesConfig = async () => {
        try {
            configuredInstances = await apiCall('/api/instances');
            // Init state
            configuredInstances.forEach(inst => {
                instancesState[inst.id] = 'unknown';
            });
            renderInstanceCards();
        } catch (err) {
            console.error("Failed to fetch instance config", err);
            instancesContainer.innerHTML = '<div class="text-center text-danger">Failed to load configuration.</div>';
        }
    };

    const renderInstanceCards = () => {
        if (configuredInstances.length === 0) {
            instancesContainer.innerHTML = '<div class="text-center text-muted">No instances configured.</div>';
            return;
        }

        instancesContainer.innerHTML = configuredInstances.map(inst => {
            const status = instancesState[inst.id] || 'unknown';

            let btnClass = '';
            let btnIcon = '';
            let btnText = '';
            let disabled = true;

            if (status === 'running') {
                btnClass = 'btn-turn-off';
                btnIcon = 'fa-power-off';
                btnText = 'STOP';
                disabled = false;
            } else if (status === 'stopped') {
                btnClass = 'btn-turn-on';
                btnIcon = 'fa-play';
                btnText = 'START';
                disabled = false;
            } else {
                btnClass = 'disabled';
                btnIcon = 'fa-circle-notch fa-spin';
                btnText = status === 'pending' ? 'STARTING' : (status === 'stopping' ? 'STOPPING' : 'CHECKING');
                disabled = true;
            }

            return `
                <div class="status-card ${status}" id="card-${inst.id}">
                    <div class="status-indicator">
                        <div class="pulse-ring"></div>
                        <div class="status-dot"></div>
                    </div>
                    <div class="status-details">
                        <h3 class="mb-1">${inst.name}</h3>
                        ${inst.alias ? `<p class="text-muted text-sm mb-2" style="font-size: 0.8em; line-height: 1.2;"><b>用途:</b> ${inst.alias}</p>` : ''}
                        <p class="status-text">${status}</p>
                        <p class="instance-id mt-1 text-muted text-sm">${inst.id}</p>
                    </div>
                    <div class="action-area">
                        <button class="toggle-btn ${btnClass}" data-id="${inst.id}" ${disabled ? 'disabled' : ''}>
                            <i class="fa-solid ${btnIcon}"></i>
                            <span>${btnText}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Re-attach listeners to dynamic buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const instanceId = e.currentTarget.getAttribute('data-id');
                handleToggle(instanceId);
            });
        });
    };

    const fetchStatus = async () => {
        try {
            const statuses = await apiCall('/api/status');
            statuses.forEach(data => {
                if (data && data.instanceId) {
                    instancesState[data.instanceId] = data.status;
                }
            });
            renderInstanceCards();
        } catch (err) {
            console.error("Failed to fetch status");
        }
    };

    const handleToggle = async (instanceId) => {
        const currentStatus = instancesState[instanceId];
        if (currentStatus !== 'running' && currentStatus !== 'stopped') return;

        const instConfig = configuredInstances.find(i => i.id === instanceId);
        const name = instConfig ? instConfig.name : instanceId;

        if (!confirm(`Are you sure you want to ${currentStatus === 'running' ? 'STOP' : 'START'} ${name}?`)) return;

        const action = currentStatus === 'running' ? 'stop' : 'start';

        // Optimistic UI update
        instancesState[instanceId] = action === 'start' ? 'pending' : 'stopping';
        renderInstanceCards();

        try {
            const data = await apiCall('/api/toggle', 'POST', { action, instanceId });
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
                        <td><span class="text-muted" style="font-size: 0.85em;">${log.instance_id || 'Legacy'}</span></td>
                        <td>${time}</td>
                        <td>${log.user_email.split('@')[0]}</td>
                        <td>${uptime}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error("Failed to fetch logs");
            logsBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted text-danger">Failed to load logs.</td></tr>';
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

    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRequestOtp();
    });
    otpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleVerifyOtp();
    });

    // Init
    checkSession();
});
