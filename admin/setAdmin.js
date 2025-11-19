// setAdmin.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js'
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js'
import {
getFirestore,
collection,
addDoc,
getDocs,
query,
orderBy,
serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'

// firebaseConfig (dari Anda)
const firebaseConfig = {
apiKey: "AIzaSyAVTzmJCfSgy4hvpJ2GS8Di636bbC1Y4a0",
authDomain: "website-pondok-5fe92.firebaseapp.com",
projectId: "website-pondok-5fe92",
storageBucket: "website-pondok-5fe92.firebasestorage.app",
messagingSenderId: "347150996874",
appId: "1:347150996874:web:c0e54103f88911f3f3e473",
measurementId: "G-3E7REB7RYQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


const adminUi = document.getElementById('adminUi');
const loading = document.getElementById('loading');
const adminEmailEl = document.getElementById('adminEmail');
const btnLogout = document.getElementById('btnLogout');
const btnSave = document.getElementById('btnSave');
const newsList = document.getElementById('newsList');
onAuthStateChanged(auth, async (user) => {
if (user) {
adminEmailEl.textContent = user.email || user.uid;
adminUi.classList.remove('hidden');
loading.style.display = 'none';
await loadNews();
} else {
window.location.href = 'admin-login.html';
}
});


btnLogout.addEventListener('click', async () => {
await signOut(auth);
window.location.href = 'admin-login.html';
});

btnSave.addEventListener('click', async () => {
const title = document.getElementById('title').value.trim();
const content = document.getElementById('content').value.trim();
if (!title || !content) return alert('Isi judul dan isi berita');
try {
await addDoc(collection(db, 'admin-news'), {
title,
content,
createdAt: serverTimestamp()
});
document.getElementById('title').value = '';
document.getElementById('content').value = '';
await loadNews();
alert('Berita tersimpan');
} catch (e) {
console.error(e);
alert('Gagal menyimpan: ' + e.message);
}
});
async function loadNews() {
newsList.innerHTML = 'Memuat...';
const q = query(collection(db, 'admin-news'), orderBy('createdAt','desc'));
const snap = await getDocs(q);
if (snap.empty) {
newsList.innerHTML = '<p>Belum ada berita.</p>';
return;
}
const items = [];
snap.forEach(doc => {
const d = doc.data();
const t = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : '';
items.push(`<div style="padding:10px;border:1px solid #eee;margin-bottom:8px;border-radius:6px">
<strong>${escapeHtml(d.title)}</strong>
<div style="font-size:13px;color:#666;margin:6px 0">${t}</div>
<div>${escapeHtml(d.content)}</div>
</div>`);
});
newsList.innerHTML = items.join('');
}

function escapeHtml(str='') {
return String(str)
.replaceAll('&','&amp;')
.replaceAll('<','&lt;')
.replaceAll('>','&gt;')
.replaceAll('"','&quot;')
.replaceAll("'","&#039;");
}