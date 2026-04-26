const API_URL = '/api';

// UI Helpers
function showSection(sectionId) {
    const sections = ['formSection', 'attendanceSection', 'dashboardSection', 'notesSection'];
    sections.forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
    
    if (sectionId === 'notesSection') fetchNotes();
    if (sectionId === 'dashboardSection') fetchStats();
}

// Fetch Notes
async function fetchNotes() {
    const search = document.getElementById('search').value;
    const date = document.getElementById('filterDate').value;
    
    let url = `${API_URL}/notes?`;
    if (search) url += `search=${search}&`;
    if (date) url += `date=${date}`;

    try {
        const response = await fetch(url);
        const notes = await response.json();
        renderNotes(notes);
    } catch (err) {
        console.error(err);
    }
}

function renderNotes(notes) {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';

    if (notes.length === 0) {
        container.innerHTML = '<p>No notes found.</p>';
        return;
    }

    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <h3>${note.title}</h3>
            <p><strong>Course:</strong> ${note.course}</p>
            <p><strong>Date:</strong> ${note.date}</p>
            <p><strong>Author:</strong> ${note.author ? note.author.username : 'Anonymous'}</p>
            <p>${note.summary}</p>
            ${Auth.getUser() === (note.author ? note.author.username : '') ? 
                `<button onclick="deleteNote('${note._id}')">Delete</button>` : ''}
        `;
        container.appendChild(card);
    });
}

// Add Note
async function addSummary() {
    const title = "Lecture Summary"; // Default title or add input
    const course = document.getElementById('course').value;
    const date = document.getElementById('date').value;
    const summary = document.getElementById('summary').value;

    if (!course || !date || !summary) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ title, course, date, summary })
        });

        if (response.ok) {
            alert('Summary added!');
            showSection('notesSection');
            document.getElementById('course').value = '';
            document.getElementById('summary').value = '';
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to add summary');
        }
    } catch (err) {
        console.error(err);
    }
}

// Delete Note
async function deleteNote(id) {
    if (!confirm('Are you sure?')) return;

    try {
        const response = await fetch(`${API_URL}/notes/${id}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (response.ok) {
            fetchNotes();
        }
    } catch (err) {
        console.error(err);
    }
}

// Stats
async function fetchStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        document.getElementById('totalNotes').innerText = stats.totalNotes;
        document.getElementById('topRated').innerText = stats.topRated;
    } catch (err) {
        console.error(err);
    }
}

// Attendance
async function markAttendance() {
    const student = document.getElementById('student').value;
    const course = document.getElementById('courseAttend').value;

    if (!student || !course) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student, course })
        });

        if (response.ok) {
            alert('Attendance marked!');
            document.getElementById('student').value = '';
        }
    } catch (err) {
        console.error(err);
    }
}

async function checkAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance/count`);
        const data = await response.json();
        document.getElementById('attendanceCount').innerText = `Total Students: ${data.count}`;
    } catch (err) {
        console.error(err);
    }
}

// Search
function searchNotes() {
    fetchNotes();
}

// Logout
function logout() {
    Auth.logout();
}

// Initial view
window.onload = () => {
    showSection('dashboardSection');
};
