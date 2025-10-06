document.addEventListener('DOMContentLoaded', () => {
  
  const methodEl = document.getElementById('method');
  const urlEl = document.getElementById('url');
  const argsEl = document.getElementById('args');
  const sendBtn = document.getElementById('send');
  const clearBtn = document.getElementById('clear');
  const requestEl = document.getElementById('request');
  const responseEl = document.getElementById('response');
  const curlEl = document.getElementById('curl');

  const dbListEl = document.getElementById('db-list');
  const dbResetBtn = document.getElementById('db-reset');
  const dbAddBtn = document.getElementById('db-add');
  const dbNewCourseName = document.getElementById('db-new-name');
  const dbNewCourseId = document.getElementById('db-new-id');

  const DB_KEY = 'simulator_items_v1';
  const UNLOCK_WHATISREST = 'simulator_unlocked_what_is_rest_v1';

  function loadDB() {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveDB(items) {
    localStorage.setItem(DB_KEY, JSON.stringify(items));
    renderDB();
  }

  function resetDB() {
      const courses = [
        {
          "id": 0,
          "course_id": "CS4020",
          "course_name": "Web Development"
        },
        {
          "id": 1,
          "course_id": "CS4040",
          "course_name": "Game Design and Simulation"
        },
        {
          "id": 2,
          "course_id": "CS4070/AR4070",
          "course_name": "Art, Technology, and Computing"
        },
        {
          "id": 3,
          "course_id": "EE4110/CS4110",
          "course_name": "Introductory Robotics"
        },
        {
          "id": 4,
          "course_id": "CS4120",
          "course_name": "Computing for Everyone"
        },
        {
          "id": 5,
          "course_id": "CS4140",
          "course_name": "Game Design with Modern Engines"
        },
        {
          "id": 6,
          "course_id": "CS4200/MA4200",
          "course_name": "Cryptography"
        },
        {
          "id": 7,
          "course_id": "CS4230",
          "course_name": "Networks and the Web"
        },
        {
          "id": 8,
          "course_id": "CS4270",
          "course_name": "Fundamentals of Object-Oriented Design"
        },
        {
          "id": 9,
          "course_id": "CS4320",
          "course_name": "Machine Learning"
        },
        {
          "id": 10,
          "course_id": "CS4330",
          "course_name": "Server-Side Development"
        },
        {
          "id": 11,
          "course_id": "CS4350",
          "course_name": "Data Structures and Algorithms"
        }
      ]
    saveDB(courses);
  }

  function renderDB() {
    const items = loadDB();
    if (!items.length) {
      dbListEl.textContent = '-- no items --';
      return;
    }
    dbListEl.textContent = items.map(i => `${i.id}, ${i.course_id}, ${i.course_name}`).join('\n');
  }

  if (!localStorage.getItem(DB_KEY)) resetDB();
  renderDB();

  dbResetBtn.addEventListener('click', () => { resetDB(); });
  dbAddBtn.addEventListener('click', () => {
    const course_name = (dbNewCourseName.value || '').trim();
    const course_id = (dbNewCourseId.value || '').trim();
    if (!course_name || !course_id) return;
    const items = loadDB();
    const id = items.length;
    items.push({ id, course_id, course_name });
    saveDB(items);
    dbNewCourseName.value = '';
    dbNewCourseId.value = '';
  });

  function tryParseJSON(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  function buildRequestRaw(method, url, body) {
    const lines = [];
    lines.push(`${method} ${url} HTTP/1.1`);
    lines.push(`Host: localhost`);
    lines.push(`User-Agent: HTTP-Simulator/1.0`);
    if (body) lines.push(`Content-Type: application/json`);
    lines.push('');
    if (body) lines.push(JSON.stringify(tryParseJSON(body) || body, null, 2));
    return lines.join('\n');
  }

  async function handleRequest(method, path, body) {
    const url = path.split('?')[0];
    const parts = url.replace(/^\//, '').split('/').filter(Boolean);
    const normalized = url.replace(/^\//, '').replace(/\/$/, '');

    const isWhatIsRest = normalized === 'what-is-rest' || normalized === 'what-is-rest.html';
    if (isWhatIsRest) {
      if (method === 'POST') {
        const incoming = (body || '').trim();
        if (incoming === "What's REST?") {
          try { localStorage.setItem(UNLOCK_WHATISREST, '1'); } catch (e) {}
          return { status: 201, body: { message: 'what-is-rest unlocked' } };
        }
        return { status: 400, body: { error: 'Incorrect body. Send exactly: What\'s REST?' } };
      }

      if (method === 'GET') {
        const unlocked = localStorage.getItem(UNLOCK_WHATISREST) === '1';
        if (unlocked) {
          try {
            const resp = await fetch('./what-is-rest.html');
            const text = await resp.text();
            return { status: resp.status || 200, headers: { 'Content-Type': 'text/html' }, body: text };
          } catch (e) {
            return { status: 0, body: { error: String(e) } };
          }
        }
        return { status: 302, headers: { Location: '/404.html' }, body: null };
      }

      return { status: 405, body: { error: 'Method not allowed on this endpoint' } };
    }
    if (parts.length === 0) {
      const resp = await fetch('./index.html');
      const text = await resp.text();
      return { status: 200, headers: { 'Content-Type': 'text/html' }, body: text };
    }

    if (parts[0] === 'courses') {
      const items = loadDB();
      if (parts.length === 1) {
        if (method === 'GET') return { status: 200, body: items };
        if (method === 'POST') {
          const obj = tryParseJSON(body) || (body ? { raw: body } : {});
          const id = items.length;
          const item = Object.assign({ id }, obj);
          items.push(item);
          saveDB(items);
          return { status: 201, body: item };
        }
        if (method === 'DELETE') {
          saveDB([]);
          return { status: 204, body: null };
        }
      }

      const id = Number(parts[1]);
      const idx = items.findIndex(i => i.id === id);
      if (Number.isNaN(id)) return { status: 400, body: { error: 'Invalid ID (the number, not the "CSxxxx" one)' } };
      if (idx === -1) return { status: 404, body: { error: 'Not found' } };

      if (method === 'GET') return { status: 200, body: items[idx] };
      if (method === 'PUT' || method === 'PATCH') {
        const obj = tryParseJSON(body) || { course_name: body };
        items[idx] = Object.assign({}, items[idx], obj);
        saveDB(items);
        return { status: 200, body: items[idx] };
      }
      if (method === 'DELETE') {
        items.splice(idx, 1);
        saveDB(items);
        return { status: 204, body: null };
      }
    }

    try {
      const resp = await fetch(path, { method });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        return { status: resp.status, body: data };
      } else {
        const text = await resp.text();
        return { status: resp.status, body: text, headers: { 'Content-Type': ct } };
      }
    } catch (e) {
      return { status: 0, body: { error: String(e) } };
    }
  }

  function formatResponseRaw(res) {
    const lines = [];
    lines.push(`HTTP/1.1 ${res.status} ${res.status === 200 ? 'OK' : ''}`);
    if (res.headers) for (const k in res.headers) lines.push(`${k}: ${res.headers[k]}`);
    lines.push('');
    if (res.body !== null && res.body !== undefined) {
      lines.push(typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2));
    }
    return lines.join('\n');
  }

  function buildCurl(method, path, body) {
    const p = path.startsWith('/') ? `http://localhost${path}` : path;
    const parts = ['curl -v', `-X ${method}`];
    if (body) parts.push(`-H "Content-Type: application/json" --data '${(typeof body === 'string') ? body.replace(/'/g, "'\\''") : JSON.stringify(body)}'`);
    parts.push(`"${p}"`);
    return parts.join(' ');
  }

  sendBtn.addEventListener('click', async () => {
    const method = methodEl.value;
    const url = urlEl.value || '/';
    const body = argsEl.value.trim();

    requestEl.textContent = buildRequestRaw(method, url, body);

    const res = await handleRequest(method, url, body);

    responseEl.textContent = formatResponseRaw(res);
    curlEl.textContent = buildCurl(method, url, res.body);
  });

  clearBtn.addEventListener('click', () => {
    methodEl.selectedIndex = 0;
    urlEl.value = '';
    argsEl.value = '';
    requestEl.textContent = '-- no request yet --';
    responseEl.textContent = '-- no response yet --';
    curlEl.textContent = '--';
  });
});