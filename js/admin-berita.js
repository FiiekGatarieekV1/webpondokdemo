// js/admin-berita.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// UI
const authArea = document.getElementById('auth-area');
const adminArea = document.getElementById('admin-area');
const loginBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const authMsg = document.getElementById('auth-msg');
const form = document.getElementById('news-form');
const status = document.getElementById('status');
const brosurInput = document.getElementById('brosur');
const galleryInput = document.getElementById('gallery');
const brosurPreview = document.getElementById('brosur-preview');
const galleryPreview = document.getElementById('gallery-preview');
const listArea = document.getElementById('list-area');
const filterCategory = document.getElementById('filter-category');
const newsContainer = document.getElementById('news-container');

let currentUser = null;

loginBtn.onclick = async () => {
  authMsg.textContent = '';
  const email = document.getElementById('email').value;
  const pw = document.getElementById('password').value;
  try { await signInWithEmailAndPassword(auth, email, pw); }
  catch(e) { authMsg.textContent = e.message; }
};
logoutBtn.onclick = async ()=> await signOut(auth);

async function isAdmin(user){
  if(!user) return false;
  try {
    const idr = await getIdTokenResult(user, true);
    return idr.claims && idr.claims.admin === true;
  } catch(e){ console.error(e); return false; }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user){
    const ok = await isAdmin(user);
    if(!ok){ authMsg.textContent = 'Akun bukan admin. Set custom claim admin:true.'; adminArea.classList.add('d-none'); authArea.classList.remove('d-none'); logoutBtn.classList.remove('d-none'); return; }
    authArea.classList.add('d-none'); adminArea.classList.remove('d-none'); logoutBtn.classList.remove('d-none');
    loadList(); loadActiveNewsPreview();
  } else { adminArea.classList.add('d-none'); authArea.classList.remove('d-none'); logoutBtn.classList.add('d-none'); }
});

// preview handlers
brosurInput.addEventListener('change', ()=> {
  const f = brosurInput.files[0];
  brosurPreview.innerHTML = f ? `<span class="small-muted">Siap upload: ${f.name}</span>` : '';
});
galleryInput.addEventListener('change', ()=> {
  galleryPreview.innerHTML = '';
  Array.from(galleryInput.files||[]).forEach(f=>{
    const url = URL.createObjectURL(f);
    const img = document.createElement('img'); img.src=url; img.className='thumb'; galleryPreview.appendChild(img);
  });
});

// helpers
function toISODate(d){ if(!d) return ''; if(d.toDate) d = d.toDate(); const x = new Date(d); const y = x.getFullYear(); const m = String(x.getMonth()+1).padStart(2,'0'); const day = String(x.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }

async function uploadFile(path, file){ const ref = storageRef(storage, path); await uploadBytes(ref, file); return await getDownloadURL(ref); }
async function uploadMultiple(prefix, files){ const urls=[]; for(const f of files){ const path = `${prefix}/${Date.now()}_${f.name.replace(/\s+/g,'_')}`; urls.push(await uploadFile(path,f)); } return urls; }

// submit create/update
form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  status.textContent = 'Menyimpan...';
  const id = document.getElementById('edit-id').value || null;
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const category = document.getElementById('category').value;
  const ps = document.getElementById('periodStart').value;
  const pe = document.getElementById('periodEnd').value;
  const brosurFile = brosurInput.files[0]||null;
  const galleryFiles = Array.from(galleryInput.files||[]);
  try {
    let brosurUrl=''; let galleryUrls=[];
    if(brosurFile){ brosurUrl = await uploadFile(`brosur/${category}/${Date.now()}_${brosurFile.name.replace(/\s+/g,'_')}`, brosurFile); }
    if(galleryFiles.length){ galleryUrls = await uploadMultiple(`gallery/${category}`, galleryFiles); }
    if(!id){
      await addDoc(collection(db,'news'), {
        title, content, category,
        periodStart: Timestamp.fromDate(new Date(ps)),
        periodEnd: Timestamp.fromDate(new Date(pe)),
        brosurUrl, gallery: galleryUrls, createdAt: serverTimestamp()
      });
      status.textContent = 'Berita dibuat.';
    } else {
      const refDoc = doc(db,'news',id);
      // merge with existing
      const snap = await getDocs(query(collection(db,'news'), where('__name__','==',id)));
      const existing = !snap.empty ? snap.docs[0].data() : null;
      const updates = {
        title, content, category,
        periodStart: Timestamp.fromDate(new Date(ps)),
        periodEnd: Timestamp.fromDate(new Date(pe)),
        brosurUrl: brosurUrl || (existing?existing.brosurUrl||'':''),
        gallery: (existing?existing.gallery||[]:[]).concat(galleryUrls||[])
      };
      await updateDoc(refDoc, updates);
      status.textContent = 'Berita diperbarui.';
    }
    form.reset(); document.getElementById('edit-id').value=''; brosurPreview.innerHTML=''; galleryPreview.innerHTML=''; loadList(); loadActiveNewsPreview();
  } catch(e){ console.error(e); status.textContent = 'Gagal: '+e.message; }
});

// list load
async function loadList(){
  listArea.innerHTML = '<p class="small-muted">Memuat...</p>';
  try {
    const q = query(collection(db,'news'), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderList(items);
  } catch(e){ console.error(e); listArea.innerHTML = `<p class="small-muted">Gagal: ${e.message}</p>`; }
}

function renderList(items){
  const f = filterCategory.value;
  let filtered = items; if(f) filtered = items.filter(i=>i.category===f);
  if(!filtered.length){ listArea.innerHTML = '<p class="small-muted">Belum ada berita.</p>'; return; }
  const wrap = document.createElement('div'); wrap.className='list-group';
  filtered.forEach(item=>{
    const el = document.createElement('div'); el.className='list-group-item';
    const ps = item.periodStart ? toISODate(item.periodStart) : '';
    const pe = item.periodEnd ? toISODate(item.periodEnd) : '';
    el.innerHTML = `<div class="d-flex w-100 justify-content-between"><h6 class="mb-1">${item.title}</h6><small class="small-muted">${item.category} • ${ps} → ${pe}</small></div><p class="mb-1">${item.content?item.content.substring(0,120):''}</p><div class="d-flex align-items-center gap-2">${item.brosurUrl?`<a href="${item.brosurUrl}" target="_blank" class="btn btn-sm btn-outline-primary">Brosur</a>`:''}${Array.isArray(item.gallery)&&item.gallery.length?item.gallery.map(u=>`<img src="${u}" class="thumb">`).join(''):''}<div class="ms-auto"><button class="btn btn-sm btn-warning btn-edit" data-id="${item.id}">Edit</button> <button class="btn btn-sm btn-danger btn-del" data-id="${item.id}">Hapus</button></div></div>`;
    wrap.appendChild(el);
  });
  listArea.innerHTML=''; listArea.appendChild(wrap);
  listArea.querySelectorAll('.btn-edit').forEach(b=>b.addEventListener('click',()=>editItem(b.dataset.id)));
  listArea.querySelectorAll('.btn-del').forEach(b=>b.addEventListener('click',()=>deleteItem(b.dataset.id)));
}

async function editItem(id){
  const snap = await getDocs(query(collection(db,'news'), where('__name__','==',id)));
  if(snap.empty) return alert('Dokumen tidak ditemukan');
  const d = snap.docs[0].data();
  document.getElementById('edit-id').value = id;
  document.getElementById('title').value = d.title||'';
  document.getElementById('content').value = d.content||'';
  document.getElementById('category').value = d.category||'umum';
  document.getElementById('periodStart').value = d.periodStart?toISODate(d.periodStart.toDate()):'';
  document.getElementById('periodEnd').value = d.periodEnd?toISODate(d.periodEnd.toDate()):'';
  brosurPreview.innerHTML = d.brosurUrl?`<a href="${d.brosurUrl}" target="_blank">Brosur (lihat)</a>`:'';
  galleryPreview.innerHTML=''; if(Array.isArray(d.gallery)) d.gallery.forEach(u=>{ const img=document.createElement('img'); img.src=u; img.className='thumb'; galleryPreview.appendChild(img); });
  window.scrollTo({top:0,behavior:'smooth'});
}

async function deleteItem(id){
  if(!confirm('Hapus berita?')) return;
  try {
    const snap = await getDocs(query(collection(db,'news'), where('__name__','==',id)));
    if(!snap.empty){
      const d = snap.docs[0].data();
      // try delete related storage objects (best-effort)
      if(d.brosurUrl) {
        try { const pathPart = d.brosurUrl.split('/o/')[1].split('?')[0]; await deleteObject(storageRef(storage, decodeURIComponent(pathPart))); } catch(e){/* ignore */ }
      }
      if(Array.isArray(d.gallery)) {
        for(const u of d.gallery){ try{ const pathPart = u.split('/o/')[1].split('?')[0]; await deleteObject(storageRef(storage, decodeURIComponent(pathPart))); } catch(e){ } }
      }
    }
    await deleteDoc(doc(db,'news',id));
    loadList(); loadActiveNewsPreview();
  } catch(e){ console.error(e); alert('Gagal hapus: '+e.message); }
}

filterCategory.addEventListener('change', loadList);
document.getElementById('btn-cancel-edit').addEventListener('click', ()=>{ form.reset(); document.getElementById('edit-id').value=''; brosurPreview.innerHTML=''; galleryPreview.innerHTML=''; });

async function loadActiveNewsPreview(){
  newsContainer.innerHTML = '<p class="small-muted">Memuat...</p>';
  try {
    const now = Timestamp.fromDate(new Date());
    const q = query(collection(db,'news'), where('periodStart','<=',now), where('periodEnd','>=',now), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    if(snap.empty){ newsContainer.innerHTML = '<p class="small-muted">Tidak ada berita aktif.</p>'; return; }
    newsContainer.innerHTML=''; snap.docs.forEach(d=>{ const item=d.data(); const el=document.createElement('div'); el.className='card mb-3 p-3'; el.innerHTML=`<h6>${item.title}</h6><p>${item.content}</p>${item.brosurUrl?`<p><a href="${item.brosurUrl}" target="_blank">Download brosur</a></p>`:''}${Array.isArray(item.gallery)&&item.gallery.length?`<div>${item.gallery.map(u=>`<img src="${u}" class="thumb">`).join('')}</div>`:''}`; newsContainer.appendChild(el); });
  } catch(e){ console.error(e); newsContainer.innerHTML = `<p class="small-muted">Gagal: ${e.message}</p>`; }
}
