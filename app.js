const KOMIK = [
{id:"solo-necromancer",title:"Solo Necromancer: Rise From Shadow",type:"Manhwa",status:"Ongoing",author:"Jinwoo Park",artist:"Jinwoo Park",genres:["Action","Fantasy","System"],rating:4.9,views:2450000,hue:265,updated:"12 mnt lalu",isNew:true,synopsis:"Seorang hunter rank-E yang diremehkan membangkitkan class tersembunyi Necromancer. Dari bayangan kematian, ia membangun pasukan undead dan menantang dungeon peringkat S.",chapters:42},
{id:"pedang-langit",title:"Pedang Langit Kesembilan",type:"Manhua",status:"Ongoing",author:"Li Wei",artist:"Li Wei",genres:["Action","Cultivation","Martial Arts"],rating:4.8,views:1890000,hue:200,updated:"35 mnt lalu",isNew:true,synopsis:"Ye Chen, murid buangan Sekte Awan, menemukan pedang kuno berisi jiwa kaisar pedang. Sembilan lapis langit menantinya.",chapters:128},
{id:"gadis-kasir",title:"Gadis Kasir Minimarket Buka Dungeon",type:"Komik Lokal",status:"Ongoing",author:"Rara Kumala",artist:"Rara Kumala",genres:["Comedy","Fantasy","Slice of Life"],rating:4.7,views:640000,hue:20,updated:"1 jam lalu",isNew:true,synopsis:"Sinta, kasir minimarket di Bandung, menemukan portal dungeon di gudang stok mi instan. Sambil jaga shift malam, ia jualan potion ke hunter.",chapters:36},
{id:"moonlight-sword",title:"Moonlight Sword Over Seoul",type:"Manhwa",status:"Completed",author:"Han Soo-ah",artist:"Han Soo-ah",genres:["Action","Drama","Supernatural"],rating:4.8,views:1750000,hue:230,updated:"2 jam lalu",synopsis:"Dua bersaudara pemburu iblis berebut pedang cahaya bulan terakhir saat gerhana abadi tiba.",chapters:89},
{id:"kaisar-abadi",title:"Kaisar Abadi: Reinkarnasi 3000 Tahun",type:"Manhua",status:"Ongoing",author:"Chen Hao",artist:"Chen Hao",genres:["Cultivation","Action","Reincarnation"],rating:4.6,views:1320000,hue:0,updated:"3 jam lalu",synopsis:"Kaisar abadi yang dikhianati muridnya bereinkarnasi menjadi pelayan rendahan dengan ingatan 3000 tahun kultivasi.",chapters:210},
{id:"tokyo-drifters",title:"Tokyo Drifters: Roh Jalanan",type:"Manga",status:"Ongoing",author:"Kenji Sato",artist:"Kenji Sato",genres:["Action","School","Supernatural"],rating:4.5,views:890000,hue:150,updated:"5 jam lalu",synopsis:"Klub balap liar SMA menemukan tiap tikungan touge menyimpan roh penasaran.",chapters:64},
{id:"warteg-akhir",title:"Warteg Akhir Zaman",type:"Komik Lokal",status:"Ongoing",author:"Budi Santoso",artist:"Budi Santoso",genres:["Comedy","Cooking","Action"],rating:4.9,views:720000,hue:45,updated:"6 jam lalu",isNew:true,synopsis:"Saat wabah misterius menyerbu Jakarta, hanya satu warteg yang tetap buka 24 jam. Lodeh Bu Haji ternyata menyimpan rahasia.",chapters:28},
{id:"villainess",title:"Aku Jadi Villainess Tapi Sayang Anak",type:"Manhwa",status:"Ongoing",author:"Choi Yuna",artist:"Choi Yuna",genres:["Romance","Fantasy","Drama"],rating:4.7,views:1540000,hue:320,updated:"8 jam lalu",synopsis:"Bereinkarnasi sebagai villainess, Eileen kabur dan membuka panti asuhan. Anak-anak yang ia rawat ternyata pangeran dan naga.",chapters:57},
{id:"dapur-naga",title:"Dapur Naga Langit",type:"Manhua",status:"Completed",author:"Wang Fang",artist:"Wang Fang",genres:["Cooking","Fantasy","Comedy"],rating:4.6,views:980000,hue:90,updated:"10 jam lalu",synopsis:"Koki istana yang dipecat membuka warung di desa naga. Masakan pedasnya membangkitkan sihir kuno.",chapters:76},
{id:"samurai-sawah",title:"Samurai Sawah Terakhir",type:"Manga",status:"Completed",author:"Akira Mori",artist:"Akira Mori",genres:["Action","Drama","Historical"],rating:4.8,views:1120000,hue:180,updated:"12 jam lalu",synopsis:"Ronin tua bersumpah melindungi desa petani dari pajak perang.",chapters:45},
{id:"ojek-hantu",title:"Ojek Hantu Orderan Tengah Malam",type:"Komik Lokal",status:"Ongoing",author:"Dimas Prasetyo",artist:"Dimas Prasetyo",genres:["Horror","Comedy","Mystery"],rating:4.5,views:530000,hue:270,updated:"14 jam lalu",synopsis:"Driver ojol di Surabaya selalu dapat order dari penumpang tak kasat mata.",chapters:41},
{id:"steel-heart",title:"Steel Heart Academy",type:"Manhwa",status:"Ongoing",author:"Kim Jae-hyuk",artist:"Kim Jae-hyuk",genres:["Action","School","Sci-Fi"],rating:4.4,views:760000,hue:210,updated:"16 jam lalu",synopsis:"Akademi militer exosuit menerima murid tanpa bakat — kecuali jantung mekanik misterius.",chapters:52},
{id:"dewa-kecil",title:"Dewa Kecil Penjaga Kos",type:"Komik Lokal",status:"Completed",author:"Ayu Lestari",artist:"Ayu Lestari",genres:["Comedy","Slice of Life","Supernatural"],rating:4.6,views:410000,hue:160,updated:"1 hari lalu",synopsis:"Dewa rezeki bangkrut jadi penjaga kos putri di Jogja.",chapters:30},
{id:"abyss-returner",title:"Abyss Returner: 99 Kali Mati",type:"Manhwa",status:"Ongoing",author:"Seo Min-jae",artist:"Seo Min-jae",genres:["Action","Fantasy","Drama"],rating:4.9,views:2210000,hue:350,updated:"1 hari lalu",isNew:true,synopsis:"Setelah mati 99 kali di abyss, Kang Haneul kembali ke hari pertama dengan semua hafalan pola bos.",chapters:68},
{id:"pahlawan-kampung",title:"Pahlawan Kampung: Gatot Modern",type:"Komik Lokal",status:"Ongoing",author:"Eko Nugroho",artist:"Eko Nugroho",genres:["Action","Superhero","Comedy"],rating:4.7,views:590000,hue:30,updated:"1 hari lalu",synopsis:"Pemuda desa keturunan Gatotkaca menyembunyikan kekuatannya sambil jadi linmas.",chapters:33},
{id:"sakura-system",title:"Sakura System: Bungaku OP",type:"Manga",status:"Ongoing",author:"Hana Yuki",artist:"Hana Yuki",genres:["Fantasy","Romance","School"],rating:4.3,views:480000,hue:300,updated:"2 hari lalu",synopsis:"Siswi pemalu dapat sistem yang mengubah puisi haiku jadi sihir bunga sakura.",chapters:49},
{id:"dokter-jianghu",title:"Dokter Sakti Jianghu",type:"Manhua",status:"Ongoing",author:"Zhao Lin",artist:"Zhao Lin",genres:["Martial Arts","Comedy","Drama"],rating:4.5,views:870000,hue:120,updated:"2 hari lalu",synopsis:"Tabib jenius turun gunung dengan jarum akupunktur dan resep aneh.",chapters:94},
{id:"dungeon-arisan",title:"Dungeon Arisan Ibu-Ibu",type:"Komik Lokal",status:"Ongoing",author:"Maya Putri",artist:"Maya Putri",genres:["Comedy","Fantasy","Action"],rating:4.8,views:660000,hue:55,updated:"2 hari lalu",isNew:true,synopsis:"Arisan ibu-ibu komplek salah masuk portal dan mengira dungeon tempat piknik.",chapters:24},
{id:"naga-tidur",title:"Naga Tidur di Bawah Kasurku",type:"Manhua",status:"Ongoing",author:"Liu Peng",artist:"Liu Peng",genres:["Fantasy","Comedy","Action"],rating:4.4,views:390000,hue:100,updated:"2 hari lalu",synopsis:"Bocah kos menemukan naga seukuran kucing tidur di bawah kasur. Kumisnya bisa mengabulkan satu permintaan sehari.",chapters:19},
{id:"kantor-gaib",title:"Kantor Gaib Lantai 13",type:"Komik Lokal",status:"Ongoing",author:"Rizky Ananda",artist:"Rizky Ananda",genres:["Horror","Mystery","Comedy"],rating:4.6,views:450000,hue:250,updated:"3 hari lalu",synopsis:"Karyawan baru sadar kantornya tak punya lantai 13 — kecuali tiap Jumat malam.",chapters:22},
];
const GENRES = ["Action","Fantasy","Romance","Comedy","Martial Arts","Cultivation","System","Horror","School","Cooking","Drama","Sci-Fi","Mystery","Slice of Life","Superhero","Supernatural","Historical","Reincarnation"];
const TYPES = ["Semua","Manhwa","Manhua","Manga","Komik Lokal"];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const store = {
  get lib(){ try{return JSON.parse(localStorage.getItem("kv_lib")||"[]")}catch{return[]} },
  set lib(v){ localStorage.setItem("kv_lib",JSON.stringify(v)) },
  get hist(){ try{return JSON.parse(localStorage.getItem("kv_hist")||"{}")}catch{return{}} },
  set hist(v){ localStorage.setItem("kv_hist",JSON.stringify(v)) },
  get read(){ try{return JSON.parse(localStorage.getItem("kv_read")||"{}")}catch{return{}} },
  set read(v){ localStorage.setItem("kv_read",JSON.stringify(v)) },
};
let homeShown = 10;
let listState = { type:"Semua", status:"Semua", genre:"Semua", sort:"updated", az:"", q:"" };
const fmtViews = v => v>=1e6?(v/1e6).toFixed(1)+"jt":v>=1e3?Math.round(v/1e3)+"rb":v;
const coverStyle = h => `background:linear-gradient(135deg,hsl(${h} 60% 42%),hsl(${(h+55)%360} 65% 24%))`;
const initials = t => t.split(" ").filter(w=>/[A-Za-z]/.test(w[0]||"")).slice(0,2).map(w=>w[0]).join("").toUpperCase() || "KV";
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.remove("hidden"); clearTimeout(t._x); t._x=setTimeout(()=>t.classList.add("hidden"),2000); }
function updateLibCount(){ $("#libCount").textContent = store.lib.length; }
function chapterList(k){ const a=[]; for(let i=k.chapters;i>=1;i--) a.push({n:i,date:i===k.chapters?k.updated:`${(k.chapters-i+1)*2} hari lalu`}); return a; }

// kartu gaya doujin: cover + badge tipe + NEW + rating + judul + chapter + waktu
function cardHTML(k){
  return `<div class="card" data-id="${k.id}">
    <div class="cover" style="${coverStyle(k.hue)}"><span class="big">${initials(k.title)}</span><div class="shade"></div>
      <span class="tbadge">${k.type}</span>${k.isNew?`<span class="nbadge">NEW</span>`:""}
      <span class="crate">★ ${k.rating}</span></div>
    <div class="card-body"><h4>${k.title}</h4>
      <div class="ch">Chapter ${k.chapters}</div><div class="tm">${k.updated}</div></div></div>`;
}
function bindCards(scope){ $$(scope+" .card").forEach(el=>el.onclick=()=>location.hash="#/komik/"+el.dataset.id); }

// ---------- HOME ----------
function renderHome(){
  const all=[...KOMIK];
  $("#homeGrid").innerHTML = all.slice(0,homeShown).map(cardHTML).join("");
  bindCards("#homeGrid");
  $("#loadMore").style.display = homeShown>=all.length?"none":"";
  const cats=["Manhwa","Manhua","Manga","Komik Lokal"];
  $("#catSections").innerHTML = cats.map(c=>{
    const items=KOMIK.filter(k=>k.type===c).slice(0,5);
    if(!items.length) return "";
    return `<div class="sechd" style="margin-top:22px"><span class="bar"></span><h2>${c} Terbaru</h2><a class="more" href="#/list/${encodeURIComponent(c)}">Lihat Semua ›</a></div>
    <div class="grid">${items.map(cardHTML).join("")}</div>`;
  }).join("");
  bindCards("#catSections");
  $("#topList").innerHTML=[...KOMIK].sort((a,b)=>b.views-a.views).slice(0,10).map((k,i)=>`<li><a href="#/komik/${k.id}"><strong>${k.title}</strong></a><br><span class="muted small">★ ${k.rating} • ${fmtViews(k.views)}</span></li>`).join("");
  $("#genreCloud").innerHTML=GENRES.map(g=>`<a href="#/list" data-g="${g}">${g}</a>`).join("");
  $$("#genreCloud a").forEach(a=>a.onclick=()=>{ listState.genre=a.dataset.g; });
}

// ---------- LIST ----------
function buildFilters(){
  $("#fType").innerHTML = TYPES.map(t=>`<button class="fchip ${listState.type===t?"active":""}" data-t="${t}">${t}</button>`).join("");
  $("#fStatus").innerHTML = ["Semua","Ongoing","Completed"].map(s=>`<button class="fchip ${listState.status===s?"active":""}" data-s="${s}">${s}</button>`).join("");
  $("#fGenre").innerHTML = [`<button class="fchip ${listState.genre==="Semua"?"active":""}" data-g="Semua">Semua Genre</button>`,...GENRES.map(g=>`<button class="fchip ${listState.genre===g?"active":""}" data-g="${g}">${g}</button>`)].join("");
  $("#azRow").innerHTML = [`<button class="fchip ${!listState.az?"active":""}" data-az="">#</button>`,..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l=>`<button class="fchip ${listState.az===l?"active":""}" data-az="${l}">${l}</button>`)].join("");
  $$("#fType .fchip").forEach(b=>b.onclick=()=>{listState.type=b.dataset.t;renderList();});
  $$("#fStatus .fchip").forEach(b=>b.onclick=()=>{listState.status=b.dataset.s;renderList();});
  $$("#fGenre .fchip").forEach(b=>b.onclick=()=>{listState.genre=b.dataset.g;renderList();});
  $$("#azRow .fchip").forEach(b=>b.onclick=()=>{listState.az=b.dataset.az;renderList();});
}
function filteredList(){
  let r=[...KOMIK];
  if(listState.type!=="Semua") r=r.filter(k=>k.type===listState.type);
  if(listState.status!=="Semua") r=r.filter(k=>k.status===listState.status);
  if(listState.genre!=="Semua") r=r.filter(k=>k.genres.includes(listState.genre));
  if(listState.az) r=r.filter(k=>k.title.toUpperCase().startsWith(listState.az));
  if(listState.q){ const q=listState.q.toLowerCase(); r=r.filter(k=>(k.title+k.author+k.genres.join(" ")).toLowerCase().includes(q)); }
  if(listState.sort==="rating") r.sort((a,b)=>b.rating-a.rating);
  else if(listState.sort==="views") r.sort((a,b)=>b.views-a.views);
  else if(listState.sort==="title") r.sort((a,b)=>a.title.localeCompare(b.title));
  return r;
}
function renderList(){
  buildFilters();
  $("#sortSelect").value=listState.sort;
  const r=filteredList();
  $("#listTitle").textContent = listState.type!=="Semua" ? `List ${listState.type}` : "List Komik";
  $("#resultInfo").textContent = `${r.length} judul`;
  $("#listGrid").innerHTML = r.map(cardHTML).join("") || `<div class="empty">Tidak ada judul yang cocok dengan filter.</div>`;
  bindCards("#listGrid");
}

// ---------- DETAIL ----------
function renderDetail(id){
  const k=KOMIK.find(x=>x.id===id);
  if(!k){ location.hash="#/"; return; }
  const chs=chapterList(k); const rd=store.read[k.id]||[]; const h=store.hist[k.id];
  const inLib=store.lib.includes(k.id);
  $("#view-detail").innerHTML=`
    <div class="crumb"><a href="#/">Home</a> › <a href="#/list/${encodeURIComponent(k.type)}">${k.type}</a> › ${k.title}</div>
    <div class="detail">
      <div class="dcover" style="${coverStyle(k.hue)}">${initials(k.title)}</div>
      <div>
        <h1>${k.title}</h1>
        <table class="infotbl">
          <tr><td>Status</td><td>${k.status}</td></tr>
          <tr><td>Tipe</td><td>${k.type}</td></tr>
          <tr><td>Author</td><td>${k.author}</td></tr>
          <tr><td>Artist</td><td>${k.artist}</td></tr>
          <tr><td>Rating</td><td>★ ${k.rating} • ${fmtViews(k.views)} views</td></tr>
          <tr><td>Update</td><td>${k.updated}</td></tr>
        </table>
        <div class="gtags">${k.genres.map(g=>`<a href="#/list" data-g="${g}">${g}</a>`).join("")}</div>
        <div class="actions">
          <a class="btn" href="#/baca/${k.id}/${h||1}">${h?`▶ Lanjut Ch ${h}`:"▶ Mulai Baca Ch 1"}</a>
          <a class="btn ghost" href="#/baca/${k.id}/${k.chapters}">Ch ${k.chapters} (Terbaru)</a>
          <button class="btn ghost" id="libBtn">${inLib?"★ Bookmarked":"🔖 Bookmark"}</button>
        </div>
        <h3>Sinopsis</h3><p class="syn">${k.synopsis}</p>
      </div>
    </div>
    <div class="sechd" style="margin-top:18px"><span class="bar"></span><h2>Daftar Chapter (${k.chapters})</h2><span class="more">${rd.length} terbaca</span></div>
    <div class="chlist">${chs.map(c=>`<div class="chrow ${rd.includes(c.n)?"read":""}" data-ch="${c.n}"><span><strong>Chapter ${c.n}</strong> ${c.n===k.chapters?'<span class="nbadge" style="position:static">NEW</span>':""}<br><span class="muted small">${c.date}${rd.includes(c.n)?" • ✓":""}</span></span><span>›</span></div>`).join("")}</div>`;
  $("#libBtn").onclick=()=>{
    let lib=store.lib;
    lib = lib.includes(k.id)?lib.filter(x=>x!==k.id):[...lib,k.id];
    store.lib=lib; updateLibCount(); toast(lib.includes(k.id)?"Ditambah ke bookmark ✓":"Dihapus dari bookmark"); renderDetail(k.id);
  };
  $$("#view-detail .chrow").forEach(r=>r.onclick=()=>location.hash=`#/baca/${k.id}/${r.dataset.ch}`);
  $$("#view-detail .gtags a").forEach(a=>a.onclick=()=>{ listState.genre=a.dataset.g; listState.type="Semua"; });
}

// ---------- READER ----------
const DLG=[["Kau yang memanggilku… di tengah malam ini?","Jangan mendekat! Aura-nya beda!"],["Tiga ratus tahun… akhirnya segel itu retak.","Kalau begitu, semuanya dimulai malam ini."],["Shift malam… kenapa portal-nya di gudang mi instan?!","Tenang. Selama stok aman, dungeon aman."],["Kekuatan ini… bukan milik manusia biasa.","Lalu kenapa jantungku berdebar seperti genderang perang?"]];
function renderReader(id,ch){
  const k=KOMIK.find(x=>x.id===id);
  if(!k){ location.hash="#/"; return; }
  ch=Math.max(1,Math.min(k.chapters,parseInt(ch)||1));
  const hist=store.hist; hist[k.id]=ch; store.hist=hist;
  const rd=store.read; const s=new Set(rd[k.id]||[]); s.add(ch); rd[k.id]=[...s]; store.read=rd;
  const d=DLG[ch%DLG.length];
  let pages="";
  for(let p=1;p<=5;p++){
    const h1=(k.hue+p*24)%360,h2=(k.hue+p*24+60)%360;
    const line = p===1?d[0] : p===5?d[1] : `Chapter ${ch} — panel ${p} • ${k.genres[0]}`;
    pages+=`<div class="page"><div class="ph"><span>${k.title} • Ch ${ch}</span><span>Halaman ${p}/5</span></div>
      <div class="art"><div class="pbox wide" style="background:linear-gradient(135deg,hsl(${h1} 60% 38%),hsl(${h2} 65% 24%))"><div class="dlg">“${line}”</div></div>
      <div class="pbox" style="background:linear-gradient(135deg,hsl(${h2} 58% 36%),hsl(${h1} 60% 22%))"><div class="dlg">Aksi ${p*2-1}</div></div>
      <div class="pbox" style="background:linear-gradient(135deg,hsl(${(h1+120)%360} 58% 34%),hsl(${(h2+120)%360} 62% 22%))"><div class="dlg">Aksi ${p*2}</div></div></div></div>`;
  }
  $("#view-reader").innerHTML=`
    <div class="crumb"><a href="#/">Home</a> › <a href="#/komik/${k.id}">${k.title}</a> › Chapter ${ch}</div>
    <div class="rbar"><strong>${k.title} — Ch ${ch}</strong><span class="spacer" style="flex:1"></span>
      <select id="chJump" class="select">${chapterList(k).map(c=>`<option value="${c.n}" ${c.n==ch?"selected":""}>Chapter ${c.n}</option>`).join("")}</select>
      <button class="btn ghost" id="prevCh" ${ch<=1?"disabled":""}>‹ Prev</button>
      <button class="btn ghost" id="nextCh" ${ch>=k.chapters?"disabled":""}>Next ›</button></div>
    <div class="pages">${pages}</div>
    <div class="rnav">
      <a class="btn ghost" href="#/baca/${k.id}/${ch-1}" ${ch<=1?'style="pointer-events:none;opacity:.4"':""}>‹ Ch ${ch-1}</a>
      <a class="btn ghost" href="#/komik/${k.id}">☰ Semua Chapter</a>
      <a class="btn" href="#/baca/${k.id}/${ch+1}" ${ch>=k.chapters?'style="pointer-events:none;opacity:.4"':""}>Ch ${ch+1} ›</a></div>`;
  $("#chJump").onchange=e=>location.hash=`#/baca/${k.id}/${e.target.value}`;
  $("#prevCh").onclick=()=>{ if(ch>1) location.hash=`#/baca/${k.id}/${ch-1}`; };
  $("#nextCh").onclick=()=>{ if(ch<k.chapters) location.hash=`#/baca/${k.id}/${ch+1}`; else toast("Ini chapter terbaru 🎉"); };
  window.scrollTo({top:0});
}

// ---------- BOOKMARK & HISTORY ----------
function renderBookmark(){
  const lib=store.lib.map(id=>KOMIK.find(k=>k.id===id)).filter(Boolean);
  $("#view-bookmark").innerHTML=`<div class="sechd"><span class="bar"></span><h2>Bookmark Saya (${lib.length})</h2><a class="more" href="#/list">+ Tambah ›</a></div>
  ${lib.length?`<div class="grid">${lib.map(cardHTML).join("")}</div>`:`<div class="empty">📭 Bookmark kosong.<br>Buka judul apapun lalu klik <strong>🔖 Bookmark</strong>.<br><br><a class="btn" href="#/list">Cari Komik</a></div>`}`;
  bindCards("#view-bookmark");
}
function renderHistory(){
  const ids=Object.keys(store.hist);
  $("#view-history").innerHTML=`<div class="sechd"><span class="bar"></span><h2>History Bacaan</h2><span class="more"><button class="fchip" id="clearHist">Hapus Semua</button></span></div>
  ${ids.length?`<div class="chlist">${ids.map(id=>{const k=KOMIK.find(x=>x.id===id);if(!k)return"";const c=store.hist[id];return`<div class="chrow" data-id="${id}" data-ch="${c}"><span><strong>${k.title}</strong><br><span class="muted small">Terakhir: Chapter ${c} • ${k.updated}</span></span><span>Lanjut ›</span></div>`}).join("")}</div>`:`<div class="empty">Belum ada riwayat bacaan.</div>`}`;
  $$("#view-history .chrow").forEach(r=>r.onclick=()=>location.hash=`#/baca/${r.dataset.id}/${r.dataset.ch}`);
  const cl=$("#clearHist"); if(cl) cl.onclick=()=>{ store.hist={}; toast("History dihapus"); renderHistory(); };
}

// ---------- ROUTER ----------
function show(id){ ["view-home","view-list","view-detail","view-reader","view-bookmark","view-history"].forEach(v=>$("#"+v).classList.add("hidden")); $("#"+id).classList.remove("hidden"); }
function route(){
  const h=location.hash||"#/";
  $$(".mainnav a").forEach(a=>a.classList.remove("active"));
  if(h.startsWith("#/komik/")){ show("view-detail"); renderDetail(decodeURIComponent(h.split("/")[2])); }
  else if(h.startsWith("#/baca/")){ const p=h.split("/"); show("view-reader"); renderReader(decodeURIComponent(p[2]),p[3]); }
  else if(h.startsWith("#/list")){ const t=decodeURIComponent(h.split("/")[2]||""); if(t&&TYPES.includes(t)) listState.type=t; show("view-list"); renderList(); const nav=$(`.mainnav a[href="${h}"]`); if(nav)nav.classList.add("active"); }
  else if(h.startsWith("#/bookmark")){ show("view-bookmark"); renderBookmark(); }
  else if(h.startsWith("#/history")){ show("view-history"); renderHistory(); }
  else { show("view-home"); renderHome(); const nav=$('.mainnav a[data-nav="home"]'); if(nav)nav.classList.add("active"); }
  updateLibCount(); window.scrollTo({top:0});
}

// events
$("#loadMore").onclick=()=>{ homeShown+=10; renderHome(); };
$("#sortSelect").onchange=e=>{ listState.sort=e.target.value; renderList(); };
let deb; $("#searchInput").addEventListener("input",e=>{
  clearTimeout(deb); deb=setTimeout(()=>{
    const q=e.target.value.trim(); const box=$("#searchSuggest");
    if(q){
      const s=KOMIK.filter(k=>(k.title+k.author+k.genres.join(" ")).toLowerCase().includes(q.toLowerCase())).slice(0,6);
      box.innerHTML=s.length?s.map(k=>`<a href="#/komik/${k.id}"><div style="${coverStyle(k.hue)};width:36px;height:48px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">${initials(k.title)}</div><div><strong>${k.title}</strong><br><span class="muted small">${k.type} • Ch ${k.chapters} • ★ ${k.rating}</span></div></a>`).join(""):`<div style="padding:12px" class="muted small">Tidak ditemukan.</div>`;
      box.classList.remove("hidden");
    } else box.classList.add("hidden");
  },180);
});
$("#searchInput").addEventListener("keydown",e=>{ if(e.key==="Enter"){ listState.q=e.target.value.trim(); listState.type="Semua"; location.hash="#/list"; setTimeout(renderList,30); } });
$("#searchBtn").onclick=()=>{ listState.q=$("#searchInput").value.trim(); listState.type="Semua"; location.hash="#/list"; setTimeout(renderList,30); };
document.addEventListener("click",e=>{ if(!e.target.closest(".searchbox")) $("#searchSuggest").classList.add("hidden"); });
window.addEventListener("hashchange",route);
route();
