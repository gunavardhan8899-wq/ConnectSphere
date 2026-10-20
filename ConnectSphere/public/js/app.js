const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = {
    user: null,
    groups: [],
    activeGroup: null,
    socket: null,
    typingTimer: null,
    lastTyping: 0,
    theme: localStorage.getItem('cs-theme') || 'light'
};

const authScreen = $('#authScreen');
const appScreen = $('#appScreen');

function toast(message, error = false) {
    const el = $('#toast');
    el.textContent = message;
    el.className = `toast show${error ? ' error' : ''}`;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        el.className = 'toast';
    }, 3200);
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
    }

    return data;
}

function switchTab(tab) {
    $$('.tab').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
    });

    $('#loginForm').classList.toggle('hidden', tab !== 'login');
    $('#registerForm').classList.toggle('hidden', tab !== 'register');
}

$$('[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});


// LOGIN
$('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const btn = e.submitter;

    if (btn) btn.disabled = true;

    try {
        const f = new FormData(form);

        await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: f.get('email'),
                password: f.get('password')
            })
        });

        await boot();
    } catch (err) {
        toast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
});


// REGISTER
$('#registerForm').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const btn = e.submitter;

    if (btn) btn.disabled = true;

    try {
        const f = new FormData(form);

        await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                fullName: f.get('fullName'),
                email: f.get('email'),
                password: f.get('password')
            })
        });

        await boot();
    } catch (err) {
        toast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
});


// START APPLICATION
async function boot() {
    try {
        const data = await api('/api/auth/me');

        state.user = data.user;

        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');

        $('#myName').textContent = state.user.fullName;
        $('#myAvatar').textContent = initials(state.user.fullName);

        document.body.classList.toggle(
            'dark',
            state.theme === 'dark'
        );

        await loadGroups();
        connectSocket();
    } catch {
        appScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
    }
}


// HELPERS
function initials(name = '?') {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(s => s[0])
        .join('')
        .toUpperCase();
}

function groupId(g) {
    return String(g._id || g.id);
}


// LOAD GROUPS
async function loadGroups() {
    try {
        const d = await api('/api/groups');

        state.groups = d.groups;

        renderGroups();

        if (state.activeGroup) {
            const updated = state.groups.find(
                g =>
                    String(g._id || g.id) ===
                    String(state.activeGroup._id || state.activeGroup.id)
            );

            if (updated) {
                selectGroup(updated, false);
            } else {
                clearGroup();
            }
        }
    } catch (e) {
        toast(e.message, true);
    }
}


// DISPLAY GROUP LIST
function renderGroups() {
    const list = $('#groupList');
    const q = $('#groupSearch').value.toLowerCase();

    const groups = state.groups.filter(g =>
        g.name.toLowerCase().includes(q)
    );

    if (!groups.length) {
        list.innerHTML = `
            <div class="empty-list">
                ${q
                    ? 'No matching groups.'
                    : 'No groups yet. Create one to get started!'}
            </div>
        `;
        return;
    }

    list.innerHTML = '';

    groups.forEach(g => {
        const item = document.createElement('div');

        item.className =
            'group-item' +
            (
                state.activeGroup &&
                groupId(state.activeGroup) === groupId(g)
                    ? ' active'
                    : ''
            );

        const av = document.createElement('div');
        av.className = 'avatar';
        av.textContent = initials(g.name);

        const copy = document.createElement('div');
        copy.className = 'group-copy';

        const name = document.createElement('strong');
        name.textContent = g.name;

        const sub = document.createElement('small');
        sub.textContent =
            `${(g.members || []).length} members · Group chat`;

        copy.append(name, sub);
        item.append(av, copy);

        item.addEventListener('click', () => selectGroup(g));

        list.append(item);
    });
}


// CLEAR SELECTED GROUP
function clearGroup() {
    state.activeGroup = null;

    $('#chatTitle').textContent = 'Welcome to ConnectSphere';
    $('#chatSubtitle').textContent =
        'Select a group or create a new one';

    $('#welcomePanel').classList.remove('hidden');
    $('#messages').classList.add('hidden');
    $('#messageForm').classList.add('hidden');
    $('#typingLine').textContent = '';

    renderGroups();
}


// SELECT GROUP
async function selectGroup(group, loadMessages = true) {
    if (state.activeGroup && state.socket) {
        state.socket.emit(
            'leave_group',
            groupId(state.activeGroup)
        );
    }

    state.activeGroup = group;

    renderGroups();

    $('#welcomePanel').classList.add('hidden');
    $('#messages').classList.remove('hidden');
    $('#messageForm').classList.remove('hidden');

    $('#chatTitle').textContent = group.name;

    $('#chatSubtitle').textContent =
        `${(group.members || []).length} members · Group conversation`;

    $('#groupAvatar').textContent = initials(group.name);
    $('#detailAvatar').textContent = initials(group.name);
    $('#detailName').textContent = group.name;

    $('#detailDescription').textContent =
        group.description ||
        'A space to share ideas and keep everyone in sync.';

    $('#memberCount').textContent =
        `${(group.members || []).length} members`;

    $('#memberCountSmall').textContent =
        (group.members || []).length;

    renderMembers(group);

    if (state.socket) {
        state.socket.emit(
            'join_group',
            groupId(group),
            result => {
                if (result?.error) {
                    toast(result.error, true);
                }
            }
        );
    }

    if (loadMessages) {
        $('#messages').innerHTML =
            '<div class="muted small">Loading messages…</div>';

        try {
            const d = await api(
                `/api/groups/${groupId(group)}/messages`
            );

            if (
                !state.activeGroup ||
                groupId(state.activeGroup) !== groupId(group)
            ) {
                return;
            }

            renderMessages(d.messages);
        } catch (e) {
            toast(e.message, true);
        }
    }

    appScreen.classList.add('mobile-chat-open');
}


// DISPLAY MEMBERS
function renderMembers(g) {
    const list = $('#memberList');

    list.innerHTML = '';

    (g.members || []).forEach(m => {
        const id = String(m._id || m.id);

        const row = document.createElement('div');
        row.className = 'member';

        const av = document.createElement('div');
        av.className = 'avatar';
        av.textContent = initials(m.fullName || 'User');

        const copy = document.createElement('div');

        const name = document.createElement('strong');
        name.textContent = m.fullName || 'Member';

        const email = document.createElement('small');
        email.textContent = m.email || '';

        copy.append(name, email);
        row.append(av, copy);

        if (
            (g.admins || []).some(
                a => String(a._id || a) === id
            )
        ) {
            const tag = document.createElement('span');
            tag.className = 'admin-tag';
            tag.textContent = 'ADMIN';
            row.append(tag);
        }

        list.append(row);
    });

    if (!g.members?.length) {
        list.innerHTML =
            '<p class="muted small">No members to show.</p>';
    }
}


// DISPLAY MESSAGES
function renderMessages(messages) {
    const box = $('#messages');

    box.innerHTML = '';

    let day = '';

    messages.forEach(m => {
        const d = new Date(m.createdAt);

        const label = d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year:
                d.getFullYear() !== new Date().getFullYear()
                    ? 'numeric'
                    : undefined
        });

        if (label !== day) {
            const divider = document.createElement('div');

            divider.className = 'date-divider';

            divider.textContent =
                label === new Date().toLocaleDateString(
                    undefined,
                    {
                        month: 'short',
                        day: 'numeric'
                    }
                )
                    ? 'Today'
                    : label;

            box.append(divider);

            day = label;
        }

        box.append(makeMessage(m));
    });

    if (!messages.length) {
        const empty = document.createElement('div');

        empty.className = 'welcome-panel';

        empty.innerHTML = `
            <div class="welcome-icon">✦</div>
            <h2>Say hello!</h2>
            <p>Be the first to send a message to this group.</p>
        `;

        box.append(empty);
    }

    box.scrollTop = box.scrollHeight;
}


// CREATE MESSAGE ELEMENT
function makeMessage(m) {
    const mine =
        String(m.senderId?._id || m.senderId) ===
        String(state.user.id);

    const row = document.createElement('div');

    row.className =
        'message-row' + (mine ? ' mine' : '');

    const av = document.createElement('div');
    av.className = 'message-avatar';

    av.textContent = initials(
        m.senderName || state.user.fullName
    );

    const body = document.createElement('div');
    body.className = 'message-body';

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const name = document.createElement('strong');

    name.textContent = mine
        ? 'You'
        : (m.senderName || 'Member');

    const time = document.createElement('time');

    time.textContent = new Date(
        m.createdAt
    ).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    meta.append(name, time);

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    bubble.textContent = m.deletedAt
        ? 'This message was deleted.'
        : m.content;

    body.append(meta, bubble);
    row.append(av, body);

    return row;
}


// SOCKET.IO CONNECTION
function connectSocket() {
    if (state.socket) {
        state.socket.disconnect();
    }

    state.socket = io();

    state.socket.on('connect_error', () => {
        toast(
            'Live connection unavailable. Refresh or sign in again.',
            true
        );
    });

    state.socket.on('new_message', m => {
        if (
            state.activeGroup &&
            String(m.groupId) === groupId(state.activeGroup)
        ) {
            const box = $('#messages');

            const welcome = box.querySelector('.welcome-panel');

            if (welcome) {
                box.innerHTML = '';
            }

            if (!box.querySelector('.date-divider')) {
                const div = document.createElement('div');

                div.className = 'date-divider';
                div.textContent = 'Today';

                box.append(div);
            }

            box.append(makeMessage(m));

            box.scrollTop = box.scrollHeight;
        }

        loadGroups();
    });

    state.socket.on('typing', d => {
        if (
            !state.activeGroup ||
            d.groupId !== groupId(state.activeGroup) ||
            d.userId === state.user.id
        ) {
            return;
        }

        $('#typingLine').textContent = d.typing
            ? `${d.name} is typing…`
            : '';
    });
}


// SEND MESSAGE
$('#messageForm').addEventListener('submit', e => {
    e.preventDefault();

    const content = $('#messageInput').value.trim();

    if (!content || !state.activeGroup) {
        return;
    }

    state.socket.emit(
        'send_message',
        {
            groupId: groupId(state.activeGroup),
            content
        },
        result => {
            if (result?.error) {
                toast(result.error, true);
            } else {
                $('#messageInput').value = '';
                $('#messageInput').style.height = 'auto';

                state.socket.emit(
                    'typing_stop',
                    groupId(state.activeGroup)
                );
            }
        }
    );
});


// TYPING INDICATOR
$('#messageInput').addEventListener('input', () => {
    const el = $('#messageInput');

    el.style.height = 'auto';

    el.style.height =
        `${Math.min(el.scrollHeight, 130)}px`;

    if (!state.activeGroup || !state.socket) {
        return;
    }

    const now = Date.now();

    if (now - state.lastTyping > 800) {
        state.socket.emit(
            'typing_start',
            groupId(state.activeGroup)
        );

        state.lastTyping = now;
    }

    clearTimeout(state.typingTimer);

    state.typingTimer = setTimeout(() => {
        if (state.activeGroup && state.socket) {
            state.socket.emit(
                'typing_stop',
                groupId(state.activeGroup)
            );
        }
    }, 1200);
});


// SEND WITH ENTER
$('#messageInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        $('#messageForm').requestSubmit();
    }
});


// GROUP SEARCH
$('#groupSearch').addEventListener('input', renderGroups);


// MODALS
function openModal(id) {
    $(id).classList.remove('hidden');
}

function closeModals() {
    $$('.modal-backdrop').forEach(m => {
        m.classList.add('hidden');
    });
}

$('#createGroupBtn').addEventListener('click', () => {
    openModal('#groupModal');
});

$('#welcomeCreateBtn').addEventListener('click', () => {
    openModal('#groupModal');
});

$$('[data-close]').forEach(button => {
    button.addEventListener('click', closeModals);
});

$$('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            closeModals();
        }
    });
});


// CREATE GROUP — FIXED
$('#groupForm').addEventListener('submit', async e => {
    e.preventDefault();

    // Save the form reference BEFORE any await.
    // e.currentTarget can become null after asynchronous operations.
    const form = e.currentTarget;
    const btn = e.submitter;

    if (btn) btn.disabled = true;

    try {
        const f = new FormData(form);

        const emails = String(f.get('emails') || '')
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);

        const memberIds = [];

        for (const email of emails) {
            const d = await api(
                `/api/users/search?q=${encodeURIComponent(email)}`
            );

            const u = d.users.find(
                u =>
                    u.email.toLowerCase() ===
                    email.toLowerCase()
            );

            if (!u) {
                throw new Error(
                    `No registered user found for ${email}`
                );
            }

            memberIds.push(u.id);
        }

        const d = await api('/api/groups', {
            method: 'POST',
            body: JSON.stringify({
                name: f.get('name'),
                description: f.get('description'),
                memberIds
            })
        });

        // Reset the saved form reference safely.
        form.reset();

        closeModals();

        await loadGroups();

        const createdGroup = state.groups.find(
            g => groupId(g) === String(d.group.id)
        ) || d.group;

        selectGroup(createdGroup);

        toast('Your group is ready!');
    } catch (err) {
        toast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
});


// ADD MEMBER BUTTON
$('#addMemberBtn').addEventListener('click', () => {
    if (!state.activeGroup) {
        return;
    }

    openModal('#addModal');
});


// ADD MEMBER — FIXED
$('#addForm').addEventListener('submit', async e => {
    e.preventDefault();

    if (!state.activeGroup) {
        return;
    }

    // Save the form reference BEFORE any await.
    const form = e.currentTarget;
    const btn = e.submitter;

    if (btn) btn.disabled = true;

    try {
        const f = new FormData(form);

        await api(
            `/api/groups/${groupId(state.activeGroup)}/members`,
            {
                method: 'POST',
                body: JSON.stringify({
                    email: f.get('email')
                })
            }
        );

        // Reset the saved form reference safely.
        form.reset();

        closeModals();

        await loadGroups();

        toast('Member added successfully.');
    } catch (err) {
        toast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
});


// GROUP DETAILS
$('#detailsBtn').addEventListener('click', () => {
    $('#detailsPanel').classList.toggle('open');
});

$('#membersBtn').addEventListener('click', () => {
    $('#detailsPanel').classList.toggle('open');
});

$('#closeDetails').addEventListener('click', () => {
    $('#detailsPanel').classList.remove('open');
});


// LEAVE GROUP
$('#leaveGroupBtn').addEventListener('click', async () => {
    if (
        !state.activeGroup ||
        !confirm(`Leave “${state.activeGroup.name}”?`)
    ) {
        return;
    }

    try {
        await api(
            `/api/groups/${groupId(state.activeGroup)}/leave`,
            {
                method: 'POST',
                body: '{}'
            }
        );

        state.activeGroup = null;

        await loadGroups();

        clearGroup();

        $('#detailsPanel').classList.remove('open');

        toast('You left the group.');
    } catch (e) {
        toast(e.message, true);
    }
});


// LOGOUT
$('#logoutBtn').addEventListener('click', async () => {
    try {
        await api('/api/auth/logout', {
            method: 'POST',
            body: '{}'
        });
    } catch {}

    if (state.socket) {
        state.socket.disconnect();
    }

    state.user = null;
    state.activeGroup = null;

    appScreen.classList.add('hidden');
    appScreen.classList.remove('mobile-chat-open');

    authScreen.classList.remove('hidden');

    $('#loginForm').reset();
});


// THEME
$('#themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');

    state.theme = document.body.classList.contains('dark')
        ? 'dark'
        : 'light';

    localStorage.setItem('cs-theme', state.theme);
});


// EMOJI MENU
$('#emojiBtn').addEventListener('click', () => {
    $('#emojiMenu').classList.toggle('hidden');
});

$$('#emojiMenu button').forEach(button => {
    button.addEventListener('click', () => {
        const el = $('#messageInput');

        el.value += button.textContent;
        el.focus();

        $('#emojiMenu').classList.add('hidden');
    });
});


// MOBILE NAVIGATION
$('#mobileBack').addEventListener('click', () => {
    appScreen.classList.remove('mobile-chat-open');
});


// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModals();

        $('#detailsPanel').classList.remove('open');

        $('#emojiMenu').classList.add('hidden');
    }
});


// START APPLICATION
boot();