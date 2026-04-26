const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'abc',
    hash: 'pbkdf2:sha256:600000$MXtHyJWq0KqsEph6$e729a956a5914e3ac596da37da542aae4d53ab32635f975ef6b453a739401502'
};

const AUTH_KEYS = {
    credentials: 'dv_admin_credentials',
    legacyCredentials: 'rrr_admin_credentials',
    loggedIn: 'dv_admin_logged_in',
    legacyLoggedIn: 'rrr_admin_logged_in',
    username: 'dv_admin_username',
    legacyUsername: 'rrr_admin_username'
};

window.addEventListener('load', function () {
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(function () {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
        }
        setTimeout(function () {
            if (loadingScreen) {
                loadingScreen.remove();
            }
        }, 500);
    }, 1200);
});

function getAdminCredentials() {
    try {
        const stored = JSON.parse(localStorage.getItem(AUTH_KEYS.credentials) || localStorage.getItem(AUTH_KEYS.legacyCredentials) || 'null');
        if (stored && stored.username && stored.password) {
            return Promise.resolve(stored);
        }
    } catch {
        // Fall back to file/default.
    }

    return fetch('data/admin.json', { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Unable to load admin credentials.');
            }
            return response.json();
        })
        .then(function (value) {
            if (value && value.username && value.password) {
                return value;
            }
            return DEFAULT_ADMIN;
        })
        .catch(function () {
            return DEFAULT_ADMIN;
        });
}

function toHex(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

function secureEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
}

async function verifyWerkzeugPbkdf2Sha256(plainPassword, storedHash) {
    if (!window.crypto || !window.crypto.subtle) {
        return false;
    }

    const parts = String(storedHash).split('$');
    if (parts.length !== 3) {
        return false;
    }

    const method = parts[0];
    const salt = parts[1];
    const expectedHex = parts[2].toLowerCase();
    const methodParts = method.split(':');

    if (methodParts.length !== 3 || methodParts[0] !== 'pbkdf2' || methodParts[1] !== 'sha256') {
        return false;
    }

    const iterations = Number.parseInt(methodParts[2], 10);
    if (!Number.isFinite(iterations) || iterations < 1) {
        return false;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(plainPassword),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: encoder.encode(salt),
            iterations: iterations
        },
        keyMaterial,
        expectedHex.length * 4
    );

    const actualHex = toHex(derivedBits);
    return secureEquals(actualHex, expectedHex);
}

async function verifyPassword(plainPassword, storedValue) {
    if (typeof storedValue !== 'string' || !storedValue) {
        return false;
    }

    if (storedValue.startsWith('pbkdf2:sha256:')) {
        try {
            return await verifyWerkzeugPbkdf2Sha256(plainPassword, storedValue);
        } catch {
            return false;
        }
    }

    return secureEquals(plainPassword, storedValue);
}

function clearLoginError(loginError) {
    if (!loginError) {
        return;
    }
    loginError.style.display = 'none';
    loginError.textContent = '';
}

function setLoginError(loginError, message) {
    if (!loginError) {
        return;
    }
    loginError.textContent = message;
    loginError.style.display = 'block';
}

async function attemptLogin(username, password) {
    try {
        const creds = await getAdminCredentials();
        const userMatch = secureEquals(String(username || ''), String(creds.username || DEFAULT_ADMIN.username));
        const candidates = [
            creds.password,
            creds.hash,
            DEFAULT_ADMIN.password,
            DEFAULT_ADMIN.hash
        ].filter(Boolean);

        let passMatch = false;
        for (const candidate of candidates) {
            if (await verifyPassword(String(password || ''), String(candidate))) {
                passMatch = true;
                break;
            }
        }

        if (userMatch && passMatch) {
            return true;
        }
    } catch {
        // Invalid credentials.
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('adminLoginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitButton = document.querySelector('.btn-submit');
    const loginError = document.getElementById('loginError');

    if (localStorage.getItem(AUTH_KEYS.loggedIn) === 'true' || localStorage.getItem(AUTH_KEYS.legacyLoggedIn) === 'true') {
        localStorage.setItem(AUTH_KEYS.loggedIn, 'true');
        window.location.href = '/admin/dashboard';
        return;
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
            clearLoginError(loginError);

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok && result.ok) {
                    localStorage.setItem(AUTH_KEYS.loggedIn, 'true');
                    localStorage.setItem(AUTH_KEYS.username, result.username);
                    window.location.href = 'admin_dashboard.html';
                    return;
                }

                setLoginError(loginError, result.error || 'Invalid username or password.');
            } catch (error) {
                setLoginError(loginError, 'An error occurred. Please try again.');
            } finally {
                submitButton.textContent = 'Login';
                submitButton.disabled = false;
            }
        });
    }

    if (usernameInput) {
        usernameInput.focus();
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            clearLoginError(loginError);
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', function () {
            clearLoginError(loginError);
        });
    }
});