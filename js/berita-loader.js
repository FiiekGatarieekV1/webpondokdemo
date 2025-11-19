// js/berita-loader.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function loadActiveNews(containerId='news-container'){
  const c = document.getElementById(containerId); if(!c) return;
  c.innerHTML = '<p class="small-muted">Memuat...</p>';
  try {
    const now = Timestamp.fromDate(new Date());
    const q = query(collection(db,'news'), where('periodStart','<=',now), where('periodEnd','>=',now), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    if(snap.empty){ c.innerHTML = '<p class="small-muted">Tidak ada berita aktif.</p>'; return; }
    c.innerHTML = '';
    snap.docs.forEach(d=>{ const it = d.data(); const el = document.createElement('div'); el.className='card mb-3 p-3'; el.innerHTML = `<h5>${it.title}</h5><p>${it.content}</p>${it.brosurUrl?`<p><a href="${it.brosurUrl}" target="_blank">Download brosur</a></p>`:''}`; c.appendChild(el); });
  } catch(e){ console.error(e); c.innerHTML = `<p class="small-muted">Gagal: ${e.message}</p>`; }
}

// auto-load if element exists
if(typeof window !== 'undefined'){
  window.addEventListener('DOMContentLoaded', ()=>{ if(document.getElementById('news-container')) loadActiveNews(); });
}
