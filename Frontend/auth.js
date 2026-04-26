const Auth = {
    getToken: () => localStorage.getItem('token'),
    saveToken: (token) => localStorage.setItem('token', token),
    saveUser: (username) => localStorage.setItem('username', username),
    getUser: () => localStorage.getItem('username'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    },
    checkAuth: () => {
        const token = localStorage.getItem('token');
        if (!token && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('signup.html')) {
            window.location.href = 'login.html';
        }
    }
};

// Check auth on every page load
Auth.checkAuth();
