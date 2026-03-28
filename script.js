document.addEventListener('DOMContentLoaded', async () => {
    const voteForm = document.getElementById('voteForm');
    const toast = document.getElementById('toast');
    
    // Auth State
    let currentUser = null;
    let hasVoted = false;
    let votedFor = null;

    // Fetch session state from PHP Backend
    try {
        const res = await fetch('api/me.php');
        const data = await res.json();
        if (data.loggedIn) {
            currentUser = data.email;
            hasVoted = data.hasVoted;
            votedFor = data.votedFor;
        }
    } catch(err) {
        console.error("Backend unreachable. Ensure XAMPP/WAMP is running.", err);
    }

    // Update Navbars everywhere
    const navAuthLink = document.getElementById('nav-auth-link');
    if (navAuthLink) {
        if (currentUser) {
            navAuthLink.innerText = `Logout (${currentUser.split('@')[0]})`;
            navAuthLink.href = "#";
            navAuthLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await fetch('api/logout.php');
                window.location.reload();
            });
        }
    }

    // --- Voting Page Logic ---
    if (voteForm) {
        if (!currentUser) {
            voteForm.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <h4 style="margin-bottom: 1rem; font-size: 1.25rem;">Authentication Required</h4>
                    <p style="margin-bottom: 2rem; color: var(--text-secondary);">One account equals one opinion. You must be logged in to participate.</p>
                    <a href="auth.html" class="btn-primary" style="display: inline-block;">Login / Register</a>
                </div>
            `;
        } else if (hasVoted) {
            voteForm.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                    <h4 style="margin-bottom: 1rem; font-size: 1.25rem;">Opinion Received</h4>
                    <p style="margin-bottom: 2rem; color: var(--text-secondary);">You have successfully locked in your vote for the <strong>${votedFor}</strong>.</p>
                    <a href="percentage.html" class="btn-primary" style="display: inline-block;">View Live Results</a>
                </div>
            `;
        } else {
            const radioButtons = document.querySelectorAll('input[name="party"]');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    document.querySelectorAll('.vote-option').forEach(opt => opt.classList.remove('selected'));
                    if(this.checked) {
                        this.closest('.vote-option').classList.add('selected');
                    }
                });
            });

            voteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const selectedParty = document.querySelector('input[name="party"]:checked');
                const submitBtn = voteForm.querySelector('.btn-submit');
                
                if(selectedParty && currentUser) {
                    const party = selectedParty.value;
                    
                    submitBtn.disabled = true;
                    submitBtn.innerText = 'Submitting...';
                    
                    try {
                        const res = await fetch('api/vote.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ party })
                        });
                        const data = await res.json();
                        
                        if(data.success) {
                            showToast();
                            setTimeout(() => window.location.reload(), 2000);
                        } else {
                            alert(data.message || 'Error recording vote.');
                            submitBtn.disabled = false;
                            submitBtn.innerText = 'Submit Opinion';
                        }
                    } catch(err) {
                        alert('Network Error connecting to the server.');
                        submitBtn.disabled = false;
                        submitBtn.innerText = 'Submit Opinion';
                    }
                }
            });
        }
    }

    // --- Live Results Page Logic ---
    const totalVotesCountEl = document.getElementById('totalVotesCount');
    if (totalVotesCountEl) {
        try {
            const res = await fetch('api/results.php');
            const votes = await res.json();
            
            const totalVotes = votes.LDF + votes.UDF + votes.NDA + votes.Others;
            totalVotesCountEl.innerText = totalVotes.toLocaleString();

            const parties = ['LDF', 'UDF', 'NDA', 'Others'];
            parties.forEach(party => {
                const lowerParty = party.toLowerCase();
                const count = votes[party];
                
                let rawPercent = totalVotes === 0 ? 0 : (count / totalVotes) * 100;
                let displayPercent = Math.round(rawPercent * 10) / 10;
                
                const percentEl = document.getElementById(`${lowerParty}-percent`);
                const barEl = document.getElementById(`${lowerParty}-bar`);
                
                if (percentEl && barEl) {
                    percentEl.innerText = `${displayPercent}%`;
                    setTimeout(() => {
                        barEl.style.width = `${displayPercent}%`;
                    }, 50);
                }
            });
        } catch(err) {
            console.error('Failed to fetch stats from database', err);
        }
    }

    // --- Authentication Page Logic ---
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authMsg = document.getElementById('auth-msg');

    if (loginForm && registerForm) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            authMsg.innerText = "";
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            authMsg.innerText = "";
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const password = document.getElementById('reg-password').value;
            const btn = registerForm.querySelector('.btn-submit');
            
            btn.disabled = true;
            btn.innerText = 'Creating Account...';

            try {
                const res = await fetch('api/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if(data.success) {
                    authMsg.innerText = "Account created successfully! Redirecting...";
                    authMsg.className = "auth-message success";
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    authMsg.innerText = data.message || "Registration Failed.";
                    authMsg.className = "auth-message error";
                    btn.disabled = false;
                    btn.innerText = 'Create Account';
                }
            } catch(err) {
                authMsg.innerText = "Network error. Make sure the PHP server is running.";
                authMsg.className = "auth-message error";
                btn.disabled = false;
                btn.innerText = 'Create Account';
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim().toLowerCase();
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('.btn-submit');
            
            btn.disabled = true;
            btn.innerText = 'Authenticating...';

            try {
                const res = await fetch('api/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if(data.success) {
                    authMsg.innerText = "Logged in successfully! Redirecting...";
                    authMsg.className = "auth-message success";
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    authMsg.innerText = data.message || "Invalid credentials.";
                    authMsg.className = "auth-message error";
                    btn.disabled = false;
                    btn.innerText = 'Sign In To Vote';
                }
            } catch(err) {
                authMsg.innerText = "Network error. Make sure the PHP server is running.";
                authMsg.className = "auth-message error";
                btn.disabled = false;
                btn.innerText = 'Sign In To Vote';
            }
        });
    }

    // --- Component Logic ---
    function showToast() {
        if(!toast) return;
        toast.classList.remove('hidden');
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 4000);
    }
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if(targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.glass-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
});
