import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAe6yU5I9DiTkoNWAWoYwwYS2agd8zop-A",
  authDomain: "votenext-2f1d9.firebaseapp.com",
  projectId: "votenext-2f1d9",
  storageBucket: "votenext-2f1d9.firebasestorage.app",
  messagingSenderId: "679113994543",
  appId: "1:679113994543:web:a24b1832ffff9a430531da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    // Auth State
    let currentUser = null;
    let hasVoted = false;
    let votedFor = null;

    const navAuthLink = document.getElementById('nav-auth-link');
    const voteForm = document.getElementById('voteForm');
    const toast = document.getElementById('toast');

    // UI elements for Voting logic setup
    function setupVotingUI() {
        if (!voteForm) return;
        
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
            // Bind radio and form listeners if it's the raw HTML
            const radioButtons = document.querySelectorAll('input[name="party"]');
            if (radioButtons.length > 0) {
                radioButtons.forEach(radio => {
                    radio.addEventListener('change', function() {
                        document.querySelectorAll('.vote-option').forEach(opt => opt.classList.remove('selected'));
                        if(this.checked) {
                            this.closest('.vote-option').classList.add('selected');
                        }
                    });
                });

                // Clear existing listeners to prevent double submission
                const newVoteForm = voteForm.cloneNode(true);
                voteForm.parentNode.replaceChild(newVoteForm, voteForm);

                newVoteForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if(hasVoted) return;

                    const selectedParty = document.querySelector('input[name="party"]:checked');
                    const submitBtn = newVoteForm.querySelector('.btn-submit');
                    
                    if(selectedParty && currentUser) {
                        const party = selectedParty.value;
                        
                        submitBtn.disabled = true;
                        submitBtn.innerText = 'Submitting...';
                        
                        try {
                            const uid = currentUser.uid;
                            
                            // Double check if already voted
                            const userVoteRef = ref(db, 'votes/' + uid);
                            const snapshot = await get(userVoteRef);
                            if (snapshot.exists()) {
                                alert("You have already voted!");
                                return;
                            }
                            
                            // Save user's vote
                            await set(userVoteRef, {
                                party: party,
                                timestamp: Date.now()
                            });

                            // Increment exact party count
                            const partyTotalRef = ref(db, 'totals/' + party);
                            await runTransaction(partyTotalRef, (currentVotes) => {
                                return (currentVotes || 0) + 1;
                            });

                            hasVoted = true;
                            votedFor = party;
                            
                            showToast();
                            setTimeout(() => {
                                // Since we replaced voteForm
                                window.location.reload(); 
                            }, 2000);
                        } catch(err) {
                            alert('Network Error connecting to the server. ' + err.message);
                            submitBtn.disabled = false;
                            submitBtn.innerText = 'Submit Opinion';
                        }
                    }
                });
            }
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            if (navAuthLink) {
                navAuthLink.innerText = `Logout (${user.email.split('@')[0]})`;
                navAuthLink.href = "#";
                navAuthLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await signOut(auth);
                    window.location.reload();
                });
            }
            
            // Fetch vote state
            if (voteForm) {
                const userVoteRef = ref(db, 'votes/' + user.uid);
                const snapshot = await get(userVoteRef);
                if (snapshot.exists()) {
                    hasVoted = true;
                    votedFor = snapshot.val().party;
                } else {
                    hasVoted = false;
                    votedFor = null;
                }
                setupVotingUI();
            }
        } else {
            currentUser = null;
            hasVoted = false;
            votedFor = null;
            if (navAuthLink) {
                navAuthLink.innerText = "Login";
                navAuthLink.href = "auth.html";
            }
            setupVotingUI();
        }
    });

    // --- Live Results Page Logic ---
    const totalVotesCountEl = document.getElementById('totalVotesCount');
    if (totalVotesCountEl) {
        const totalsRef = ref(db, 'totals');
        onValue(totalsRef, (snapshot) => {
            const votes = snapshot.val() || {};
            const ldf = votes.LDF || 0;
            const udf = votes.UDF || 0;
            const nda = votes.NDA || 0;
            const others = votes.Others || 0;
            
            const totalVotes = ldf + udf + nda + others;
            totalVotesCountEl.innerText = totalVotes.toLocaleString();

            const parties = ['LDF', 'UDF', 'NDA', 'Others'];
            parties.forEach(party => {
                const lowerParty = party.toLowerCase();
                const count = votes[party] || 0;
                
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
        });
    }

    // --- Authentication Page Logic ---
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const authMsg = document.getElementById('auth-msg');

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            googleSignInBtn.disabled = true;
            googleSignInBtn.innerText = 'Authenticating...';

            try {
                await signInWithPopup(auth, provider);
                authMsg.innerText = "Logged in successfully! Redirecting...";
                authMsg.className = "auth-message success";
                setTimeout(() => window.location.href = 'index.html', 1000);
            } catch(err) {
                authMsg.innerText = "Error: " + err.message;
                authMsg.className = "auth-message error";
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" style="margin-right: 10px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                `;
            }
        });
    }

    // --- Component Logic ---
    function showToast() {
        const tst = document.getElementById('toast');
        if(!tst) return;
        tst.classList.remove('hidden');
        requestAnimationFrame(() => tst.classList.add('show'));
        setTimeout(() => {
            tst.classList.remove('show');
            setTimeout(() => tst.classList.add('hidden'), 500);
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
